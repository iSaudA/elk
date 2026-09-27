# Inputs describe the deployment. Validation catches unsupported values before creation.
# East US and the nightly schedule are user choices, not universal Terraform defaults.
variable "project_name" {
  description = "Short name used for Azure resources."
  type        = string
  default     = "ayn-sijill"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,20}$", var.project_name))
    error_message = "Use 3-20 lowercase letters, numbers or hyphens."
  }
}

variable "location" {
  description = "Azure region; this demo stays in East US."
  type        = string
  default     = "eastus"
  validation {
    condition     = var.location == "eastus"
    error_message = "This demo only deploys to East US (eastus)."
  }
}

variable "vm_size" {
  description = "An unrestricted 4-vCPU/16-GiB VM SKU."
  type        = string
  default     = "Standard_D4as_v5"
}

variable "admin_username" {
  description = "Linux administrator account."
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "OpenSSH public key used for the VM."
  type        = string
}

variable "operator_principal_object_id" {
  description = "Optional Microsoft Entra object ID for the human break-glass operator. Defaults to the identity running Terraform."
  type        = string
  default     = null
  nullable    = true
}

variable "automation_principal_object_id" {
  description = "Optional Microsoft Entra object ID used by CI/CD. When set, it receives the Key Vault permissions needed by Terraform and deployment scripts."
  type        = string
  default     = null
  nullable    = true
}

variable "auto_shutdown_enabled" {
  description = "Shut down the demo VM every night to protect the trial credit."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra Azure tags."
  type        = map(string)
  default     = {}
}

variable "enable_analytics_export" {
  description = "Provision the Azure Functions shop simulator and Logstash-to-Azure-SQL reporting branch."
  type        = bool
  default     = true
}

variable "analytics_location" {
  description = "Azure region for the Function compute resources."
  type        = string
  default     = "eastus2"
}

variable "analytics_sql_location" {
  description = "Azure region for the SQL reporting database when the primary project region restricts SQL provisioning."
  type        = string
  default     = "centralus"
}

variable "analytics_database_sku" {
  description = "Azure SQL serverless SKU used by the reporting branch."
  type        = string
  default     = "GP_S_Gen5_1"
}

variable "analytics_database_max_size_gb" {
  description = "Maximum Azure SQL database size for reporting data."
  type        = number
  default     = 32
}

variable "analytics_database_auto_pause_minutes" {
  description = "Idle time before the serverless reporting database pauses."
  type        = number
  default     = 60

  validation {
    condition     = var.analytics_database_auto_pause_minutes == -1 || var.analytics_database_auto_pause_minutes >= 60
    error_message = "Use -1 to disable auto-pause, or at least 60 minutes."
  }
}
