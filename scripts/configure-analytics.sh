#!/usr/bin/env bash
# Sync the reporting settings and Logstash output to the existing VM, then prove
# a synthetic event can be written to and read back from Azure SQL.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
export TF_DATA_DIR="$root/.deployment/terraform-data"
az account show >/dev/null 2>&1 || { echo "Run 'az login' first." >&2; exit 1; }

resource_group=$(terraform -chdir="$root/terraform" output -raw resource_group_name)
vm_name=$(terraform -chdir="$root/terraform" output -raw vm_name)
function_name=$(terraform -chdir="$root/terraform" output -raw analytics_function_name)
storage_account=$(terraform -chdir="$root/terraform" output -raw analytics_storage_account_name)
ingest_url=$(terraform -chdir="$root/terraform" output -raw analytics_ingest_url)
ingest_token=$(terraform -chdir="$root/terraform" output -raw analytics_ingest_token)
log_ingest_token=$(terraform -chdir="$root/terraform" output -raw log_ingest_token)
app_url=$(terraform -chdir="$root/terraform" output -raw app_url)
sql_server=$(terraform -chdir="$root/terraform" output -raw analytics_sql_server)
sql_database=$(terraform -chdir="$root/terraform" output -raw analytics_sql_database)
function_package="$root/terraform/.analytics-function.zip"
subscription_id=$(az account show --query id -o tsv)
deployment_container="function-releases"
package_hash=$(sha256sum "$function_package" | cut -c1-16)
staging_blob="staged-$package_hash.zip"
storage_key=$(az storage account keys list --resource-group "$resource_group" \
  --account-name "$storage_account" --query '[0].value' -o tsv)

remove_staging_blob() {
  az storage blob delete --account-name "$storage_account" --account-key "$storage_key" \
    --container-name "$deployment_container" --name "$staging_blob" \
    --only-show-errors --output none >/dev/null 2>&1 || true
}

az resource show --resource-group "$resource_group" --name "$function_name" \
  --resource-type Microsoft.Web/sites --api-version 2024-04-01 \
  --query properties.state -o tsv | grep -qx Running
az functionapp config appsettings delete --resource-group "$resource_group" --name "$function_name" \
  --setting-names SCM_DO_BUILD_DURING_DEPLOYMENT ENABLE_ORYX_BUILD --output none
# Deploy through the Flex Consumption OneDeploy ARM extension. Azure CLI 2.90
# can return a gateway error for this operation even when Azure accepts it, so
# use the documented package URI contract and verify the deployment record.
trap remove_staging_blob EXIT
az storage blob upload --account-name "$storage_account" --account-key "$storage_key" \
  --container-name "$deployment_container" --name "$staging_blob" \
  --file "$function_package" --overwrite true --no-progress --only-show-errors --output none
expiry=$(date -u -d '+1 hour' '+%Y-%m-%dT%H:%MZ')
package_uri=$(az storage blob generate-sas --account-name "$storage_account" --account-key "$storage_key" \
  --container-name "$deployment_container" --name "$staging_blob" --permissions r \
  --expiry "$expiry" --https-only --full-uri -o tsv)
management_token=$(az account get-access-token --resource https://management.azure.com/ --query accessToken -o tsv)
one_deploy_body=$(jq -nc --arg uri "$package_uri" '{properties:{packageUri:$uri,remoteBuild:false}}')
one_deploy_response=$(mktemp)
deployment_response=$(mktemp)
cleanup_deployment_files() { rm -f "$one_deploy_response" "$deployment_response"; }
trap 'remove_staging_blob; cleanup_deployment_files' EXIT
one_deploy_status=000
for attempt in $(seq 1 6); do
  one_deploy_status=$(curl -sS --max-time 180 -o "$one_deploy_response" -w '%{http_code}' -X PUT \
    -H "Authorization: Bearer $management_token" -H 'content-type: application/json' \
    --data "$one_deploy_body" \
    "https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.Web/sites/$function_name/extensions/onedeploy?api-version=2024-04-01") \
    || one_deploy_status=000
  [[ "$one_deploy_status" == 200 || "$one_deploy_status" == 201 || "$one_deploy_status" == 202 ]] && break
  sleep $((attempt * 10))
done
[[ "$one_deploy_status" == 200 || "$one_deploy_status" == 201 || "$one_deploy_status" == 202 ]] || {
  echo "OneDeploy request failed with HTTP $one_deploy_status" >&2
  exit 1
}
deployment_id=$(awk 'BEGIN { RS = "<!DOCTYPE html>" } NR == 1 { print; exit }' "$one_deploy_response" \
  | jq -er '.properties.deployment.id')
deployment_complete=false
for attempt in $(seq 1 60); do
  deployment_http=$(curl -sS --max-time 60 -o "$deployment_response" -w '%{http_code}' \
    -H "Authorization: Bearer $management_token" \
    "https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.Web/sites/$function_name/deployments?api-version=2024-04-01") \
    || deployment_http=000
  if [[ "$deployment_http" != 200 ]]; then
    sleep 10
    continue
  fi
  deployment_json=$(awk 'BEGIN { RS = "<!DOCTYPE html>" } NR == 1 { print; exit }' "$deployment_response" \
    | jq -cer --arg id "$deployment_id" '.value[] | select(.properties.id == $id) | .properties' || true)
  if [[ -z "$deployment_json" ]]; then
    sleep 5
    continue
  fi
  deployment_status=$(jq -r .status <<<"$deployment_json")
  if [[ "$deployment_status" == 4 ]]; then deployment_complete=true; break; fi
  if [[ "$deployment_status" == 3 ]]; then
    jq -r '.status_text // .message // "OneDeploy failed"' <<<"$deployment_json" >&2
    exit 1
  fi
  sleep 5
done
[[ "$deployment_complete" == true ]] || { echo "OneDeploy did not complete within five minutes." >&2; exit 1; }
remove_staging_blob
cleanup_deployment_files
trap - EXIT
functions_ready=false
for attempt in $(seq 1 18); do
  if az functionapp function list --resource-group "$resource_group" --name "$function_name" \
    --query '[].name' -o tsv 2>/dev/null | grep -q '/incidentExport$'; then
    functions_ready=true
    break
  fi
  sleep 5
done
[[ "$functions_ready" == true ]] || { echo "Function registrations did not become ready." >&2; exit 1; }
az sql db show --resource-group "$resource_group" --server "${sql_server%%.*}" --name "$sql_database" \
  --query '{status:status,edition:edition}' -o table

compose_b64=$(base64 -w0 "$root/compose.azure.yaml")
caddy_b64=$(base64 -w0 "$root/Caddyfile")
logstash_b64=$(base64 -w0 "$root/logstash/pipeline/logstash.conf")
printf -v quoted_url '%q' "$ingest_url"
printf -v quoted_token '%q' "$ingest_token"
printf -v quoted_log_token '%q' "$log_ingest_token"
printf -v quoted_app_url '%q' "$app_url"

remote_script="set -eu
install -d -m 0755 /opt/ayn-al-sijill/logstash/pipeline
printf '%s' '$compose_b64' | base64 -d > /opt/ayn-al-sijill/compose.azure.yaml
printf '%s' '$caddy_b64' | base64 -d > /opt/ayn-al-sijill/Caddyfile
printf '%s' '$logstash_b64' | base64 -d > /opt/ayn-al-sijill/logstash/pipeline/logstash.conf
env_file=/opt/ayn-al-sijill/.env
touch \"\$env_file\"
upsert() {
  key=\$1
  value=\$2
  tmp=\$(mktemp)
  awk -F= -v key=\"\$key\" '\$1 != key { print }' \"\$env_file\" > \"\$tmp\"
  printf '%s=%s\\n' \"\$key\" \"\$value\" >> \"\$tmp\"
  install -m 0600 \"\$tmp\" \"\$env_file\"
  rm -f \"\$tmp\"
}
upsert ANALYTICS_EXPORT_ENABLED true
upsert ANALYTICS_INGEST_URL $quoted_url
upsert ANALYTICS_INGEST_TOKEN $quoted_token
upsert LOG_INGEST_TOKEN $quoted_log_token
upsert APP_URL $quoted_app_url
cd /opt/ayn-al-sijill
docker compose -f compose.azure.yaml up -d --no-deps --force-recreate logstash
healthy=false
for attempt in \$(seq 1 30); do
  if docker compose -f compose.azure.yaml ps --format json logstash | grep -q '\"Health\":\"healthy\"'; then healthy=true; break; fi
  sleep 5
done
if [ \"\$healthy\" != true ]; then
  docker compose -f compose.azure.yaml logs --tail=100 logstash
  exit 1
fi
docker compose -f compose.azure.yaml up -d --no-deps --force-recreate --remove-orphans caddy
"

"$root/scripts/run-remote.sh" "$resource_group" "$vm_name" "$remote_script"
"$root/scripts/validate-analytics.sh"
