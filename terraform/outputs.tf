# Demo convenience: generated credentials are intentionally visible in CLI outputs.
# Production should remove nonsensitive(), mark secret outputs sensitive, and prefer managed identities or Key Vault.
output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "vm_name" {
  value = module.demo_host.vm_name
}

output "public_ip_address" {
  value = module.demo_host.public_ip_address
}

output "app_url" {
  value = var.enable_analytics_export ? local.shop_function_url : null
}

output "kibana_url" {
  value = "https://${local.kibana_hostname}"
}

output "kibana_dashboard_url" {
  value = "https://${local.kibana_hostname}/app/dashboards#/view/ayn-al-sijill-operations"
}

output "elastic_username" {
  value = "elastic"
}

output "elastic_password" {
  value = nonsensitive(random_password.elastic.result)
}

output "analytics_function_name" {
  value = var.enable_analytics_export ? azurerm_function_app_flex_consumption.analytics[0].name : null
}

output "analytics_storage_account_name" {
  value = var.enable_analytics_export ? azurerm_storage_account.analytics[0].name : null
}

output "analytics_key_vault_name" {
  value = var.enable_analytics_export ? azurerm_key_vault.analytics[0].name : null
}

output "analytics_ingest_url" {
  value = var.enable_analytics_export ? local.analytics_ingest_url : null
}

output "analytics_ingest_token" {
  value = nonsensitive(var.enable_analytics_export ? random_password.analytics_ingest_token[0].result : null)
}

output "log_ingest_token" {
  value = nonsensitive(random_password.log_ingest.result)
}

output "analytics_sql_server" {
  value = var.enable_analytics_export ? azurerm_mssql_server.analytics[0].fully_qualified_domain_name : null
}

output "analytics_sql_database" {
  value = var.enable_analytics_export ? azurerm_mssql_database.analytics[0].name : null
}

output "analytics_sql_admin_login" {
  value = var.enable_analytics_export ? azurerm_mssql_server.analytics[0].administrator_login : null
}

output "analytics_sql_admin_password" {
  value = nonsensitive(var.enable_analytics_export ? random_password.analytics_sql_admin[0].result : null)
}
