# ==============================================================================
# POLÍTICAS DE ESCALADO Y ALARMAS DE CLOUDWATCH (SCALE-OUT Y SCALE-IN)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. POLÍTICAS DE ESCALADO DEL AUTO SCALING GROUP
# ------------------------------------------------------------------------------

# Política de Escalado Hacia Arriba (Scale-Out): Agrega instancias
resource "aws_autoscaling_policy" "scale_out" {
  name                   = "${var.project_name}-scale-out-policy"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60
  autoscaling_group_name = aws_autoscaling_group.asg.name
}

# Política de Escalado Hacia Abajo (Scale-In): Reduce instancias
resource "aws_autoscaling_policy" "scale_in" {
  name                   = "${var.project_name}-scale-in-policy"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60
  autoscaling_group_name = aws_autoscaling_group.asg.name
}

# ------------------------------------------------------------------------------
# 2. ALARMAS DE CLOUDWATCH
# ------------------------------------------------------------------------------

# Alarma de Alta Utilización de CPU: CPU >= 50% durante 1 minuto
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu-alarm"
  alarm_description   = "Se activa cuando el uso de CPU promedio supera el ${var.scale_out_cpu_threshold}% en el ASG"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = var.scale_out_cpu_threshold

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_out.arn]

  tags = {
    Name = "${var.project_name}-high-cpu-alarm"
  }
}

# Alarma de Baja Utilización de CPU: CPU <= 20% durante 2 minutos (estabilidad)
resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "${var.project_name}-low-cpu-alarm"
  alarm_description   = "Se activa cuando el uso de CPU promedio cae por debajo del ${var.scale_in_cpu_threshold}% en el ASG"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = var.scale_in_cpu_threshold

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_in.arn]

  tags = {
    Name = "${var.project_name}-low-cpu-alarm"
  }
}
