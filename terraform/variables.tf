variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-1"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "solar-retro"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
