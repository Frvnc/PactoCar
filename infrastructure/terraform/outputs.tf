output "alb_dns_name" {
  description = "URL del ALB — copiar como valor del secret VITE_API_URL en GitHub"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_backend_url" {
  description = "URL del repositorio ECR del backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "URL del repositorio ECR del frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "rds_endpoint" {
  description = "Endpoint del cluster RDS PostgreSQL"
  value       = aws_db_instance.postgres.address
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = aws_ecs_cluster.main.name
}

output "api_gateway_url" {
  description = "URL HTTPS del backend via API Gateway — usar como valor del secret VITE_API_URL en GitHub"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "s3_fotos_bucket" {
  description = "Nombre del bucket S3 para fotos de vehiculos — agregar como S3_BUCKET_NAME en .env"
  value       = aws_s3_bucket.fotos.bucket
}
