# Replica Shop — AYN AL-SIJILL

Replica Shop is a small commerce simulator for the AYN AL-SIJILL observability project. One Node process simulates checkout, inventory, payment, order and database services. There are no real payments, customers or database writes.

Everything runs on **one Azure Ubuntu VM in East US**. Terraform provisions the host, Bash installs Docker, and Docker Compose starts the application, traffic worker and ELK stack. No local stack is provided. `localhost` in health checks means the Azure VM or its containers.

The worker sends 30 requests per minute, with every twentieth request deliberately producing a Ghost Order: payment succeeds, order creation fails, and the database times out. Every event shares an `order.id`, `trace.id` and `transaction.id`.

## Files to understand first

- `src/server.js`: HTTP endpoints and structured events, with comments explaining the simulation.
- `src/worker.js`: repeatable traffic, including intentional failures.
- `compose.azure.yaml`: service connections, credentials, health checks and persistent storage.
- `logstash/pipeline/logstash.conf` and `filebeat/filebeat.yml`: application, container and Linux log collection.
- `terraform/`: Azure resources, cloud-init bootstrap and a daily startup schedule in `startup.tf`.
- `scripts/validate.sh`: checks normal and Ghost Order responses and required correlated events on Azure.

This is an appropriate course-demo design: one VM, one application process, no Kubernetes, microservice deployment or real payment integration. The existing network module and optional GitHub OIDC workflow are the most advanced parts; they are infrastructure helpers rather than application requirements.

## Deploy on Azure

Register `Microsoft.Compute`, `Microsoft.Network` `Microsoft.Storage`, `Microsoft.DevTestLab` and `Microsoft.Logic` first if this is a new subscription (`az provider register --namespace NAME`).

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
```

The backend and workload both use East US. SKU visibility does not guarantee capacity or quota at deployment time. East US is your chosen default, not a guarantee of the lowest price. The $200 credit is not a budget enforced by these files. Check Azure Cost Management; the VM starts daily at 09:00 and auto-shuts down at 23:00 Riyadh time, while disks, public IP and state storage can continue to incur charges.

## Open Kibana from the internet

```bash
terraform -chdir=terraform output -raw kibana_url
terraform -chdir=terraform output -raw elastic_password
```

Open the HTTPS URL and log in as `elastic` with the generated password. [Caddy](https://caddyserver.com/docs/automatic-https) obtains and renews a public TLS certificate for the VM's Azure DNS hostname. Ports 80 (certificate validation and HTTPS redirect) and 443 are public. Kibana port 5601 is not published; Elasticsearch is bound to the VM loopback interface, and Logstash is internal. SSH and the replica API on port 3000 accept only your configured CIDRs. Do not share the administrator password with dashboard viewers; create individual Kibana users if needed.

Wait for bootstrap, then validate **on the Azure VM**:

```bash
ssh azureuser@$(terraform -chdir=terraform output -raw public_ip_address)
sudo cloud-init status --wait
cd /opt/ayn-al-sijill
sudo docker compose -f compose.azure.yaml ps -a
sudo scripts/validate.sh
```

In Kibana, open **Dashboards → AYN AL-SIJILL Operations**. Filter the returned order or trace ID to investigate a checkout. The four views are searchable event tables: MAJLIS, NABD, MASAR and ATHAR.

## Requirements review

Checked against the repository proposal, with your newer Azure-only and public-Kibana instructions taking precedence:

| Requirement | Review |
| --- | --- |
| Terraform, Bash and Compose on a single Azure VM | Provisioned successfully in East US; destroy-and-rebuild rehearsal remains. |
| Normal checkout HTTP 201 and Ghost Order HTTP 500 | All three app tests and both scenario ingestion checks passed on Azure. |
| Shared order, trace and transaction identifiers | Implemented across the simulated service events. |
| 30 requests/minute, every twentieth request fails | Implemented; request duration now deducted from the interval. |
| Application, Docker and Linux logs | Verified on Azure; rsyslog installed for Linux log files. |
| Nginx logs mentioned in proposal | Not implemented. Caddy handles HTTPS; no Nginx service exists. |
| MAJLIS, NABD, MASAR and ATHAR | Basic saved searches, not complete KPI charts for error rate, latency or value at risk. |
| Secrets, persistence and restricted access | Generated credentials, private data ports, HTTPS Kibana and restricted SSH/API. |
| Rebuild, ingestion, saved-object import and demonstration | Ingestion and saved-object import passed on Azure; full clean rebuild remains. |

Keep the saved searches for an understandable first demo. Add KPI charts only when preparing the final presentation. The simulator emits synthetic evidence and does not reproduce real database or payment failures.

## CI and maintenance

CI checks the application in a hosted runner and validates shell, Compose and Terraform configuration. The manual Azure workflow deploys through Run Command; its GitHub source archive must be public. `scripts/configure-github-oidc.sh OWNER/REPOSITORY` configures the optional GitHub identity. Configure the five secrets it prints in the `azure-demo` environment. East US is the only accepted region.

On the Azure VM, change traffic values in `/opt/ayn-al-sijill/.env`, then run `sudo docker compose -f compose.azure.yaml up -d`. Watch logs with `sudo docker compose -f compose.azure.yaml logs -f replica-app traffic-worker`.

Remove workload resources with `terraform -chdir=terraform destroy`. This retains the separate state account. Keep `.env`, `backend.hcl`, plans, state and private keys out of Git.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the live endpoint, login retrieval, test results and shutdown commands.

For a team walkthrough, see [TEAM_GUIDE.md](docs/TEAM_GUIDE.md): official references, Bash versus Terraform bootstrap, `.this` notation and demo tradeoffs.
