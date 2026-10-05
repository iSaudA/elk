#!/usr/bin/env bash
# Print a reviewable Terraform plan summary without exposing planned values.
set -euo pipefail

plan_file=${1:?usage: terraform-plan-summary.sh PLAN_FILE}
plan_json=$(mktemp)
trap 'rm -f "$plan_json"' EXIT

terraform show -json "$plan_file" >"$plan_json"

change_count=$(jq '[.resource_changes[]? | select(.change.actions != ["no-op"])] | length' "$plan_json")
destroy_count=$(jq '[.resource_changes[]? | select(.change.actions | index("delete"))] | length' "$plan_json")

printf '### Terraform plan\n\n'
printf -- '- Changed resources: `%s`\n' "$change_count"
printf -- '- Destructive changes: `%s`\n\n' "$destroy_count"

if [[ "$change_count" -eq 0 ]]; then
  printf 'No infrastructure changes.\n'
else
  printf '| Action | Resource |\n| --- | --- |\n'
  jq -r '
    .resource_changes[]?
    | select(.change.actions != ["no-op"])
    | "| `\(.change.actions | join("/"))` | `\(.address)` |"
  ' "$plan_json"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'destroy_count=%s\n' "$destroy_count" >>"$GITHUB_OUTPUT"
fi
