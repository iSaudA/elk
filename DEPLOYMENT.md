# Azure demo deployment

Created on 6 September 2026 in **East US**, using `Standard_D4s_v7` (4 vCPU, 16 GiB). The existing v5/B4ms candidates were restricted for this subscription. Microsoft's retail API quoted **$0.265/hour for Linux compute**, excluding disk, public IP and state storage. Daily startup is scheduled for 09:00 and nightly shutdown for 23:00 Riyadh time. Startup runs in an Azure Consumption Logic App, using a managed identity permitted only to read/start this VM. The first scheduled start is 7 September 2026 at 09:00 Riyadh time.

- Resource group: `rg-ayn-sijill`
- VM: `vm-ayn-sijill`
- Kibana: https://ayn-sijill-bc9bc4dc.eastus.cloudapp.azure.com
- Replica API: http://172.191.53.102:3000 (restricted to the deployment machine's public IP)
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
sudo docker compose -f compose.azure.yaml run --rm --no-deps replica-app node --test
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
- Three Node application tests passed inside an Azure container.
- Normal checkout returned HTTP 201; Ghost Order returned HTTP 500. Both produced every required event with matching order and trace IDs in Elasticsearch.
- Kibana saved-object import exited successfully and the Operations dashboard was retrieved through authenticated public HTTPS.
- Linux and Docker ingestion were confirmed (4,143 and 1,071 indexed events at check time).
- Public login returned HTTP 200 with a valid TLS certificate; HTTP redirected to HTTPS with 308. The dashboard API returned 401 without credentials.
- No application or Elastic stack was run on the local machine.

Remaining proposal work: KPI visualizations, Nginx logs if still required, and a destroy-and-rebuild rehearsal. The VM is left running for access and will shut down at its scheduled time. With a 09:00–23:00 schedule, 14 hours of compute costs about $3.71/day at the quoted rate, excluding other charges. Allow a few minutes after startup for Kibana to become ready.


To pause automatic startup while keeping the VM available for manual use:

```bash
az resource update --resource-group rg-ayn-sijill --name start-ayn-sijill \
  --resource-type Microsoft.Logic/workflows --set properties.state=Disabled
# Use properties.state=Enabled to resume the schedule.
```

A later Terraform apply restores the configured enabled state. Disabling the startup schedule does not turn off a currently running VM; use the deallocate command above for that.
