#!/usr/bin/env bash
# Read-only by default. Pass --register to register providers required by the
# existing VM stack and optional Function/SQL reporting branch.
set -euo pipefail

register=false
if [[ "${1:-}" == "--register" ]]; then
  register=true
elif [[ $# -gt 0 ]]; then
  echo "usage: azure-preflight.sh [--register]" >&2
  exit 2
fi

az account show >/dev/null 2>&1 || { echo "Run 'az login' first." >&2; exit 1; }

providers=(Microsoft.Compute Microsoft.Network Microsoft.Storage Microsoft.DevTestLab Microsoft.Logic Microsoft.Web Microsoft.Sql Microsoft.KeyVault)
missing=()
for namespace in "${providers[@]}"; do
  state=$(az provider show --namespace "$namespace" --query registrationState -o tsv)
  printf '%-26s %s\n' "$namespace" "$state"
  if [[ "$state" != "Registered" ]]; then
    missing+=("$namespace")
  fi
done

if [[ ${#missing[@]} -gt 0 && "$register" == true ]]; then
  for namespace in "${missing[@]}"; do
    echo "Registering $namespace..." >&2
    az provider register --namespace "$namespace" --wait
  done
elif [[ ${#missing[@]} -gt 0 ]]; then
  printf 'Missing providers: %s\n' "${missing[*]}" >&2
  echo "Run this script with --register before terraform apply." >&2
  exit 1
fi

# Confirm the selected Function runtime and SQL serverless SKU exist in East US.
az functionapp list-runtimes --os linux --query "[?contains(to_string(@), 'node') || contains(to_string(@), 'Node')]" -o none
az sql db list-editions --location eastus --query "[?name=='GeneralPurpose'].name | [0]" -o tsv | grep -q .
echo "Azure prerequisites are ready."
