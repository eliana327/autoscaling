terraform {
  backend "s3" {
    bucket         = "citas-escolares-tf-state-us-east-1"
    key            = "autoscaling/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "citas-escolares-tf-locks"
    encrypt        = true
  }
}
