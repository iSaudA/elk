# Outputs expose values needed after deployment. sensitive hides ordinary CLI display;
# it does not encrypt or remove the password from Terraform state.
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
  value = "http://${module.demo_host.public_ip_address}:3000"
}

output "kibana_url" {
  value = "https://${local.kibana_hostname}"
}

output "elastic_username" {
  value = "elastic"
}

output "elastic_password" {
  value     = random_password.elastic.result
  sensitive = true
}

output "ssh_command" {
  value = "ssh ${var.admin_username}@${module.demo_host.public_ip_address}"
}
