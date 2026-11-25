# ==============================================================================
# OUTPUTS DE LA INFRAESTRUCTURA DE AUTO SCALING
# ==============================================================================

output "alb_dns_name" {
  description = "Nombre DNS público del Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "URL web pública para acceder a la aplicación"
  value       = "http://${aws_lb.main.dns_name}"
}

output "autoscaling_group_name" {
  description = "Nombre del Auto Scaling Group"
  value       = aws_autoscaling_group.asg.name
}

output "autoscaling_min_size" {
  description = "Límite inferior de instancias"
  value       = aws_autoscaling_group.asg.min_size
}

output "autoscaling_max_size" {
  description = "Límite superior de instancias"
  value       = aws_autoscaling_group.asg.max_size
}

output "high_cpu_alarm_name" {
  description = "Nombre de la alarma CloudWatch para escalar hacia arriba (Scale-Out)"
  value       = aws_cloudwatch_metric_alarm.high_cpu.alarm_name
}

output "low_cpu_alarm_name" {
  description = "Nombre de la alarma CloudWatch para escalar hacia abajo (Scale-In)"
  value       = aws_cloudwatch_metric_alarm.low_cpu.alarm_name
}
