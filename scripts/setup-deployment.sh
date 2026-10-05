#!/usr/bin/env bash
# Prepare account-specific Terraform inputs without committing them to Git.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
key_path=${AYN_SSH_KEY_PATH:-"$HOME/.ssh/ayn-al-sijill"}

for command in az jq ssh-keygen terraform; do
  command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done
az account show >/dev/null 2>&1 || { echo "Azure CLI is not authenticated or has no selected subscription." >&2; exit 1; }

mkdir -p "$root/.deployment/terraform-data" "$(dirname "$key_path")"
if [[ ! -f "$key_path" ]]; then
  if [[ -e "$key_path.pub" ]]; then
    echo "Public key exists without its private key: $key_path.pub" >&2
    exit 1
  fi
  ssh-keygen -q -t ed25519 -N '' -C ayn-al-sijill -f "$key_path"
fi
if [[ ! -f "$key_path.pub" ]]; then
  ssh-keygen -y -f "$key_path" >"$key_path.pub"
fi
chmod 600 "$key_path"

selection=$("$root/scripts/select-vm.sh")
eval "$selection"
subscription_id=$(az account show --query id -o tsv)
ssh_public_key=$(<"$key_path.pub")

jq -n \
  --arg location "$TF_VAR_location" \
  --arg vm_size "$TF_VAR_vm_size" \
  --arg ssh_public_key "$ssh_public_key" \
  '{location:$location,vm_size:$vm_size,ssh_public_key:$ssh_public_key}' \
  >"$root/.deployment/inputs.json"

session="$root/.deployment/session.sh"
{
  printf 'export ARM_SUBSCRIPTION_ID=%q\n' "$subscription_id"
  printf 'export TF_DATA_DIR=%q\n' "$root/.deployment/terraform-data"
  if [[ -x "$root/.deployment/bin/jq" ]]; then
    printf 'export PATH=%q:$PATH\n' "$root/.deployment/bin"
  fi
  printf 'export TF_VAR_location=%q\n' "$TF_VAR_location"
  printf 'export TF_VAR_vm_size=%q\n' "$TF_VAR_vm_size"
  printf 'export TF_VAR_ssh_public_key=%q\n' "$ssh_public_key"
} >"$session"
chmod 600 "$session" "$root/.deployment/inputs.json"

echo "Local deployment inputs are ready for subscription $subscription_id."
echo "Run: source .deployment/session.sh"
