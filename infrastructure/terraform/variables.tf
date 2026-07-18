variable "aws_region" {
  description = "Region de AWS"
  type        = string
  default     = "us-east-1"
}

variable "db_name" {
  description = "Nombre de la base de datos PostgreSQL"
  type        = string
  default     = "pactocar_db"
}

variable "db_username" {
  description = "Usuario administrador de RDS"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Contrasena del usuario RDS"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Clave secreta para firmar tokens JWT"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Correo de la cuenta de administrador que se crea al inicializar la base"
  type        = string
}

variable "admin_password" {
  description = "Contrasena de la cuenta de administrador"
  type        = string
  sensitive   = true
}
