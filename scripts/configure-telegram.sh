#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
export TF_DATA_DIR="$root/.deployment/terraform-data"

command -v az >/dev/null || { echo "Azure CLI is required." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
az account show >/dev/null 2>&1 || { echo "Run 'az login' first." >&2; exit 1; }
: "${TELEGRAM_BOT_TOKEN:?Export TELEGRAM_BOT_TOKEN before running this script.}"

telegram_request() {
  local method=$1
  shift
  curl -fsS --max-time 30 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}" "$@"
}

bot=$(telegram_request getMe)
jq -e '.ok == true' <<<"$bot" >/dev/null || { echo "Telegram rejected the bot token." >&2; exit 1; }

chat_id=${TELEGRAM_CHAT_ID:-}
if [[ -z "$chat_id" ]]; then
  updates=$(telegram_request getUpdates --data-urlencode 'timeout=0' --data-urlencode 'allowed_updates=["message"]')
  mapfile -t chat_ids < <(jq -r '.result[].message.chat.id // empty' <<<"$updates" | sort -u)
  if [[ ${#chat_ids[@]} -eq 0 ]]; then
    echo "Send /start to the bot, then run this script again." >&2
    exit 1
  fi
  if [[ ${#chat_ids[@]} -ne 1 ]]; then
    echo "More than one Telegram chat was found. Export TELEGRAM_CHAT_ID explicitly." >&2
    exit 1
  fi
  chat_id=${chat_ids[0]}
fi

resource_group=$(terraform -chdir="$root/terraform" output -raw resource_group_name)
function_name=$(terraform -chdir="$root/terraform" output -raw analytics_function_name)
key_vault_name=$(terraform -chdir="$root/terraform" output -raw analytics_key_vault_name)

secret_dir=$(mktemp -d)
cleanup() {
  rm -f "$secret_dir/bot-token" "$secret_dir/chat-id"
  rmdir "$secret_dir"
}
trap cleanup EXIT
chmod 700 "$secret_dir"
printf '%s' "$TELEGRAM_BOT_TOKEN" >"$secret_dir/bot-token"
printf '%s' "$chat_id" >"$secret_dir/chat-id"

az keyvault secret set --vault-name "$key_vault_name" --name telegram-bot-token \
  --file "$secret_dir/bot-token" --encoding utf-8 --output none
az keyvault secret set --vault-name "$key_vault_name" --name telegram-chat-id \
  --file "$secret_dir/chat-id" --encoding utf-8 --output none
az functionapp restart --resource-group "$resource_group" --name "$function_name" --output none

test_response=$(telegram_request sendMessage \
  --data-urlencode "chat_id=$chat_id" \
  --data-urlencode 'text=AYN AL-SIJILL incident alerts are configured.')
jq -e '.ok == true' <<<"$test_response" >/dev/null || {
  echo "Secrets were stored, but the Telegram test message failed." >&2
  exit 1
}

echo "Telegram incident alerts are configured and a test message was sent."
