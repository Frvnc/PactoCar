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
