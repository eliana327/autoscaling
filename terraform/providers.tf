terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Proyecto     = var.project_name
      Entorno      = var.environment
      Gestion      = "Terraform"
      Arquitectura = "AutoScaling-ALB"
      Capa         = "FreeTier"
    }
  }
}
