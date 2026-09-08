#!/usr/bin/env bash
# Optional GitHub deployment identity; not needed for the authenticated CLI route.
# OIDC exchanges a GitHub identity token for Azure access without a stored client password.
# Reference: https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
# Demo limitation: subscription Contributor is broad and cannot create role definitions
# or assignments required by startup.tf. An administrator must design/grant suitable
# RBAC permissions before claiming the full GitHub deployment path is ready.
# Reference: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#contributor
set -euo pipefail

repository=${1:?usage: configure-github-oidc.sh OWNER/REPOSITORY}
subscription_id=$(az account show --query id --output tsv)
tenant_id=$(az account show --query tenantId --output tsv)
display_name="github-ayn-al-sijill"

app_id=$(az ad app list --display-name "$display_name" --query '[0].appId' --output tsv)
if [[ -z "$app_id" ]]; then
  app_id=$(az ad app create --display-name "$display_name" --query appId --output tsv)
fi

object_id=$(az ad app show --id "$app_id" --query id --output tsv)
# Existing-object errors are currently ignored below. Other failures can also be
# hidden by || true, so the printed IDs alone do not prove that permissions work.
az ad sp create --id "$app_id" --output none 2>/dev/null || true
az role assignment create \
  --assignee "$app_id" \
  --role Contributor \
  --scope "/subscriptions/$subscription_id" \
  --output none 2>/dev/null || true

credential_file=$(mktemp)
trap 'rm -f "$credential_file"' EXIT
cat >"$credential_file" <<EOF
{
  "name": "github-azure-demo",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${repository}:environment:azure-demo",
  "description": "AYN AL-SIJILL deployment workflow",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF

if ! az ad app federated-credential list --id "$object_id" \
  --query "[?name=='github-azure-demo'] | [0].name" --output tsv | grep -q .; then
  az ad app federated-credential create \
    --id "$object_id" \
    --parameters "$credential_file" \
    --output none
fi

cat <<EOF
Add these GitHub environment secrets under the 'azure-demo' environment:

AZURE_CLIENT_ID=$app_id
AZURE_TENANT_ID=$tenant_id
AZURE_SUBSCRIPTION_ID=$subscription_id
SSH_PUBLIC_KEY=<contents of your .pub file>
ALLOWED_CIDR=<your public IP>/32
EOF
