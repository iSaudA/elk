# Azure demo deployment

Rebuilt on 25 September 2026 in **East US**, using `Standard_D4s_v7` (4 vCPU, 16 GiB). Daily startup is scheduled for 09:00 and nightly shutdown for 23:00 Riyadh time. Startup runs in an Azure Consumption Logic App, using a managed identity permitted only to read and start this VM.

- Resource group: `rg-ayn-sijill`
- VM: `vm-ayn-sijill`
- Runtime endpoints: retrieve `kibana_url`, `app_url`, and `analytics_ingest_url` from Terraform outputs.
- Azure SQL: retrieve `analytics_sql_server` and `analytics_sql_database` from Terraform outputs.
- Terraform state: `rg-ayn-tfstate`, in East US

From the repository root, the normal deployment is one command:

```bash
./deploy.sh
```

The script assumes the Azure CLI is authenticated and the intended subscription is selected. It creates the ignored local session files, connects the Azure Blob remote state backend, deploys and configures the environment, validates it, loads the dashboard baseline, and prints the outputs. For manual operation or a new terminal, load the generated session first:

```bash
source .deployment/session.sh
```

## Post-deployment outputs

This development demo prints non-sensitive outputs. Request a secret explicitly only when needed:

```bash
terraform -chdir=terraform output
terraform -chdir=terraform output -raw elastic_password
```

| Output | Purpose |
| --- | --- |
| `kibana_url` | Public HTTPS Kibana address |
| `kibana_dashboard_url` | Direct link to the AYN AL-SIJILL Operations dashboard |
| `elastic_username` | Kibana administrator username |
| `elastic_password` | Kibana administrator password |
| `app_url` | Synthetic shop API base URL |
| `log_ingest_token` | `x-ayn-shop-token` value and `/ingest` Basic password for user `azure-function` |
| `analytics_ingest_url` | Direct Azure SQL reporting Function endpoint |
| `analytics_ingest_token` | `x-ayn-token` value for the reporting Function |
| `analytics_sql_server` | Azure SQL server hostname |
| `analytics_sql_database` | Azure SQL database name |
| `analytics_sql_admin_login` | Azure SQL administrator username |
| `analytics_sql_admin_password` | Azure SQL administrator password |
| `resource_group_name` | Workload resource group |
| `vm_name` | ELK virtual machine name |
| `public_ip_address` | VM public IP used by its HTTPS endpoint |
| `analytics_function_name` | Function App resource name |
| `analytics_storage_account_name` | Function package storage account |
| `analytics_key_vault_name` | Key Vault containing runtime and optional Telegram secrets |
| `startup_workflow_id` | Daily VM startup Logic App resource ID |

Open `kibana_dashboard_url` and sign in using `elastic_username` and `elastic_password`. Telegram credentials are supplied by the operator and stored in Key Vault as `telegram-bot-token` and `telegram-chat-id`; they are not Terraform outputs.

Password and token outputs are marked sensitive, but an operator can still request a named value with `terraform output -raw OUTPUT_NAME`. Do not paste output into chat, documentation, screenshots, tickets, or CI logs. Terraform state contains generated secrets and must remain private.

## GitHub Actions deployment

The `dev` branch can deploy through GitHub Actions with Azure OIDC, a saved-plan
approval gate and serialized applies. See [docs/CI_CD.md](docs/CI_CD.md) for the
one-time identity bootstrap, repository settings and operating procedure.

Inspect and validate the VM through Azure Run Command:

```bash
resource_group=$(terraform -chdir=terraform output -raw resource_group_name)
vm_name=$(terraform -chdir=terraform output -raw vm_name)
./scripts/run-remote.sh "$resource_group" "$vm_name" \
  'cloud-init status --wait; cd /opt/ayn-al-sijill; docker compose -f compose.azure.yaml ps -a; ./scripts/validate.sh'
```

To start or stop manually (the daily schedule still applies):

```bash
az vm deallocate --resource-group rg-ayn-sijill --name vm-ayn-sijill
# Resume for a demonstration:
az vm start --resource-group rg-ayn-sijill --name vm-ayn-sijill
```

To remove the workload, from the repository root:

```bash
source .deployment/session.sh
terraform -chdir=terraform destroy -var-file=../.deployment/inputs.json
```

## Verification completed

- Terraform apply succeeded; cloud-init completed successfully.
- All 18 Node application tests passed in WSL.
- Normal checkout returned HTTP 201; Ghost Order returned HTTP 500. Both produced every required event with matching order and trace IDs in Elasticsearch.
- The Flex Consumption Function registered all five HTTP/timer functions; its health endpoint returned HTTP 200 and unauthenticated reporting access returned HTTP 401.
- A unique probe passed through Caddy and Logstash, was accepted by the Function, and was read back from Azure SQL by exact event ID.
- Kibana saved-object import exited successfully and the Operations dashboard was retrieved through authenticated public HTTPS.
- Linux and Docker ingestion were confirmed (4,143 and 1,071 indexed events at check time).
- Public login returned HTTP 200 with a valid TLS certificate; HTTP redirected to HTTPS with 308. The dashboard API returned 401 without credentials.
- No application or Elastic stack was run on the local machine.

## Reporting branch status

The `Logstash HTTP output -> Azure Function -> Azure SQL` reporting branch was deployed and validated again during the 25 September 2026 rebuild. The Function sends synthetic shop events to the authenticated `https://<Kibana host>/ingest` route; Caddy proxies them to Logstash, which indexes Elasticsearch and copies the events to the reporting Function. The Function runs on Flex Consumption in East US 2, while SQL runs in Central US because this subscription restricted SQL provisioning in the eastern regions.

To redeploy the reporting branch after a code or pipeline change:

```bash
./scripts/azure-preflight.sh --register
source .deployment/session.sh
terraform -chdir=terraform plan -var-file=../.deployment/inputs.json -out=../.deployment/analytics.tfplan
terraform -chdir=terraform apply ../.deployment/analytics.tfplan
./scripts/configure-analytics.sh
```

`configure-analytics.sh` publishes the ready-to-run package with Flex OneDeploy, copies the updated Caddy, Logstash, and Compose configuration to the VM, enables authenticated reporting, and invokes `validate-analytics.sh`. Validation checks both a direct Function write and a uniquely identified `Caddy -> Logstash -> Function -> SQL` event read-back.

## Telegram incident alerts

The Function sends one Telegram message for each Ghost Order, declined payment,
or inventory shortage. Send `/start` to the bot before configuration, then store
the credentials in Azure Key Vault:

```bash
source .deployment/session.sh
read -rsp "Telegram bot token: " TELEGRAM_BOT_TOKEN && export TELEGRAM_BOT_TOKEN
echo
./scripts/configure-telegram.sh
unset TELEGRAM_BOT_TOKEN
```

If more than one chat has contacted the bot, export `TELEGRAM_CHAT_ID` before
running the script. The script verifies the token, writes both secrets without
placing them in Terraform state, restarts the Function App, and sends a test
message. Incident cards include severity, business impact, service, order and
trace IDs, root cause, payment and item context, a recommended response, and a
button that opens the Operations dashboard filtered to the incident trace.
Redeploy the Function package with `configure-analytics.sh` after code changes;
the Key Vault secrets remain in place.

## Historical chart baseline

Seed the Kibana dashboard from 1 January 2026 through the
current time after the reporting path is healthy:

```bash
source .deployment/session.sh
export LOG_INGEST_URL="$(terraform -chdir=terraform output -raw kibana_url)/ingest"
export LOG_INGEST_TOKEN="$(terraform -chdir=terraform output -raw log_ingest_token)"
npm run backfill
unset LOG_INGEST_URL LOG_INGEST_TOKEN
```

The default density is four checkout journeys per day. Stable event IDs make
the baseline safe to rerun, and `labels.generation` distinguishes historical
records from ongoing randomized traffic.

To pause automatic startup while keeping the VM available for manual use:

```bash
az resource update --resource-group rg-ayn-sijill --name start-ayn-sijill \
  --resource-type Microsoft.Logic/workflows --set properties.state=Disabled
# Use properties.state=Enabled to resume the schedule.
```

A later Terraform apply restores the configured enabled state. Disabling the startup schedule does not turn off a currently running VM; use the deallocate command above for that.
