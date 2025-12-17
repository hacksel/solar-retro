provider "aws" {
  region = "eu-west-1" # Change as needed
}

resource "aws_dynamodb_table" "solar_retro_decorations" {
  name           = "SolarRetroDecorations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "RoomID"
  range_key      = "DecorationID"

  attribute {
    name = "RoomID"
    type = "S"
  }

  attribute {
    name = "DecorationID"
    type = "S"
  }

  tags = {
    Name        = "SolarRetroDecorations"
    Environment = "production"
  }
}
