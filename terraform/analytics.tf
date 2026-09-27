# Optional reporting branch:
# Logstash HTTPS output -> Azure Function -> Azure SQL reporting.
# The Function package is built by archive_file and deployed explicitly after
# infrastructure creation because Flex Consumption does not expose legacy Kudu.
# External reporting clients can connect to the SQL view after their report is approved.
data "azurerm_client_config" "current" {}

locals {
  operator_principal_object_id = coalesce(
    var.operator_principal_object_id,
    data.azurerm_client_config.current.object_id,
  )
}

resource "random_password" "analytics_ingest_token" {
  count   = var.enable_analytics_export ? 1 : 0
  length  = 32
  special = false
}

resource "random_password" "analytics_sql_admin" {
  count            = var.enable_analytics_export ? 1 : 0
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

data "archive_file" "analytics_function" {
  count       = var.enable_analytics_export ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../function-app"
  output_path = "${path.module}/.analytics-function.zip"
  excludes    = ["test", "test/**", "**/*.test.js"]
}

resource "azurerm_storage_account" "analytics" {
  count                    = var.enable_analytics_export ? 1 : 0
  name                     = "stayn${random_id.dns.hex}"
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  allow_nested_items_to_be_public = false
  tags                            = local.tags
}

resource "azurerm_storage_container" "analytics_function_package" {
  count                 = var.enable_analytics_export ? 1 : 0
  name                  = "function-releases"
  storage_account_id    = azurerm_storage_account.analytics[0].id
  container_access_type = "private"
}

resource "azurerm_service_plan" "analytics" {
  count               = var.enable_analytics_export ? 1 : 0
  name                = "plan-${var.project_name}-analytics"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.analytics_location
  os_type             = "Linux"
  sku_name            = "FC1"
  tags                = local.tags
}

resource "azurerm_mssql_server" "analytics" {
  count                         = var.enable_analytics_export ? 1 : 0
  name                          = "sql-${var.project_name}-${random_id.dns.hex}-${var.analytics_sql_location}"
  resource_group_name           = azurerm_resource_group.this.name
  location                      = var.analytics_sql_location
  version                       = "12.0"
  administrator_login           = "aynsqladmin"
  administrator_login_password  = random_password.analytics_sql_admin[0].result
  minimum_tls_version           = "1.2"
  public_network_access_enabled = true
  tags                          = local.tags
}

resource "azurerm_mssql_database" "analytics" {
  count                       = var.enable_analytics_export ? 1 : 0
  name                        = "sqldb-${var.project_name}-analytics"
  server_id                   = azurerm_mssql_server.analytics[0].id
  sku_name                    = var.analytics_database_sku
  max_size_gb                 = var.analytics_database_max_size_gb
  min_capacity                = 0.5
  auto_pause_delay_in_minutes = var.analytics_database_auto_pause_minutes
  storage_account_type        = "Local"
  zone_redundant              = false
  tags                        = local.tags
}

# Azure Functions and approved reporting clients reach the public SQL endpoint through
# Azure networking. Replace this rule with private endpoints for production.
resource "azurerm_mssql_firewall_rule" "azure_services" {
  count            = var.enable_analytics_export ? 1 : 0
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.analytics[0].id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_key_vault" "analytics" {
  count                         = var.enable_analytics_export ? 1 : 0
  name                          = "kv-ayn-${random_id.dns.hex}"
  resource_group_name           = azurerm_resource_group.this.name
  location                      = azurerm_resource_group.this.location
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  public_network_access_enabled = true
  tags                          = local.tags
}

resource "azurerm_key_vault_access_policy" "deployer" {
  count        = var.enable_analytics_export ? 1 : 0
  key_vault_id = azurerm_key_vault.analytics[0].id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = local.operator_principal_object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Recover"]
}

resource "azurerm_key_vault_access_policy" "automation" {
  count        = var.enable_analytics_export && var.automation_principal_object_id != null ? 1 : 0
  key_vault_id = azurerm_key_vault.analytics[0].id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.automation_principal_object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Recover"]
}

locals {
  analytics_sql_connection_string = var.enable_analytics_export ? join("", [
    "Server=tcp:", azurerm_mssql_server.analytics[0].fully_qualified_domain_name, ",1433;",
    "Initial Catalog=", azurerm_mssql_database.analytics[0].name, ";",
    "Persist Security Info=False;User ID=", azurerm_mssql_server.analytics[0].administrator_login, ";",
    "Password=", random_password.analytics_sql_admin[0].result, ";",
    "MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  ]) : ""
}

resource "azurerm_key_vault_secret" "analytics_sql_connection" {
  count        = var.enable_analytics_export ? 1 : 0
  name         = "analytics-sql-connection"
  value        = local.analytics_sql_connection_string
  key_vault_id = azurerm_key_vault.analytics[0].id

  depends_on = [
    azurerm_key_vault_access_policy.deployer,
    azurerm_key_vault_access_policy.automation,
  ]
}

resource "azurerm_key_vault_secret" "analytics_ingest_token" {
  count        = var.enable_analytics_export ? 1 : 0
  name         = "analytics-ingest-token"
  value        = random_password.analytics_ingest_token[0].result
  key_vault_id = azurerm_key_vault.analytics[0].id

  depends_on = [
    azurerm_key_vault_access_policy.deployer,
    azurerm_key_vault_access_policy.automation,
  ]
}

resource "azurerm_key_vault_secret" "log_ingest_token" {
  count        = var.enable_analytics_export ? 1 : 0
  name         = "log-ingest-token"
  value        = random_password.log_ingest.result
  key_vault_id = azurerm_key_vault.analytics[0].id

  depends_on = [
    azurerm_key_vault_access_policy.deployer,
    azurerm_key_vault_access_policy.automation,
  ]
}

resource "azurerm_function_app_flex_consumption" "analytics" {
  count               = var.enable_analytics_export ? 1 : 0
  name                = local.analytics_function_name
  resource_group_name = azurerm_resource_group.this.name
  location            = var.analytics_location
  service_plan_id     = azurerm_service_plan.analytics[0].id

  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.analytics[0].primary_blob_endpoint}${azurerm_storage_container.analytics_function_package[0].name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.analytics[0].primary_access_key
  runtime_name                = "node"
  runtime_version             = "22"
  maximum_instance_count      = 10
  instance_memory_in_mb       = 2048

  https_only                                     = true
  public_network_access_enabled                  = true
  webdeploy_publish_basic_authentication_enabled = false

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    NODE_ENV               = "production"
    APP_ENV                = "azure-demo"
    EVENT_SCHEDULE         = "0 */2 * * * *"
    KIBANA_PUBLIC_URL      = "https://${local.kibana_hostname}"
    LOG_INGEST_URL         = local.log_ingest_url
    LOG_INGEST_TOKEN       = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.log_ingest_token[0].versionless_id})"
    SHOP_API_TOKEN         = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.log_ingest_token[0].versionless_id})"
    SQL_CONNECTION_STRING  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.analytics_sql_connection[0].versionless_id})"
    ANALYTICS_INGEST_TOKEN = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.analytics_ingest_token[0].versionless_id})"
    TELEGRAM_BOT_TOKEN     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.analytics[0].vault_uri}secrets/telegram-bot-token/)"
    TELEGRAM_CHAT_ID       = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.analytics[0].vault_uri}secrets/telegram-chat-id/)"
  }

  site_config {}

  tags = local.tags
}

resource "azurerm_key_vault_access_policy" "analytics_function" {
  count        = var.enable_analytics_export ? 1 : 0
  key_vault_id = azurerm_key_vault.analytics[0].id
  tenant_id    = azurerm_function_app_flex_consumption.analytics[0].identity[0].tenant_id
  object_id    = azurerm_function_app_flex_consumption.analytics[0].identity[0].principal_id

  secret_permissions = ["Get"]
}
