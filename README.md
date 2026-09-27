# AYN AL-SIJILL

AYN AL-SIJILL is an Azure observability demo for a synthetic commerce system. It generates successful and failed checkout journeys, correlates their events in Elasticsearch, presents investigations in Kibana, and copies reporting data to Azure SQL. Optional Telegram alerts report incidents.

The project uses generated data only. It does not process real customers, orders, cards, or payments.

## What gets deployed

| Component | Purpose |
| --- | --- |
| Azure Functions | Generates checkout journeys and exposes the reporting API |
| Azure VM with Caddy, Logstash, Elasticsearch, Kibana, and Filebeat | Receives, stores, and presents operational events and host logs |
| Azure SQL | Stores a queryable reporting copy |
| Azure Key Vault | Stores runtime and optional Telegram credentials |
| Logic App and shutdown schedule | Starts the VM at 09:00 and deallocates it at 23:00 Riyadh time |
| Azure Blob Storage | Holds the remote Terraform state with locking |

Public traffic uses HTTPS. Kibana requires a login, and port 22 is not exposed. VM administration and validation use Azure Run Command.

## Deploy from a fresh Azure subscription

The only Azure assumption is that the Azure CLI is authenticated and the intended subscription is selected. Terraform uses that CLI session.

Required tools: Azure CLI, Terraform 1.10 or later, `jq`, `curl`, OpenSSH, Node.js 22 with npm, and standard GNU command-line tools. WSL and Azure Cloud Shell are supported.

```bash
az account show --query '{name:name,id:id,tenant:tenantId}' -o table
./deploy.sh
```

`deploy.sh` prepares account-specific inputs, registers Azure providers, creates or reconnects the remote state backend, installs and tests the Function package, checks the Terraform plan, deploys the infrastructure, publishes the Function, validates the full Azure path, loads the historical dashboard baseline, and prints the endpoints and credentials.

The script blocks any plan containing a delete or replacement unless you explicitly approve it:

```bash
ALLOW_DESTROY=true ./deploy.sh
```

Other optional controls are `PLAN_ONLY=true`, `SKIP_TESTS=true`, and `SKIP_BACKFILL=true`.

For Telegram alerts, export the external bot token before deployment. If it is absent, the rest of the deployment still completes.

```bash
read -rsp "Telegram bot token: " TELEGRAM_BOT_TOKEN && export TELEGRAM_BOT_TOKEN
echo
./deploy.sh
unset TELEGRAM_BOT_TOKEN
```

In Azure Cloud Shell, upload and extract the submission ZIP, enter the extracted directory, confirm `az account show`, and run `./deploy.sh`.

Azure permissions, quota, and regional service availability still apply. The signed-in identity must be able to create resources, register providers, and create the VM startup role assignment. Owner access is the simplest choice for a disposable demo subscription.

## Find the deployed URLs and credentials

The deployment prints every Terraform output at the end. You can display them again with:

```bash
source .deployment/session.sh
terraform -chdir=terraform output
```

Open `kibana_dashboard_url` and sign in with `elastic_username` and `elastic_password`. The complete output inventory is documented in [DEPLOYMENT.md](DEPLOYMENT.md#post-deployment-outputs).

This repository deliberately displays generated credentials in Terraform output because it is a short-lived development demo. For production, remove the `nonsensitive()` calls, mark secret outputs sensitive, use managed identities where possible, and store application secrets in Key Vault. Terraform state always contains generated secrets and must remain private.

## Local checks

The application does not run locally. These commands validate its code and configuration:

```bash
npm test
make validate
```

`make validate` requires Docker and Terraform. The application tests require Node.js 22 or later.

## More detail

- [DEPLOYMENT.md](DEPLOYMENT.md): operations, validation, output inventory, Telegram, backfill, and teardown
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): components and data flow
- [docs/EVENTS.md](docs/EVENTS.md): event and failure-scenario catalogue
- [docs/TEAM_GUIDE.md](docs/TEAM_GUIDE.md): infrastructure decisions and tradeoffs
