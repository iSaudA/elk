# Provider constraints select compatible plugins; .terraform.lock.hcl records selections.
# The backend is initialized before resources, so its storage must already exist.
# Reference: https://developer.hashicorp.com/terraform/language/backend/azurerm
terraform {
  required_version = ">= 1.10, < 2.0"

  backend "azurerm" {}

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.12"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

provider "azurerm" {
  # Register only the services this demo uses; avoid unrelated subscription changes.
  resource_provider_registrations = "none"
  features {}
}

provider "azapi" {}
