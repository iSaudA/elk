# Terraform CI/CD

GitHub Actions provides the build trigger, logs, approval gate and deployment
history for this GitHub-hosted Azure project. Azure authentication uses GitHub
OIDC and a user-assigned managed identity; no Azure client secret is stored in
GitHub.

## Pipeline

`terraform-ci.yml` runs on pull requests and pushes to `main`. It does not receive
an Azure identity. It installs the Function dependencies, runs the Node tests,
checks shell syntax, checks Terraform formatting, initializes without a backend,
validates Terraform and validates the Compose configuration.

`terraform-deploy.yml` runs after relevant deployment files reach `main` or when
started manually. It:

1. authenticates to Azure with OIDC;
2. creates a saved plan against the Azure Blob backend;
3. publishes a summary containing resource addresses and actions, but no values;
4. blocks delete and replacement actions unless a manual run explicitly allows them;
5. stores the exact plan and Function package for one day;
6. waits at the protected `azure-dev` GitHub environment;
7. applies the saved plan, publishes the Function, and runs end-to-end validation.

Only one Azure deployment can run at a time. Pull-request code never receives an
Azure token; the first cloud-authenticated job runs only from the merged `main`
revision.

## One-time setup

Prerequisites:

- the project and remote state have already been deployed once with `./deploy.sh`;
- the operator is signed into the intended subscription with Azure CLI;
- GitHub CLI is authenticated with permission to manage repository variables and environments;
- the operator can create a managed identity and role assignments;
- the SSH public key used by the deployed VM is available locally.

Run from the repository root:

```bash
./scripts/setup-github-actions.sh OWNER/REPOSITORY ~/.ssh/ayn-al-sijill.pub
```

If the default key path is absent, the script reuses the public key, location
and VM size from the ignored `.deployment/inputs.json` created by `deploy.sh`.

If the deployed VM uses a size other than `Standard_D4s_v7`, provide it explicitly:

```bash
AYN_VM_SIZE=Standard_D4as_v5 \
  ./scripts/setup-github-actions.sh OWNER/REPOSITORY ~/.ssh/ayn-al-sijill.pub
```

The script is idempotent. It creates a user-assigned identity in the state
resource group, creates branch- and environment-bound federated credentials,
grants it workload deployment and state access, adds its managed Key Vault
policy, creates the GitHub environment, and sets the required repository
variables. `TERRAFORM_CICD_ENABLED` is written last, so the deployment workflow
stays safely skipped if bootstrap does not finish.

It grants these roles:

| Scope | Role | Reason |
| --- | --- | --- |
| Workload resource group | Contributor | Manage workload resources and run post-deployment commands |
| Workload resource group | Role Based Access Control Administrator | Manage the VM-start custom role and assignment |
| State storage account | Storage Blob Data Contributor | Read, lock and update Terraform state |

No subscription-wide role is granted. The automation identity lives in the
separate state resource group, so destroying the workload does not delete the
identity required to recreate it.

## Required GitHub settings

The script cannot choose your reviewers. In repository settings:

1. Open **Environments > azure-dev**.
2. Add at least one required reviewer and enable prevention of self-review.
3. Restrict deployment branches to `main`.
4. Protect `main` with pull requests and require the
   **Validate infrastructure and application** status check.

The protected branch is important: the post-merge plan job has the same Azure
identity used by the approved apply job. Pull-request workflows deliberately
have read-only repository permissions and no OIDC permission.

## Operations

A normal change goes through a pull request into `main`. After merge, inspect the
plan summary and approve the `azure-dev` deployment. A plan with a delete or
replacement fails before approval. For an intentional destructive change, run
the deployment workflow manually from `main` with **allow_destroy** enabled.

Never commit or paste a saved plan. The binary plan and Terraform state can
contain generated passwords and tokens even when the normal CLI display redacts
them. The workflow artifact expires after one day.
