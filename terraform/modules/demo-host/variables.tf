variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "vm_size" {
  type = string
}

variable "admin_username" {
  type = string
}

variable "ssh_public_key" {
  type = string
}

variable "custom_data" {
  type = string
}

variable "auto_shutdown_enabled" {
  type = bool
}

variable "tags" {
  type = map(string)
}

variable "domain_name_label" {
  type = string
}
