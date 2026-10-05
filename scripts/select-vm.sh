#!/usr/bin/env bash
# Purpose: choose a supported 4-vCPU/16-GiB candidate in East US only.
# Candidate order is our demo preference, not an Azure price comparison.
# SKU visibility does not guarantee allocation capacity or remaining quota.
# Reference: https://learn.microsoft.com/en-us/cli/azure/vm#az-vm-list-skus
set -euo pipefail

if ! az account show >/dev/null 2>&1; then
  echo "Run 'az login' first." >&2
  exit 1
fi

# Never fall back to another region automatically.
[[ "${1:-eastus}" == "eastus" ]] || { echo "Only eastus is supported." >&2; exit 1; }
regions=(eastus)
sizes=(Standard_D4as_v5 Standard_D4s_v5 Standard_D4ads_v5 Standard_B4ms Standard_D4s_v7)

# Fetch once: asking Azure for its SKU catalogue once per size is slow.
for region in "${regions[@]}"; do
  [[ -n "$region" ]] || continue
  echo "Checking $region..." >&2
  available=$(az vm list-skus --location "$region" --resource-type virtualMachines \
    --query '[?length(restrictions)==`0`].name' --output tsv)
  for size in "${sizes[@]}"; do
    count=$(printf '%s\n' "$available" | grep -cx "$size" || true)
    if [[ "$count" != "0" ]]; then
# Print shell exports for the caller; diagnostic messages go to stderr.
# TF_VAR_name is Terraform's environment-variable form for an input variable.
      printf "export TF_VAR_location=%q\n" "$region"
      printf "export TF_VAR_vm_size=%q\n" "$size"
      echo "Selected $size in $region (4 vCPU, 16 GiB)." >&2
      exit 0
    fi
  done
done

echo "No unrestricted 4-vCPU/16-GiB candidate was found for this subscription." >&2
echo "Request an East US quota/SKU increase in Azure." >&2
exit 1
