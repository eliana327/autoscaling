resource "aws_s3_bucket" "web_assets" {
  bucket_prefix = "${var.project_name}-web-"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "web_assets" {
  bucket                  = aws_s3_bucket.web_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "web_index" {
  bucket       = aws_s3_bucket.web_assets.id
  key          = "index.html"
  source       = "${path.module}/../web/index.html"
  etag         = filemd5("${path.module}/../web/index.html")
  content_type = "text/html"
}

resource "aws_s3_object" "web_styles" {
  bucket       = aws_s3_bucket.web_assets.id
  key          = "styles.css"
  source       = "${path.module}/../web/styles.css"
  etag         = filemd5("${path.module}/../web/styles.css")
  content_type = "text/css"
}

resource "aws_s3_object" "web_app" {
  bucket       = aws_s3_bucket.web_assets.id
  key          = "app.js"
  source       = "${path.module}/../web/app.js"
  etag         = filemd5("${path.module}/../web/app.js")
  content_type = "application/javascript"
}

resource "aws_iam_role" "web_ec2" {
  name = "${var.project_name}-web-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "web_ec2_s3_read" {
  name = "${var.project_name}-web-s3-read"
  role = aws_iam_role.web_ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.web_assets.arn}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "web_ec2" {
  name = "${var.project_name}-web-ec2-profile"
  role = aws_iam_role.web_ec2.name
}