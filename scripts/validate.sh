#!/usr/bin/env bash
# Project check: require expected HTTP statuses and each required event for the same IDs.
# This checks presence/correlation; it does not prove event ordering or real payments.
# Elasticsearch indexing takes time, so retry briefly instead of failing immediately.
# Run on the Azure VM: verify both responses and their indexed event sequences.
set -euo pipefail
env_file=${ENV_FILE:-.env}
if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
fi
: "${APP_URL:?APP_URL must point to the Azure Functions /api/shop endpoint}"
: "${ELASTIC_PASSWORD:?Load the VM .env file first}"
: "${LOG_INGEST_TOKEN:?LOG_INGEST_TOKEN is required for the shop API}"
elastic_url=${ELASTIC_URL:-http://localhost:9200}
curl -fsS --max-time 15 "$APP_URL/health" >/dev/null
for scenario in checkout demo/ghost-order; do
  expected_status=201
  expected_actions='["CHECKOUT_STARTED","INVENTORY_RESERVED","PAYMENT_SUCCESS","ORDER_CREATED","HTTP_REQUEST_COMPLETED"]'
  if [[ "$scenario" == demo/ghost-order ]]; then
    expected_status=500
    expected_actions='["CHECKOUT_STARTED","INVENTORY_RESERVED","PAYMENT_SUCCESS","ORDER_CREATE_FAILED","DATABASE_TIMEOUT","HTTP_REQUEST_COMPLETED"]'
  fi
  response=$(curl -sS --max-time 30 -w '\n%{http_code}' -X POST "$APP_URL/$scenario" \
    -H 'content-type: application/json' -H "x-ayn-shop-token: $LOG_INGEST_TOKEN" \
    -d '{"customer_id":"validation","items":2,"amount":249.95}')
  status=$(tail -n1 <<<"$response")
  body=$(sed '$d' <<<"$response")
  [[ "$status" == "$expected_status" ]] || { echo "$scenario returned HTTP $status" >&2; exit 1; }
  order_id=$(jq -er .order_id <<<"$body")
  trace_id=$(jq -er .trace_id <<<"$body")
  # Match both identifiers, so unrelated events cannot accidentally pass this test.
  query=$(jq -nc --arg order "$order_id" --arg trace "$trace_id" '{size:20,sort:[{"@timestamp":"asc"}],query:{bool:{filter:[{match_phrase:{"order.id":$order}},{match_phrase:{"trace.id":$trace}}]}}}')
  passed=false
  for attempt in {1..30}; do
    result=$(curl -fsS --max-time 10 -u "elastic:${ELASTIC_PASSWORD}" \
      "$elastic_url/ayn-al-sijill-*/_search" -H 'content-type: application/json' -d "$query")
    if jq -e --argjson expected "$expected_actions" \
      '[.hits.hits[]._source.event.action] as $actual | ($expected - $actual | length) == 0' <<<"$result" >/dev/null; then
      passed=true
      break
    fi
    sleep 2
  done
  [[ "$passed" == true ]] || { echo "Missing correlated events for $scenario ($order_id)" >&2; exit 1; }
  echo "Validated $scenario: HTTP $status and all required events for $order_id / $trace_id"
done

# When the reporting branch is enabled, prove the Function can read its Azure SQL row.
if [[ "${ANALYTICS_EXPORT_ENABLED:-false}" == "true" ]]; then
  : "${ANALYTICS_INGEST_URL:?ANALYTICS_INGEST_URL is required}"
  : "${ANALYTICS_INGEST_TOKEN:?ANALYTICS_INGEST_TOKEN is required}"
  analytics_id="validation-$(date +%s)-$RANDOM"
  payload=$(jq -nc --arg id "$analytics_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
    '{"@timestamp":$ts,event:{id:$id,action:"VALIDATION_PROBE",outcome:"success"},service:{name:"validate.sh"},message:"Analytics export validation"}')
  curl -fsS --max-time 45 -X POST "$ANALYTICS_INGEST_URL" \
    -H 'content-type: application/json' -H "x-ayn-token: $ANALYTICS_INGEST_TOKEN" \
    -d "$payload" | jq -e --arg id "$analytics_id" '.accepted == 1 and (.event_ids | index($id) != null)' >/dev/null
  found=false
  for attempt in {1..12}; do
    if curl -fsS --max-time 30 -H "x-ayn-token: $ANALYTICS_INGEST_TOKEN" \
      "$ANALYTICS_INGEST_URL?event_id=$analytics_id" | jq -e --arg id "$analytics_id" '.EventId == $id' >/dev/null; then
      found=true
      break
    fi
    sleep 5
  done
  [[ "$found" == true ]] || { echo "Analytics event was not readable from Azure SQL." >&2; exit 1; }
  echo "Validated analytics export: Function accepted and read $analytics_id from Azure SQL"
fi
