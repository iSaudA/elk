# Project choice: a Consumption Logic App requests VM startup daily at 09:00 Riyadh.
# Reference: https://learn.microsoft.com/en-us/azure/connectors/connectors-native-recurrence
# Recommended principle: restrict this identity to the actions and VM it needs.
# Reference: https://learn.microsoft.com/en-us/azure/logic-apps/authenticate-with-managed-identity
# Reference: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
# This small Azure-hosted workflow keeps working when the VM is deallocated.
# Its identity can only read and start this VM; no passwords are stored here.
resource "azurerm_logic_app_workflow" "startup" {
  name                = "start-${var.project_name}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  identity {
    type = "SystemAssigned"
  }
  tags = local.tags
}

resource "azurerm_role_definition" "vm_starter" {
  name        = "${var.project_name}-vm-starter"
  scope       = azurerm_resource_group.this.id
  description = "Read and start the Replica Shop VM."
  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/start/action",
    ]
  }
  assignable_scopes = [azurerm_resource_group.this.id]
}

resource "azurerm_role_assignment" "vm_starter" {
  scope              = module.demo_host.vm_id
  role_definition_id = azurerm_role_definition.vm_starter.role_definition_resource_id
  principal_id       = azurerm_logic_app_workflow.startup.identity[0].principal_id
  principal_type     = "ServicePrincipal"
}

# jsonencode builds the HTTP action definition as JSON without manual escaping.
# Successful acceptance of the start request is not an application health check.
resource "azurerm_logic_app_action_custom" "start_vm" {
  name         = "Start_VM"
  logic_app_id = azurerm_logic_app_workflow.startup.id
  body = jsonencode({
    type = "Http"
    inputs = {
      method = "POST"
      uri    = "https://management.azure.com${module.demo_host.vm_id}/start?api-version=2024-07-01"
      authentication = {
        type     = "ManagedServiceIdentity"
        audience = "https://management.azure.com/"
      }
      retryPolicy = { type = "exponential", count = 4, interval = "PT10S" }
    }
    # Azure accepts the start request asynchronously; Docker then starts on boot.
    operationOptions = "DisableAsyncPattern"
    runAfter         = {}
  })
}

# Remember the first run date, so later applies don't move it forward.
# terraform_data stores a value in state; it does not create another Azure service.
# 27 hours = one day plus Riyadh's UTC+3 offset, to choose tomorrow's local date.
resource "terraform_data" "startup_anchor" {
  input = formatdate("YYYY-MM-DD'T'09:00:00", timeadd(plantimestamp(), "27h"))
  lifecycle {
    ignore_changes = [input]
  }
}

resource "azurerm_logic_app_trigger_custom" "morning" {
  name         = "Every_day_at_9"
  logic_app_id = azurerm_logic_app_workflow.startup.id
  body = jsonencode({
    type = "Recurrence"
    recurrence = {
      frequency = "Day"
      interval  = 1
      timeZone  = "Arab Standard Time"
      # Azure requires a local start time without Z when using a named timezone.
      startTime = terraform_data.startup_anchor.output
      schedule  = { hours = [9], minutes = [0] }
    }
  })
  depends_on = [azurerm_role_assignment.vm_starter, azurerm_logic_app_action_custom.start_vm]
}

output "startup_workflow_id" {
  value = azurerm_logic_app_workflow.startup.id
}
