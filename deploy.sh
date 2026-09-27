#!/usr/bin/env bash
# Complete Azure deployment from an authenticated Azure CLI session.
set -euo pipefail

root=$(cd "$(dirname "$0")" && pwd)
cd "$root"

# Reuse the repository-local jq fallback when this workspace already has one.
if [[ -x "$root/.deployment/bin/jq" ]]; then
  export PATH="$root/.deployment/bin:$PATH"
fi

log() { printf '\n==> %s\n' "$1"; }
require() { command -v "$1" >/dev/null || { echo "$1 is required." >&2; exit 1; }; }

for command in az terraform jq curl ssh-keygen; do require "$command"; done
az account show >/dev/null 2>&1 || {
  echo "Azure CLI is not authenticated or has no selected subscription." >&2
  exit 1
}

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  . "$HOME/.nvm/nvm.sh"
  nvm use default >/dev/null
fi
require node
require npm
node_major=$(node -p 'Number(process.versions.node.split(".")[0])')
if (( node_major < 22 )); then
  echo "Node.js 22 or later is required; found $(node --version)." >&2
  exit 1
fi

log "Preparing local deployment inputs"
./scripts/setup-deployment.sh
# shellcheck disable=SC1091
source .deployment/session.sh

log "Checking Azure providers and quota"
./scripts/azure-preflight.sh --register

log "Creating or reconnecting the remote Terraform backend"
./scripts/bootstrap-backend.sh
terraform -chdir=terraform init -reconfigure -input=false -backend-config=../backend.hcl

log "Installing Function runtime dependencies"
npm ci --omit=dev --prefix function-app

if [[ "${SKIP_TESTS:-false}" != "true" ]]; then
  log "Running application tests"
  npm test
fi

plan_file="$root/.deployment/deploy.tfplan"
log "Planning Azure infrastructure"
terraform -chdir=terraform plan -input=false \
  -var-file=../.deployment/inputs.json \
  -out="$plan_file"

destroy_count=$(terraform -chdir=terraform show -json "$plan_file" \
  | jq '[.resource_changes[]? | select(.change.actions | index("delete"))] | length')
if [[ "$destroy_count" -gt 0 && "${ALLOW_DESTROY:-false}" != "true" ]]; then
  terraform -chdir=terraform show -no-color "$plan_file"
  echo "Plan contains $destroy_count destructive resource change(s). Review it, then rerun with ALLOW_DESTROY=true if intentional." >&2
  exit 1
fi

if [[ "${PLAN_ONLY:-false}" == "true" ]]; then
  echo "Plan-only run completed. Saved plan: $plan_file"
  exit 0
fi

log "Applying Azure infrastructure"
terraform -chdir=terraform apply -input=false "$plan_file"

log "Publishing the Function and configuring the reporting path"
./scripts/configure-analytics.sh

resource_group=$(terraform -chdir=terraform output -raw resource_group_name)
vm_name=$(terraform -chdir=terraform output -raw vm_name)
log "Validating the complete Azure deployment"
./scripts/run-remote.sh "$resource_group" "$vm_name" \
  'cloud-init status --wait; cd /opt/ayn-al-sijill; docker compose -f compose.azure.yaml ps -a; ./scripts/validate.sh'

if [[ "${SKIP_BACKFILL:-false}" != "true" ]]; then
  log "Loading the idempotent historical dashboard baseline"
  export LOG_INGEST_URL="$(terraform -chdir=terraform output -raw kibana_url)/ingest"
  export LOG_INGEST_TOKEN="$(terraform -chdir=terraform output -raw log_ingest_token)"
  npm run backfill
  unset LOG_INGEST_URL LOG_INGEST_TOKEN
fi

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  log "Configuring Telegram alerts"
  ./scripts/configure-telegram.sh
else
  echo "Telegram skipped. Export TELEGRAM_BOT_TOKEN before deployment to configure it automatically."
fi

log "Deployment complete. Demo outputs, including generated credentials"
terraform -chdir=terraform output
