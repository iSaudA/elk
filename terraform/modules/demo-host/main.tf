# Child module: public IP, network rules, VM and nightly shutdown.
# Repeated "this" labels are valid because the resource types differ.
# Reference: https://developer.hashicorp.com/terraform/language/block/resource
resource "azurerm_public_ip" "this" {
  name                = "pip-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = var.domain_name_label
  tags                = var.tags
}

resource "azurerm_network_security_group" "this" {
  name                = "nsg-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_network_interface" "this" {
  name                = "nic-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  ip_configuration {
    name                          = "primary"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.this.id
  }
}

resource "azurerm_network_interface_security_group_association" "this" {
  network_interface_id      = azurerm_network_interface.this.id
  network_security_group_id = azurerm_network_security_group.this.id
}

resource "azurerm_linux_virtual_machine" "this" {
  name                            = var.name
  resource_group_name             = var.resource_group_name
  location                        = var.location
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.this.id]
  custom_data                     = var.custom_data
  tags                            = var.tags

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 128
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }

  boot_diagnostics {}

  depends_on = [azurerm_network_interface_security_group_association.this]

  # First-boot file edits should not replace the running VM. This also means changes
  # to cloud-init/setup are NOT installed by a later terraform apply. Deploy software
  # changes explicitly; host-bootstrap changes need a deliberate update or rebuild.
  # Reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
  lifecycle {
    ignore_changes = [custom_data]
  }
}

# Course cost control: 23:00 Riyadh shutdown. Disks/IP/storage can still cost money.
# Startup is separate because a deallocated VM cannot run its own cron job.
resource "azurerm_dev_test_global_vm_shutdown_schedule" "this" {
  count = var.auto_shutdown_enabled ? 1 : 0

  virtual_machine_id    = azurerm_linux_virtual_machine.this.id
  location              = var.location
  enabled               = true
  daily_recurrence_time = "2300"
  timezone              = "Arab Standard Time"

  notification_settings {
    enabled = false
  }

  tags = var.tags
}

# Only HTTPS and certificate validation/redirects are public.
# Kibana's own port is not published on the host.
resource "azurerm_network_security_rule" "web" {
  name                        = "allow-public-https"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["80", "443"]
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.this.name
}
