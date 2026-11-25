# AWS Auto Scaling Group & Application Load Balancer (Free Tier)

Este proyecto despliega una arquitectura elástica de alta disponibilidad en **Amazon Web Services (AWS)** utilizando la **Capa Gratuita (Free Tier)** con instancias `t3.micro`, gestionada completamente como código mediante **Terraform** y desplegada de forma automatizada a través de **GitHub Actions** con autenticación criptográfica segura vía **OpenID Connect (OIDC)**.

---

## 🏛️ Arquitectura del Sistema

```
                        [ Internet / Clientes ]
                                   │
                                   ▼ HTTP (Puerto 80)
                ┌──────────────────────────────────────┐
                │  Application Load Balancer (ALB)     │
                │  • Listener HTTP :80                 │
                │  • Target Group (Healthcheck /health)│
                └───────────┬──────────────┬───────────┘
                            │              │
               us-east-1a   │              │   us-east-1b
                            ▼              ▼
                ┌──────────────────────────────────────┐
                │       Auto Scaling Group (ASG)       │
                │       • Límite Inferior: 1 instancia │
                │       • Límite Superior: 4 instancias│
                │       • Tipo: t3.micro (Free Tier)   │
                │       • AMI: Amazon Linux 2023       │
                │       • Nginx + Telemetría Python    │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼ Métricas de CPU
                ┌──────────────────────────────────────┐
                │         CloudWatch Alarms            │
                │  🔺 Scale-Out: CPU ≥ 50% (1 min)     │
                │  🔻 Scale-In:  CPU ≤ 20% (2 min)     │
                └──────────────────────────────────────┘
```

---

## 🌟 Características Principales

1. **Auto Scaling Dinámico:**
   * **Límite Inferior:** 1 instancia en estado normal.
   * **Límite Superior:** 4 instancias ante picos de demanda.
   * **Instancias `t3.micro`:** Con 2 vCPUs, 1 GB RAM y volumen EBS `gp3` cifrado de 20 GB (100% elegible para la Capa Gratuita de AWS).
2. **Alarmas de CloudWatch Efectivas:**
   * **Scale-Out:** Alarma `asg-high-cpu-alarm` se activa si el promedio de CPU del ASG supera el **50% durante 1 minuto**, añadiendo instancias inmediatamente hasta el máximo de 4.
   * **Scale-In:** Alarma `asg-low-cpu-alarm` se activa si el promedio de CPU cae por debajo del **20% durante 2 minutos**, reduciendo las instancias gradualmente hasta 1.
3. **Página Web Interactiva en Nginx:**
   * Muestra en tiempo real el **Instance ID**, la **Zona de Disponibilidad (AZ)**, la **IP Privada**, y el **consumo de CPU y Memoria** de la instancia que atiende al navegador.
   * **Botón de Prueba de Estrés (CPU 100%):** Ejecuta subprocesos intensivos de cálculo para saturar la CPU de la máquina, forzando la activación de la alarma de CloudWatch y el escalado hacia arriba.
   * **Botón para Detener Estrés:** Normaliza la CPU inmediatamente para validar el escalado hacia abajo.
4. **Prueba Visual de Balanceo de Carga:**
   * Módulo interactivo en la web para enviar ráfagas de solicitudes HTTP (20, 50, 100 peticiones) o monitoreo continuo en bucle.
   * Detecta y dibuja tarjetas dinámicas por cada instancia que responde, mostrando el conteo de peticiones, el porcentaje de distribución y un gráfico de barras en tiempo real.
5. **Bootstrap Centralizado OIDC (Sin Credenciales Estáticas):**
   * Reutiliza el bucket S3 de estado remoto (`citas-escolares-tf-state-us-east-1`), la tabla DynamoDB de bloqueos (`citas-escolares-tf-locks`) y el rol IAM OIDC (`arn:aws:iam::079301214534:role/citas-escolares-github-oidc-role`) configurado en el proyecto `agente`, sin necesidad de desplegar un bootstrap nuevo.

---

## 🚀 Despliegue Automático por GitHub Actions

Cada `push` a la rama `main` activa el pipeline `.github/workflows/deploy.yml`:
1. Autentica con AWS usando **OIDC** (sin access keys).
2. Inicializa el backend remoto en S3 con state locking en DynamoDB.
3. Ejecuta `terraform plan` y `terraform apply -auto-approve`.
4. Publica en el resumen de GitHub Actions la **URL pública del Load Balancer**.

---

## 🧪 Cómo Realizar la Demostración

1. Abre la URL pública del Application Load Balancer provista al final del pipeline.
2. Observa la tarjeta de la instancia activa (`Instance ID`, IP privada, CPU ~1%).
3. En la sección **Prueba de Estrés**, presiona **"⚡ Iniciar Prueba de Estrés (CPU 100%)"**.
   * Verás cómo la barra de CPU de la máquina sube a ~100%.
   * En aproximadamente 60 segundos, CloudWatch activará `asg-high-cpu-alarm` y el Auto Scaling Group comenzará a crear nuevas instancias hasta llegar a 4.
4. En la sección **Prueba Visual de Balanceo**, presiona **"🚀 Lanzar Ráfaga"**.
   * Verás cómo aparecen las nuevas tarjetas de las instancias A, B, C y D y cómo el ALB reparte las peticiones entre ellas en tiempo real.
5. Presiona **"⏹️ Detener Prueba de Estrés"**.
   * La CPU caerá a <5%.
   * CloudWatch activará `asg-low-cpu-alarm` y el ASG apagará gradualmente las instancias sobrantes hasta volver al límite inferior de 1.
