# Azure demo deployment

Created on 6 September 2026 in **East US**, using `Standard_D4s_v7` (4 vCPU, 16 GiB). The existing v5/B4ms candidates were restricted for this subscription. Microsoft's retail API quoted **$0.265/hour for Linux compute**, excluding disk, public IP and state storage. Daily startup is scheduled for 09:00 and nightly shutdown for 23:00 Riyadh time. Startup runs in an Azure Consumption Logic App, using a managed identity permitted only to read/start this VM. The first scheduled start is 7 September 2026 at 09:00 Riyadh time.

- Resource group: `rg-ayn-sijill`
- VM: `vm-ayn-sijill`
- Kibana: https://ayn-sijill-bc9bc4dc.eastus.cloudapp.azure.com
- Shop Function: https://func-ayn-sijill-bc9bc4dc.azurewebsites.net/api/shop
- Reporting Function: https://func-ayn-sijill-bc9bc4dc.azurewebsites.net/api/incidents
- Azure SQL: `sql-ayn-sijill-bc9bc4dc-centralus.database.windows.net` / `sqldb-ayn-sijill-analytics`
- Terraform state: `rg-ayn-tfstate`, in East US

From `replica-shop`, use the ignored session files to manage this deployment:

```bash
source .deployment/session.sh
# Password stays out of documentation and Git. Username: elastic.
terraform -chdir=terraform output -raw elastic_password
ssh -i .deployment/id_ed25519 azureuser@172.191.53.102
```

On the VM:

```bash
sudo cloud-init status --wait
cd /opt/ayn-al-sijill
sudo docker compose -f compose.azure.yaml ps -a
sudo scripts/validate.sh
```

To start or stop manually (the daily schedule still applies):

```bash
az vm deallocate --resource-group rg-ayn-sijill --name vm-ayn-sijill
# Resume for a demonstration:
az vm start --resource-group rg-ayn-sijill --name vm-ayn-sijill
```

To remove the workload, from `replica-shop`:

```bash
source .deployment/session.sh
terraform -chdir=terraform destroy -var-file=../.deployment/inputs.json
```

The state storage account is separate and remains after workload destruction. Keep `.deployment/` private; it contains the SSH key, deployment inputs, Terraform cache and plans. 

## Verification completed

- Terraform apply succeeded; cloud-init completed successfully.
- The original three Node application tests passed inside the Azure container before the serverless migration.
- Normal checkout returned HTTP 201; Ghost Order returned HTTP 500. Both produced every required event with matching order and trace IDs in Elasticsearch.
- The Flex Consumption Function registered all five HTTP/timer functions; its health endpoint returned HTTP 200 and unauthenticated reporting access returned HTTP 401.
- A unique probe passed through Caddy and Logstash, was accepted by the Function, and was read back from Azure SQL by exact event ID.
- `dbo.PowerBIIncidentEvents` exists with the expected 10-column schema and returned live rows through a direct encrypted Azure SQL connection.
- Kibana saved-object import exited successfully and the Operations dashboard was retrieved through authenticated public HTTPS.
- Linux and Docker ingestion were confirmed (4,143 and 1,071 indexed events at check time).
- Public login returned HTTP 200 with a valid TLS certificate; HTTP redirected to HTTPS with 308. The dashboard API returned 401 without credentials.
- No application or Elastic stack was run on the local machine.

## Reporting branch status

The `Logstash HTTP output -> Azure Function -> Azure SQL -> Power BI` reporting branch was deployed and validated on 20 September 2026. The Function sends synthetic shop events to the authenticated `https://<Kibana host>/ingest` route; Caddy proxies them to Logstash, which indexes Elasticsearch and copies the events to the reporting Function. The Function runs on Flex Consumption in East US 2, while SQL runs in Central US because this subscription restricted SQL provisioning in the eastern regions.

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

Seed the dashboard and Power BI data source from 1 January 2026 through the
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

Power BI Desktop should use the Azure SQL connector with the Terraform outputs `analytics_sql_server`, `analytics_sql_database`, `analytics_sql_admin_login`, and the sensitive `analytics_sql_admin_password`, then select `dbo.PowerBIIncidentEvents`. Prefer Import for this small demo; use DirectQuery only when live queries are required. The database/view are ready, but a `.pbix` report has not been authored or published. This demo allows Azure services through the SQL firewall; replace the SQL administrator with a least-privilege reporting identity and use private networking before treating the path as production-ready.

Remaining proposal work: author and publish the Power BI report, add KPI visualizations, decide whether Nginx logs are still required, and complete a destroy-and-rebuild rehearsal. Recheck current pricing before relying on the historical estimate above.


To pause automatic startup while keeping the VM available for manual use:

```bash
az resource update --resource-group rg-ayn-sijill --name start-ayn-sijill \
  --resource-type Microsoft.Logic/workflows --set properties.state=Disabled
# Use properties.state=Enabled to resume the schedule.
```

A later Terraform apply restores the configured enabled state. Disabling the startup schedule does not turn off a currently running VM; use the deallocate command above for that.
