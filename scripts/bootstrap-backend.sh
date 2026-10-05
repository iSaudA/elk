#!/usr/bin/env bash
# Purpose: create Azure Blob storage BEFORE Terraform initializes its backend.
# Project choice: a small CLI bootstrap avoids a second Terraform state to manage.
# Microsoft documents both CLI and Terraform bootstrap options; neither is mandatory.
# Reference: https://learn.microsoft.com/en-us/azure/developer/terraform/get-started/store-state-in-azure-storage
# State locking is automatic in the azurerm backend; this script does not implement a lock.
# Reference: https://developer.hashicorp.com/terraform/language/backend/azurerm
# Demo tradeoff: access-key authentication is used here. Entra ID is the recommended
# backend authentication for a stronger setup; backend.hcl and plans contain credentials.
# Catch command failures, unset variables and failed pipeline commands early.
# Reference: https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html
set -euo pipefail
# backend.hcl contains a storage key and must only be readable by its owner.
umask 077

if ! az account show >/dev/null 2>&1; then
  echo "Run 'az login' first." >&2
  exit 1
fi

# Storage account names must be globally unique. A stable suffix reuses the same
# account on repeat runs; hashing here is only for naming, not secret protection.
subscription_id=$(az account show --query id --output tsv)
suffix=$(printf '%s' "$subscription_id" | sha256sum | cut -c1-10)
resource_group="rg-ayn-tfstate"
storage_account="ayntf${suffix}"
container="tfstate"

# Backend resources have their own resource group and are outside the main TF state.
# A workload terraform destroy therefore leaves its state storage intact.
az group create --name "$resource_group" --location eastus --output none
# Reuse an existing account. This checks existence, not configuration drift;
# changing flags below does not update an account that already exists.
if ! az storage account show --name "$storage_account" --resource-group "$resource_group" >/dev/null 2>&1; then
  az storage account create \
    --name "$storage_account" \
    --resource-group "$resource_group" \
    --location eastus \
    --sku Standard_LRS \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false \
    --output none
fi

access_key=$(az storage account keys list \
  --account-name "$storage_account" \
  --resource-group "$resource_group" \
  --query '[0].value' --output tsv)

az storage container create \
  --name "$container" \
  --account-name "$storage_account" \
  --account-key "$access_key" \
  --output none

# Write a file with a heredoc: EOF marks where the multi-line text ends.
# umask above restricts newly created files; Git ignores this generated file.
cat >"$(dirname "$0")/../backend.hcl" <<EOF
resource_group_name  = "$resource_group"
storage_account_name = "$storage_account"
container_name       = "$container"
key                  = "ayn-al-sijill.tfstate"
access_key            = "$access_key"
EOF

echo "Terraform backend is ready: $storage_account/$container"
