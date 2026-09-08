output "vm_name" {
  value = azurerm_linux_virtual_machine.this.name
}

output "vm_id" {
  value = azurerm_linux_virtual_machine.this.id
}

output "public_ip_address" {
  value = azurerm_public_ip.this.ip_address
}
