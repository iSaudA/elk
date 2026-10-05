#!/usr/bin/env bash
# Azure CLI and HTTP validation for the reporting branch. The GET read-back is
# served by the Function but reads Azure SQL, so it verifies the write path.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
export TF_DATA_DIR="$root/.deployment/terraform-data"
az account show >/dev/null 2>&1 || { echo "Run 'az login' first." >&2; exit 1; }

resource_group=$(terraform -chdir="$root/terraform" output -raw resource_group_name)
function_name=$(terraform -chdir="$root/terraform" output -raw analytics_function_name)
ingest_url=$(terraform -chdir="$root/terraform" output -raw analytics_ingest_url)
ingest_token=$(terraform -chdir="$root/terraform" output -raw analytics_ingest_token)
log_ingest_token=$(terraform -chdir="$root/terraform" output -raw log_ingest_token)
kibana_url=$(terraform -chdir="$root/terraform" output -raw kibana_url)
sql_server=$(terraform -chdir="$root/terraform" output -raw analytics_sql_server)
sql_database=$(terraform -chdir="$root/terraform" output -raw analytics_sql_database)

az resource show -g "$resource_group" -n "$function_name" \
  --resource-type Microsoft.Web/sites --api-version 2024-04-01 \
  --query '{state:properties.state,httpsOnly:properties.httpsOnly,host:properties.defaultHostName}' -o table
az sql db show -g "$resource_group" -s "${sql_server%%.*}" -n "$sql_database" \
  --query '{status:status,sku:currentSku.name,maxSizeBytes:maxSizeBytes}' -o table

event_id="cli-$(date +%s)-$RANDOM"
payload=$(jq -nc --arg id "$event_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  '{"@timestamp":$ts,event:{id:$id,action:"AZURE_CLI_PROBE",outcome:"success"},service:{name:"azure-cli"},message:"End-to-end reporting branch probe"}')
response=$(curl -fsS --max-time 60 -X POST "$ingest_url" \
  -H 'content-type: application/json' -H "x-ayn-token: $ingest_token" -d "$payload")
jq -e --arg id "$event_id" '.accepted == 1 and (.event_ids | index($id) != null)' <<<"$response" >/dev/null

direct_validated=false
for attempt in {1..12}; do
  if row=$(curl -fsS --max-time 45 -H "x-ayn-token: $ingest_token" "$ingest_url?event_id=$event_id" 2>/dev/null) \
    && jq -e --arg id "$event_id" '.EventId == $id and .EventAction == "AZURE_CLI_PROBE"' <<<"$row" >/dev/null; then
    direct_validated=true
    break
  fi
  sleep 5
done
[[ "$direct_validated" == true ]] || {
  echo "The Function accepted the probe, but Azure SQL read-back did not succeed." >&2
  exit 1
}
echo "Validated Function -> Azure SQL read-back for $event_id"

# Submit a second known event through Caddy and Logstash. Reading that exact ID
# back through the Function proves the reporting path reaches Azure SQL.
logstash_event_id="logstash-$(date +%s)-$RANDOM"
logstash_payload=$(jq -nc --arg id "$logstash_event_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  '{"@timestamp":$ts,event:{id:$id,action:"LOGSTASH_SQL_PROBE",outcome:"success"},service:{name:"validate-analytics.sh"},message:"Logstash to Azure SQL reporting probe"}')
curl -fsS --max-time 45 -X POST "$kibana_url/ingest" \
  -u "azure-function:$log_ingest_token" -H 'content-type: application/json' \
  -d "$logstash_payload" >/dev/null

logstash_validated=false
for attempt in {1..30}; do
  if row=$(curl -fsS --max-time 45 -H "x-ayn-token: $ingest_token" \
    "$ingest_url?event_id=$logstash_event_id" 2>/dev/null) \
    && jq -e --arg id "$logstash_event_id" \
      '.EventId == $id and .EventAction == "LOGSTASH_SQL_PROBE"' <<<"$row" >/dev/null; then
    logstash_validated=true
    break
  fi
  sleep 5
done
[[ "$logstash_validated" == true ]] || {
  echo "The Logstash probe was not readable from Azure SQL." >&2
  exit 1
}
echo "Validated Logstash -> Function -> Azure SQL for $logstash_event_id"
