# Replica Shop — AYN AL-SIJILL

Replica Shop is a commerce simulator for the AYN AL-SIJILL observability project. Azure Functions simulates checkout, inventory, payment, order and database services; there are no real payments or customers. It sends randomized ECS-style event batches over authenticated HTTPS to Logstash. Operational events stay in Elasticsearch, the reporting branch copies them into Azure SQL for Power BI, and failed checkouts can generate Telegram incident alerts.

ELK runs on **one Azure Ubuntu VM in East US** and the synthetic workload runs in an Azure Function App. Terraform provisions both, Bash installs Docker, and Docker Compose starts the ELK stack. No local stack is provided. `localhost` in ELK health checks means the Azure VM or its containers.

The timer generates a weighted random checkout every two minutes by default. The current mix is 75% successful, 8% Ghost Order, 10% payment declined, and 7% inventory shortage. Every event shares an `order.id`, `trace.id` and `transaction.id`; see [the event catalogue](docs/EVENTS.md).

The historical seeder uses the same scenario distribution to populate charts from 1 January 2026. Its stable event identifiers make reruns idempotent in Elasticsearch and Azure SQL.

## Files to understand first

- `function-app/src/events.js`: randomized scenarios and structured event creation.
- `function-app/src/functions.js`: HTTP and timer-triggered Azure Functions.
- `function-app/src/telegram.js`: best-effort Telegram alerts for failed checkouts.
- `function-app/src/backfill.js`: deterministic historical event generation.
- `scripts/backfill-history.cjs`: authenticated historical ingestion in retryable batches.
- `compose.azure.yaml`: ELK service connections, health checks and persistent storage.
- `logstash/pipeline/logstash.conf` and `filebeat/filebeat.yml`: application, container and Linux log collection.
- `function-app/`: authenticated HTTP ingestion, Azure SQL projection and the Power BI reporting view.
- `terraform/`: Azure resources, cloud-init bootstrap and a daily startup schedule in `startup.tf`.
- `scripts/validate.sh`: checks normal and Ghost Order responses and required correlated events on Azure.

This is an appropriate course-demo design: one VM, one application process, no Kubernetes, microservice deployment or real payment integration. The existing network module and optional GitHub OIDC workflow are the most advanced parts; they are infrastructure helpers rather than application requirements.

## Deploy on Azure

Check the required Azure resource providers first. The command is read-only unless `--register` is supplied:

```bash
./scripts/azure-preflight.sh
./scripts/azure-preflight.sh --register
```

The preloaded Terraform cache in this workspace is read-only. For this session, source `.deployment/session.sh` from `replica-shop` to use the writable cache. Deployment inputs and the SSH key are in that ignored directory. A fresh checkout uses Terraform normally.

Use your authenticated Azure CLI (or Azure Cloud Shell) with Terraform 1.10+. From `replica-shop`:

```bash
# Fail if this subscription has no supported VM in East US; never change region.
eval "$(./scripts/select-vm.sh)"
export ARM_SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
export TF_VAR_ssh_public_key="$(cat ~/.ssh/id_ed25519.pub)"
export TF_VAR_allowed_cidrs='["YOUR.PUBLIC.IP/32"]'
./scripts/bootstrap-backend.sh
terraform -chdir=terraform init -backend-config=../backend.hcl
terraform -chdir=terraform plan -out=azure.tfplan
terraform -chdir=terraform apply azure.tfplan
./scripts/configure-analytics.sh
```

To enable Telegram alerts, open the bot in Telegram and send `/start`. Export the bot token only in the current shell, then run the setup script. If exactly one chat has contacted the bot, the script discovers it automatically; otherwise also export `TELEGRAM_CHAT_ID`.

```bash
read -rsp "Telegram bot token: " TELEGRAM_BOT_TOKEN && export TELEGRAM_BOT_TOKEN
echo
./scripts/configure-telegram.sh
unset TELEGRAM_BOT_TOKEN
```

The script stores both values as Azure Key Vault secrets, restarts the Function App, and sends a test message. The values are not written to the repository, Terraform inputs, plans, or state. Alerts include severity, service, impact, correlated identifiers, cause, payment/item context, recommended action, and an incident-specific Kibana button. Telegram delivery is best-effort: a delivery failure is logged but does not change a checkout response.

## Populate historical charts

After deployment, seed four randomized checkout journeys per day from 1 January
2026 through the current time:

```bash
source .deployment/session.sh
export LOG_INGEST_URL="$(terraform -chdir=terraform output -raw kibana_url)/ingest"
export LOG_INGEST_TOKEN="$(terraform -chdir=terraform output -raw log_ingest_token)"
npm run backfill
unset LOG_INGEST_URL LOG_INGEST_TOKEN
```

Set `BACKFILL_JOURNEYS_PER_DAY` to an integer from 1 to 24 to change density.
`BACKFILL_START`, `BACKFILL_END`, and `BACKFILL_SEED` provide reproducible range
and distribution controls. Historical data is tagged with
`labels.generation: historical`; timer and API traffic uses `live`. The seeder
writes directly to authenticated Logstash, so it does not generate Telegram
notifications.

Terraform creates the reporting branch by default. Set `-var enable_analytics_export=false` to keep only the original ELK demo. The Azure SQL database uses General Purpose serverless compute with a 60-minute auto-pause. Review the current Azure price before applying.

The state backend and ELK VM use East US, the Flex Consumption Function uses East US 2, and Azure SQL uses Central US because this subscription rejected SQL provisioning in East US and East US 2. SKU visibility does not guarantee capacity or quota at deployment time. These locations are project choices, not a guarantee of the lowest price. The $200 credit is not a budget enforced by these files. Check Azure Cost Management; the VM starts daily at 09:00 and auto-shuts down at 23:00 Riyadh time, while managed services, disks, public IP and state storage can continue to incur charges.

## Open Kibana from the internet

```bash
terraform -chdir=terraform output -raw kibana_url
terraform -chdir=terraform output -raw elastic_password
```

Open the HTTPS URL and log in as `elastic` with the generated password. [Caddy](https://caddyserver.com/docs/automatic-https) obtains and renews a public TLS certificate for the VM's Azure DNS hostname. Ports 80 (certificate validation and HTTPS redirect) and 443 are public. Caddy sends `/ingest` to authenticated Logstash and all other paths to Kibana. Kibana port 5601, Elasticsearch, and Logstash are not published directly; SSH accepts only your configured CIDRs. Do not share the administrator password with dashboard viewers; create individual Kibana users if needed.

Wait for bootstrap, then validate **on the Azure VM**:

```bash
ssh azureuser@$(terraform -chdir=terraform output -raw public_ip_address)
sudo cloud-init status --wait
cd /opt/ayn-al-sijill
sudo docker compose -f compose.azure.yaml ps -a
sudo scripts/validate.sh
```

In Kibana, open **Dashboards → AYN AL-SIJILL Operations**. Filter the returned order or trace ID to investigate a checkout. The four views are searchable event tables: MAJLIS, NABD, MASAR and ATHAR.

## Implemented scope

| Capability | Implementation |
| --- | --- |
| Terraform, Bash and Compose on a single Azure VM | Terraform provisions the Azure infrastructure; cloud-init and Compose configure the ELK host. |
| Normal checkout HTTP 201 and Ghost Order HTTP 500 | Explicit Function endpoints provide repeatable demonstrations. |
| Shared order, trace and transaction identifiers | Implemented across the simulated service events. |
| Randomized traffic | The timer selects weighted success, Ghost Order, payment decline, or inventory shortage scenarios. |
| Historical chart data | An idempotent seeder generates the same weighted scenarios from 1 January 2026. |
| Application, Docker and Linux logs | Verified on Azure; rsyslog installed for Linux log files. |
| MAJLIS, NABD, MASAR and ATHAR | Four searchable investigation views are imported into Kibana. |
| Logstash HTTP output to Azure Function to Azure SQL | Deployed and validated in Azure with a unique event read back from SQL. |
| Power BI data source | `dbo.PowerBIIncidentEvents` provides the reporting schema for Power BI Desktop or Service. |
| Telegram incident alerts | Failed checkouts produce a severity-ranked incident card with operational context and a trace-filtered Kibana button. |
| Secrets, persistence and restricted access | Generated credentials, private data ports, HTTPS Kibana and restricted SSH/API. |

The simulator emits synthetic evidence and does not process real customers, payments, or orders. Caddy provides public HTTPS; Nginx is not part of this implementation.

## CI and maintenance

CI checks the application in a hosted runner and validates shell, Compose and Terraform configuration. The manual Azure workflow deploys through Run Command; its GitHub source archive must be public. `scripts/configure-github-oidc.sh OWNER/REPOSITORY` configures the optional GitHub identity. Configure the five secrets it prints in the `azure-demo` environment. The VM remains fixed to East US; `analytics_location` controls the Function and SQL region.

Change `EVENT_SCHEDULE` in the Function App settings to adjust synthetic traffic frequency. On the VM, watch ingestion with `sudo docker compose -f compose.azure.yaml logs -f caddy logstash`.

Remove workload resources with `terraform -chdir=terraform destroy`. This retains the separate state account. Keep `.env`, `backend.hcl`, plans, state and private keys out of Git.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the live endpoint, login retrieval, test results and shutdown commands.

For a team walkthrough, see [TEAM_GUIDE.md](docs/TEAM_GUIDE.md): official references, Bash versus Terraform bootstrap, `.this` notation and demo tradeoffs.
