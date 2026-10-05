# Infrastructure decisions

## One VM for the Elastic Stack

Elasticsearch, Logstash, Kibana, Filebeat, and Caddy run in Docker Compose on one Azure VM. This keeps the demo affordable and gives the team one environment to operate. The VM is a single point of failure; this deployment does not provide high availability.

## Serverless checkout and reporting

Azure Functions generates synthetic checkout journeys and exposes the reporting API. Shared order, transaction, and trace IDs connect each journey across services. Elasticsearch holds the investigation data; Azure SQL holds a structured reporting copy. Payment authorization and order failures are simulated.

## HTTPS access and VM administration

Caddy handles public HTTPS and authentication. Elastic service ports remain inside the deployment, and port 22 is not exposed. Deployment scripts use Azure Run Command for configuration and validation.

## Remote Terraform state

Azure Blob Storage provides shared state and locking. The backend is created separately from the workload so workload teardown preserves the state account. Generated passwords and tokens remain in Terraform state even when CLI output marks them sensitive. Access to the backend must be restricted.

## Configuration after first boot

Cloud-init initializes the VM. Later updates use `scripts/configure-analytics.sh` to synchronize the Compose stack, service configuration, Kibana saved objects, and operational scripts. It applies the stack and imports the dashboard objects so a code update reaches the existing VM.

## Scheduled runtime

A Logic App starts the VM at 09:00 Riyadh time. Its managed identity can read and start this VM. Azure VM auto-shutdown deallocates it at 23:00. Running the startup schedule outside the VM allows it to resume a deallocated machine.

## Deployment approvals

GitHub Actions uses Azure OIDC for deployment authentication. A saved Terraform plan passes through the protected deployment environment before apply. Delete and replacement actions require an explicit operator override. Deployment remains enabled separately from pull-request validation.
