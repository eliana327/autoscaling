# ==============================================================================
# LAUNCH TEMPLATE Y AUTO SCALING GROUP (1 A 4 INSTANCIAS T3.MICRO)
# ==============================================================================

# Obtener la AMI mÃ¡s reciente de Amazon Linux 2023
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Plantilla de Lanzamiento (Launch Template) para instancias t3.micro
resource "aws_launch_template" "asg_lt" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.ec2_sg.id]
  }

  # Soporte de Metadata IMDSv2 e IMDSv1
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "optional"
    http_put_response_hop_limit = 2
  }

  # Disco EBS de 20 GB (Capa Gratuita incluye hasta 30 GB)
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  # InyecciÃ³n del script de arranque decodificando los archivos web en Base64
  iam_instance_profile {
    name = aws_iam_instance_profile.web_ec2.name
  }
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    bucket_name       = aws_s3_bucket.web_assets.bucket
    base64_index_html = filebase64("${path.module}/../web/index.html")
    base64_styles_css = filebase64("${path.module}/../web/styles.css")
    base64_app_js     = filebase64("${path.module}/../web/app.js")
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name     = "${var.project_name}-node"
      Proyecto = var.project_name
      Entorno  = var.environment
      Capas    = "FreeTier"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Grupo de Auto Escalado (Auto Scaling Group)
resource "aws_autoscaling_group" "asg" {
  name_prefix         = "${var.project_name}-asg-"
  vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  target_group_arns   = [aws_lb_target_group.asg_tg.arn]

  # LÃ­mites requeridos: MÃ­nimo 1, MÃ¡ximo 4, Inicial 1
  min_size         = var.asg_min_size
  max_size         = var.asg_max_size
  desired_capacity = var.asg_desired_capacity

  # ComprobaciÃ³n de salud basada en el Load Balancer
  health_check_type         = "ELB"
  health_check_grace_period = 180
  default_cooldown          = 60

  launch_template {
    id      = aws_launch_template.asg_lt.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "Proyecto"
    value               = var.project_name
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}
