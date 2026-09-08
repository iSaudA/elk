# Root module: connects network, host and the initial cloud-init application files.
# A resource address is TYPE.LABEL. Here "this" is an ordinary local label, not a keyword.
# Example: azurerm_resource_group.this.name reads its Azure name attribute.
# Reference: https://developer.hashicorp.com/terraform/language/block/resource
# Team choices and notation are explained in ../docs/TEAM_GUIDE.md.
# Unique Azure DNS name for the public HTTPS endpoint.
resource "random_id" "dns" { byte_length = 4 }

resource "azurerm_resource_group" "this" {
  name     = "rg-${var.project_name}"
  location = var.location
  tags     = local.tags
}

resource "random_password" "elastic" {
  length  = 24
  special = false
}

resource "random_password" "kibana" {
  length  = 24
  special = false
}

resource "random_password" "logstash" {
  length  = 24
  special = false
}

# local.* values are computed once for reuse; var.* values are configuration inputs.
locals {
  kibana_hostname = "${var.project_name}-${random_id.dns.hex}.${var.location}.cloudapp.azure.com"

  tags = merge({
    project     = "AYN AL-SIJILL"
    environment = "demo"
    managed-by  = "terraform"
  }, var.tags)

  subnet_name = "snet-${var.project_name}"

  # Embed the first release so provisioning does not depend on a published GitHub repo.
  # Base64 is transport encoding, not encryption. Generated secrets are held in state.
  # Subsequent application updates use scripts/deploy-azure.sh.
  cloud_init = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    kibana_hostname   = local.kibana_hostname
    caddyfile         = base64encode(file("${path.module}/../Caddyfile"))
    elastic_password  = random_password.elastic.result
    kibana_password   = random_password.kibana.result
    logstash_password = random_password.logstash.result
    compose           = base64encode(file("${path.module}/../compose.azure.yaml"))
    dockerfile        = base64encode(file("${path.module}/../Dockerfile"))
    package_json      = base64encode(file("${path.module}/../package.json"))
    server_js         = base64encode(file("${path.module}/../src/server.js"))
    server_test       = base64encode(file("${path.module}/../test/server.test.js"))
    worker_js         = base64encode(file("${path.module}/../src/worker.js"))
    logstash          = base64encode(file("${path.module}/../logstash/pipeline/logstash.conf"))
    filebeat          = base64encode(file("${path.module}/../filebeat/filebeat.yml"))
    kibana_objects    = base64encode(file("${path.module}/../kibana/objects.ndjson"))
    setup_script      = base64encode(file("${path.module}/../scripts/setup.sh"))
    validate_script   = base64encode(file("${path.module}/../scripts/validate.sh"))
  })
}

# Project choice: reuse an Azure Verified Module for the VNet/subnet.
# A few native azurerm resources would also be valid and may be easier to teach.
# The version pin keeps module upgrades deliberate; it is not a claim of cheapest design.
module "network" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "0.17.1"

  name             = "vnet-${var.project_name}"
  location         = azurerm_resource_group.this.location
  parent_id        = azurerm_resource_group.this.id
  address_space    = ["10.20.0.0/16"]
  enable_telemetry = false
  tags             = local.tags

  subnets = {
    demo = {
      name             = local.subnet_name
      address_prefixes = ["10.20.1.0/24"]
    }
  }
}

# A child module groups the VM resources. "Local module" means code in this repo;
# its resources still run in Azure. Outputs connect it to the startup workflow.
module "demo_host" {
  source = "./modules/demo-host"

  name                  = "vm-${var.project_name}"
  resource_group_name   = azurerm_resource_group.this.name
  location              = azurerm_resource_group.this.location
  subnet_id             = "${module.network.resource_id}/subnets/${local.subnet_name}"
  vm_size               = var.vm_size
  admin_username        = var.admin_username
  ssh_public_key        = var.ssh_public_key
  allowed_cidrs         = var.allowed_cidrs
  domain_name_label     = "${var.project_name}-${random_id.dns.hex}"
  custom_data           = base64encode(local.cloud_init)
  auto_shutdown_enabled = var.auto_shutdown_enabled
  tags                  = local.tags
}
