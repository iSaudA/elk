#!/usr/bin/env bash
# One-time bootstrap for GitHub Actions OIDC against an existing Azure deployment.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
repository=${1:-}
ssh_public_key_path=${2:-${AYN_SSH_PUBLIC_KEY_PATH:-"$HOME/.ssh/ayn-al-sijill.pub"}}
workload_resource_group=${AYN_WORKLOAD_RESOURCE_GROUP:-rg-ayn-sijill}
state_resource_group=${AYN_STATE_RESOURCE_GROUP:-rg-ayn-tfstate}
identity_name=${AYN_GITHUB_IDENTITY_NAME:-id-ayn-github-dev}
deployment_branch=${AYN_DEPLOYMENT_BRANCH:-main}
deployment_environment=${AYN_DEPLOYMENT_ENVIRONMENT:-azure-dev}

require() { command -v "$1" >/dev/null || { echo "$1 is required." >&2; exit 1; }; }
for command in az gh jq terraform; do require "$command"; done

az account show >/dev/null 2>&1 || { echo "Run 'az login' first." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first." >&2; exit 1; }

if [[ -z "$repository" ]]; then
  repository=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)
fi
[[ "$repository" == */* ]] || {
  echo "Usage: scripts/setup-github-actions.sh OWNER/REPOSITORY [SSH_PUBLIC_KEY_PATH]" >&2
  exit 1
}

if [[ -s "$ssh_public_key_path" ]]; then
  ssh_public_key=$(<"$ssh_public_key_path")
elif [[ -s "$root/.deployment/inputs.json" ]]; then
  ssh_public_key=$(jq -er '.ssh_public_key' "$root/.deployment/inputs.json")
else
  echo "SSH public key not found at $ssh_public_key_path or in .deployment/inputs.json." >&2
  exit 1
fi

deployment_location=${AYN_LOCATION:-$(jq -r '.location // empty' "$root/.deployment/inputs.json" 2>/dev/null || true)}
deployment_location=${deployment_location:-eastus}
deployment_vm_size=${AYN_VM_SIZE:-$(jq -r '.vm_size // empty' "$root/.deployment/inputs.json" 2>/dev/null || true)}
deployment_vm_size=${deployment_vm_size:-Standard_D4s_v7}

az group show --name "$workload_resource_group" >/dev/null 2>&1 || {
  echo "The existing workload resource group was not found: $workload_resource_group" >&2
  echo "Deploy once locally before transferring deployment automation to GitHub Actions." >&2
  exit 1
}
az group show --name "$state_resource_group" >/dev/null 2>&1 || {
  echo "The Terraform state resource group was not found: $state_resource_group" >&2
  exit 1
}

subscription_id=$(az account show --query id -o tsv)
tenant_id=$(az account show --query tenantId -o tsv)
operator_object_id=$(az ad signed-in-user show --query id -o tsv)
workload_scope=$(az group show --name "$workload_resource_group" --query id -o tsv)
state_storage_account=$(az storage account list --resource-group "$state_resource_group" \
  --query '[0].name' -o tsv)
[[ -n "$state_storage_account" ]] || {
  echo "No Terraform state storage account was found in $state_resource_group." >&2
  exit 1
}
state_storage_scope=$(az storage account show --resource-group "$state_resource_group" \
  --name "$state_storage_account" --query id -o tsv)

if ! az identity show --resource-group "$state_resource_group" --name "$identity_name" >/dev/null 2>&1; then
  az identity create --resource-group "$state_resource_group" --name "$identity_name" --output none
fi
client_id=$(az identity show --resource-group "$state_resource_group" --name "$identity_name" \
  --query clientId -o tsv)
automation_object_id=$(az identity show --resource-group "$state_resource_group" --name "$identity_name" \
  --query principalId -o tsv)

repo_json=$(gh api "repos/$repository")
owner_login=$(jq -r .owner.login <<<"$repo_json")
owner_id=$(jq -r .owner.id <<<"$repo_json")
repo_name=$(jq -r .name <<<"$repo_json")
repo_id=$(jq -r .id <<<"$repo_json")

ensure_federated_credential() {
  local name=$1
  local subject=$2
  if ! az identity federated-credential show --resource-group "$state_resource_group" \
    --identity-name "$identity_name" --name "$name" >/dev/null 2>&1; then
    az identity federated-credential create \
      --resource-group "$state_resource_group" \
      --identity-name "$identity_name" \
      --name "$name" \
      --issuer https://token.actions.githubusercontent.com \
      --subject "$subject" \
      --audiences api://AzureADTokenExchange \
      --output none
  fi
}

# Support both the legacy name-based subject and GitHub's immutable repository-ID subject.
ensure_federated_credential branch-legacy \
  "repo:${owner_login}/${repo_name}:ref:refs/heads/${deployment_branch}"
ensure_federated_credential branch-immutable \
  "repo:${owner_login}@${owner_id}/${repo_name}@${repo_id}:ref:refs/heads/${deployment_branch}"
ensure_federated_credential environment-legacy \
  "repo:${owner_login}/${repo_name}:environment:${deployment_environment}"
ensure_federated_credential environment-immutable \
  "repo:${owner_login}@${owner_id}/${repo_name}@${repo_id}:environment:${deployment_environment}"

ensure_role_assignment() {
  local role=$1
  local scope=$2
  local count
  count=$(az role assignment list --assignee-object-id "$automation_object_id" --scope "$scope" \
    --query "[?roleDefinitionName=='$role'] | length(@)" -o tsv)
  if [[ "$count" == 0 ]]; then
    az role assignment create \
      --assignee-object-id "$automation_object_id" \
      --assignee-principal-type ServicePrincipal \
      --role "$role" \
      --scope "$scope" \
      --output none
  fi
}

ensure_role_assignment Contributor "$workload_scope"
ensure_role_assignment "Role Based Access Control Administrator" "$workload_scope"
ensure_role_assignment "Storage Blob Data Contributor" "$state_storage_scope"

# Add the automation identity to the existing Key Vault before its first CI plan.
# Keeping the operator ID explicit prevents the managed human policy from changing
# whenever Terraform runs under a different identity.
"$root/scripts/bootstrap-backend.sh"
export TF_DATA_DIR="$root/.deployment/terraform-data"
mkdir -p "$TF_DATA_DIR"
terraform -chdir="$root/terraform" init -reconfigure -input=false \
  -backend-config="$root/backend.hcl"
terraform -chdir="$root/terraform" apply -input=false -auto-approve \
  -target='azurerm_key_vault_access_policy.automation[0]' \
  -var="ssh_public_key=$ssh_public_key" \
  -var="operator_principal_object_id=$operator_object_id" \
  -var="automation_principal_object_id=$automation_object_id"

printf '{}' | gh api --method PUT "repos/$repository/environments/$deployment_environment" \
  --input - >/dev/null

set_repo_variable() {
  gh variable set "$1" --repo "$repository" --body "$2"
}

set_repo_variable AZURE_CLIENT_ID "$client_id"
set_repo_variable AZURE_TENANT_ID "$tenant_id"
set_repo_variable AZURE_SUBSCRIPTION_ID "$subscription_id"
set_repo_variable TF_STATE_RESOURCE_GROUP "$state_resource_group"
set_repo_variable TF_STATE_STORAGE_ACCOUNT "$state_storage_account"
set_repo_variable TF_STATE_CONTAINER tfstate
set_repo_variable TF_STATE_KEY ayn-al-sijill.tfstate
set_repo_variable TF_VAR_LOCATION "$deployment_location"
set_repo_variable TF_VAR_SSH_PUBLIC_KEY "$ssh_public_key"
set_repo_variable TF_VAR_OPERATOR_PRINCIPAL_OBJECT_ID "$operator_object_id"
set_repo_variable TF_VAR_AUTOMATION_PRINCIPAL_OBJECT_ID "$automation_object_id"

# vm_size is not currently an output; preserve the deployed default unless the
# operator explicitly provides AYN_VM_SIZE.
set_repo_variable TF_VAR_VM_SIZE "$deployment_vm_size"
set_repo_variable TERRAFORM_CICD_ENABLED true

cat <<EOF
GitHub Actions OIDC is configured for $repository.

Finish these repository settings in GitHub:
1. Add a required reviewer to the '$deployment_environment' environment and prevent self-review.
2. Protect '$deployment_branch': require pull requests and the 'Validate infrastructure and application' check.
3. Run 'Terraform deploy to Azure dev' manually from the '$deployment_branch' branch.

The workflow stores a saved plan for one day. Terraform plans and state can contain secrets.
EOF
