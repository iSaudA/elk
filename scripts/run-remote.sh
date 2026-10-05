#!/usr/bin/env bash
# Reference: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/run-command
# The completion marker is our small CI check, not an Azure security feature.
# Azure Run Command can succeed at the API level even when the shell fails.
# Require a final marker so CI fails when any remote command fails.
set -euo pipefail
resource_group=${1:?resource group is required}
vm_name=${2:?VM name is required}
script=${3:?script is required}
marker="REMOTE_OK_$(date +%s)_${RANDOM}"
result=$(az vm run-command invoke --resource-group "$resource_group" --name "$vm_name" \
  --command-id RunShellScript --scripts "set -e
$script
printf '\\n%s\\n' '$marker'" --query 'value[].message' -o tsv)
printf '%s\n' "$result"
if ! grep -qx "$marker" <<<"$result"; then
  echo "Azure VM command failed or did not complete." >&2
  exit 1
fi
