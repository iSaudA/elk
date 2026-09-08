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
  sensitive   = true
}

variable "allowed_cidrs" {
  description = "Public IPv4/IPv6 CIDRs allowed to reach SSH and Replica Shop."
  type        = list(string)

  validation {
    condition = (
      length(var.allowed_cidrs) > 0 &&
      alltrue([for cidr in var.allowed_cidrs : can(cidrhost(cidr, 0))]) &&
      !contains(var.allowed_cidrs, "0.0.0.0/0") &&
      !contains(var.allowed_cidrs, "::/0")
    )
    error_message = "Provide at least one valid, restricted CIDR. Public 0.0.0.0/0 and ::/0 are not accepted."
  }
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
