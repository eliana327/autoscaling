variable "aws_region" {
  description = "Región de AWS donde se desplegará la infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Prefijo para nombrar los recursos"
  type        = string
  default     = "asg-lab"
}

variable "instance_type" {
  description = "Tipo de instancia EC2 (capa gratuita)"
  type        = string
  default     = "t3.micro"
}

variable "asg_min_size" {
  description = "Límite inferior de instancias en el Auto Scaling Group"
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Límite superior de instancias en el Auto Scaling Group"
  type        = number
  default     = 4
}

variable "asg_desired_capacity" {
  description = "Capacidad inicial deseada de instancias"
  type        = number
  default     = 1
}

variable "scale_out_cpu_threshold" {
  description = "Umbral de CPU (%) para disparar la alarma de escalado hacia arriba (Scale-Out)"
  type        = number
  default     = 50
}

variable "scale_in_cpu_threshold" {
  description = "Umbral de CPU (%) para disparar la alarma de escalado hacia abajo (Scale-In)"
  type        = number
  default     = 20
}
