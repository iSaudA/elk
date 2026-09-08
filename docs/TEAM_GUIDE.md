# Explaining our Terraform and Bash choices

Our presentation explanation:

> Bash prepares the shared state storage. Terraform provisions Azure infrastructure. Cloud-init prepares the VM on first boot. Docker Compose runs the application and logging stack. Terraform handles state locking automatically.

The comments in each file explain the nearby decision and link to official documentation. A reference explains a mechanism; it does not certify our entire implementation as best practice.

## State storage: why a Bash bootstrap?

The backend must exist before `terraform init` can use it. Our `scripts/bootstrap-backend.sh` creates an Azure resource group, storage account and private blob container, then writes the backend configuration. Microsoft documents both Azure CLI and Terraform ways to do this. We chose CLI to avoid a second Terraform configuration and state lifecycle for this small course project. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/developer/terraform/get-started/store-state-in-azure-storage).

A separate Terraform bootstrap is also valid. It tracks backend resource changes, but needs its own initial state location. Our Bash-created storage is outside the main Terraform state: it survives workload destruction, and Terraform does not detect its configuration drift. The script checks whether the account exists; it does not reconcile all settings on repeat runs.

The backend stores Terraform's infrastructure record, not application logs. Azure calls the bucket-like location a blob container. Our application logs live in Elasticsearch. The Azure backend provides state locking using Blob Storage capabilities, so we have no custom locking script or separate lock database. [HashiCorp Azure backend](https://developer.hashicorp.com/terraform/language/backend/azurerm).

Authentication is a separate decision from Bash versus Terraform. We currently use a storage access key. HashiCorp recommends Microsoft Entra ID for the Azure backend. The generated `backend.hcl`, backend cache, plans and state must remain private; `sensitive = true` hides normal display but does not remove a value from state. These are demo limitations to explain accurately, not practices to label universally best.

## What does `.this` mean?

Take the actual reference `azurerm_resource_group.this.name`:

| Part | Meaning |
| --- | --- |
| `azurerm_resource_group` | Terraform resource type |
| `this` | A local label chosen by the author |
| `name` | An attribute of that resource |

`this` is not a special Terraform keyword. It is separate from the Azure resource's real name, such as `rg-ayn-sijill`. The same notation works with GCP, for example `google_compute_instance.web.name`. [Resource reference](https://developer.hashicorp.com/terraform/language/block/resource).

For a new team project, descriptive labels such as `demo` or `host` can be easier to discuss than `this`. A module containing one resource of each type can still reasonably use `this`. There is no Azure-versus-GCP difference here. We kept the existing labels during this documentation pass because they already identify resources in deployed state. Any future rename should use Terraform's `moved` block and a reviewed plan to preserve the resource identity. [Terraform refactoring](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring).

Other notation used here:

- `var.location`: an input, supplied by a default, environment variable or variables file.
- `local.kibana_hostname`: a value calculated for reuse in this module.
- `module.demo_host.vm_id`: an output from the child module.
- `path.module`: the directory containing the current module's configuration.
- `for_each`: creates one resource per map entry, such as SSH and app access rules.
- `jsonencode(...)`: turns Terraform values into JSON for the Azure workflow API.

## Why these files and modules?

Terraform reads all `.tf` files in a module together; filenames do not set execution order. `main.tf` connects resources, `variables.tf` defines inputs, `outputs.tf` exposes results, and `startup.tf` groups the startup workflow. References establish dependencies. [HashiCorp style guide](https://developer.hashicorp.com/terraform/language/style).

Our `./modules/demo-host` is source code in this repository. Its resources run in Azure. The external Azure Verified Module creates the virtual network. Using that module is our reuse choice; native AzureRM network resources would also be valid and may be easier for a beginner team to inspect. We do not need more module layers for this project.

For a GCP comparison, the backend changes from `azurerm` to `gcs` and the resource types change to `google_*`. The ideas of inputs, outputs, resource labels and modules remain the same. The GCS backend also requires an existing bucket and supports locking. This is a general comparison; the specific GitHub GCP project has not yet been identified. [HashiCorp GCS backend](https://developer.hashicorp.com/terraform/language/backend/gcs), [Google's Terraform structure guide](https://docs.cloud.google.com/docs/terraform/best-practices/general-style-structure).

## The less obvious implementation choices

| Choice | Simple explanation | Classification |
| --- | --- | --- |
| Cloud-init | Installs software on the VM's first boot | Azure-supported provisioning mechanism |
| `ignore_changes = [custom_data]` | Avoids replacing the VM whenever bootstrap text changes; later edits are not installed automatically | Project lifecycle tradeoff |
| Compose health checks | Waits for dependencies to be ready and setup jobs to succeed | Documented readiness mechanism |
| One VM and simulated services | Makes the demo affordable and explainable; no real commerce database or payments | Demo scope, not high availability |
| Generated credentials in state/custom data | Makes initial setup self-contained; base64 encoding does not protect them | Demo credential-management limitation |
| Logic App startup | A separate Azure service can start a powered-off VM using narrowly scoped permissions | Project schedule choice |
| GitHub OIDC | Allows GitHub to request Azure access without storing a client password | Optional automation mechanism |

References: [cloud-init](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init), [Terraform lifecycle](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle), [Compose readiness](https://docs.docker.com/compose/how-tos/startup-order/), [managed identities](https://learn.microsoft.com/en-us/azure/logic-apps/authenticate-with-managed-identity), [GitHub OIDC](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect).

The optional GitHub identity script currently grants subscription Contributor. That role is broad but cannot create the custom role/assignment in `startup.tf`. Some setup errors are also suppressed by `|| true`. The authenticated CLI deployment was tested; do not present the entire GitHub deployment route as validated. An administrator must review its permissions before it is used for the full deployment. [Contributor permissions](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#contributor).

## Bash expressions the team should know

- `set -euo pipefail`: helps catch failed commands, missing variables and failures inside pipelines. Explicit error handling can override it.
- `$(command)`: uses the command's output as a value.
- `if ...; then ...; fi`: runs a block only when its condition succeeds.
- `<<EOF ... EOF`: writes several lines as one block of text.
- `umask 077`: restricts permissions on newly created files.
- `>&2`: writes a progress/error message separately from machine-readable output.

The subscription hash is just a repeatable suffix for a globally unique storage account name. It is not password hashing. In the remote deployment script, escaped dollar signs preserve variables for evaluation on the Azure VM.

Start the team walkthrough with the backend script, root Terraform files, cloud-init and Compose. Explain the OIDC helper and startup identity afterwards as supporting automation.
