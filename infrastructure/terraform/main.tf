terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.6"
}

provider "aws" {
  region = var.aws_region
}

# ─── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "pactocar-vpc" }
}

# ─── SUBREDES ─────────────────────────────────────────────────────────────────

resource "aws_subnet" "public_1a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags                    = { Name = "pactocar-public-1a" }
}

resource "aws_subnet" "public_1b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
  tags                    = { Name = "pactocar-public-1b" }
}

resource "aws_subnet" "private_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "pactocar-private-1a" }
}

resource "aws_subnet" "private_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "${var.aws_region}b"
  tags              = { Name = "pactocar-private-1b" }
}

# ─── INTERNET GATEWAY ─────────────────────────────────────────────────────────

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "pactocar-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "pactocar-rt-public" }
}

resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.public_1a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.public_1b.id
  route_table_id = aws_route_table.public.id
}

# ─── NAT GATEWAY (salida a internet para subredes privadas → ECR) ─────────────

resource "aws_eip" "nat" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw]
  tags       = { Name = "pactocar-nat-eip" }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1a.id
  depends_on    = [aws_internet_gateway.igw]
  tags          = { Name = "pactocar-nat" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
  tags = { Name = "pactocar-rt-private" }
}

resource "aws_route_table_association" "private_1a" {
  subnet_id      = aws_subnet.private_1a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_1b" {
  subnet_id      = aws_subnet.private_1b.id
  route_table_id = aws_route_table.private.id
}

# ─── SECURITY GROUPS ──────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "pactocar-sg-alb"
  description = "Trafico HTTP entrante al ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "pactocar-sg-alb" }
}

resource "aws_security_group" "ecs" {
  name        = "pactocar-sg-ecs"
  description = "Trafico del ALB hacia los contenedores ECS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "pactocar-sg-ecs" }
}

resource "aws_security_group" "rds" {
  name        = "pactocar-sg-rds"
  description = "Trafico de ECS hacia RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = { Name = "pactocar-sg-rds" }
}

# ─── ECR ──────────────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "pactocar-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "pactocar-backend" }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "pactocar-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "pactocar-frontend" }
}

# ─── IAM ──────────────────────────────────────────────────────────────────────

data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

data "aws_caller_identity" "current" {}

# ─── CLOUDWATCH ───────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/pactocar-backend"
  retention_in_days = 7
  tags              = { Name = "pactocar-logs-backend" }
}

# ─── RDS ──────────────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "pactocar-db-subnet-group"
  subnet_ids = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
  tags       = { Name = "pactocar-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "pactocar-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false
  skip_final_snapshot = true
  deletion_protection = false

  tags = { Name = "pactocar-db" }
}

# ─── ALB ──────────────────────────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "pactocar-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1a.id, aws_subnet.public_1b.id]
  tags               = { Name = "pactocar-alb" }
}

resource "aws_lb_target_group" "backend" {
  name        = "pactocar-tg-backend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/ping"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }

  tags = { Name = "pactocar-tg-backend" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ─── ECS ──────────────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "pactocar-cluster"
  tags = { Name = "pactocar-cluster" }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "pactocar-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([{
    name  = "pactocar-backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "PORT",        value = "3000" },
      { name = "NODE_ENV",    value = "production" },
      { name = "DB_HOST",     value = aws_db_instance.postgres.address },
      { name = "DB_PORT",     value = "5432" },
      { name = "DB_NAME",     value = var.db_name },
      { name = "DB_USER",     value = var.db_username },
      { name = "DB_PASSWORD", value = var.db_password },
      { name = "JWT_SECRET",     value = var.jwt_secret },
      { name = "S3_BUCKET_NAME", value = aws_s3_bucket.fotos.bucket },
      { name = "AWS_REGION",     value = var.aws_region }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "backend" {
  name            = "pactocar-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "pactocar-backend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = false
    rollback = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [
    aws_lb_listener.http,
  ]

  tags = { Name = "pactocar-api" }
}

# ─── S3 FOTOS VEHICULOS ───────────────────────────────────────────────────────

resource "aws_s3_bucket" "fotos" {
  bucket = "pactocar-fotos-${data.aws_caller_identity.current.account_id}"
  tags   = { Name = "pactocar-fotos" }
}

resource "aws_s3_bucket_public_access_block" "fotos" {
  bucket                  = aws_s3_bucket.fotos.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "fotos_public_read" {
  bucket     = aws_s3_bucket.fotos.id
  depends_on = [aws_s3_bucket_public_access_block.fotos]
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicRead"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.fotos.arn}/*"
    }]
  })
}

# ─── CLOUDWATCH ALARMS ────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_alto" {
  alarm_name          = "pactocar-ecs-cpu-alto"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "CPU del servicio ECS pactocar-api supera el 70%"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = []
  ok_actions    = []

  tags = { Name = "pactocar-alarm-cpu" }
}

resource "aws_cloudwatch_metric_alarm" "ecs_memoria_alta" {
  alarm_name          = "pactocar-ecs-memoria-alta"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Memoria del servicio ECS pactocar-api supera el 80%"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = []
  ok_actions    = []

  tags = { Name = "pactocar-alarm-memoria" }
}

# ─── API GATEWAY (HTTPS para el API) ──────────────────────────────────────────

resource "aws_apigatewayv2_api" "backend" {
  name          = "pactocar-api-gw"
  protocol_type = "HTTP"
  tags          = { Name = "pactocar-api-gw" }
}

resource "aws_apigatewayv2_integration" "alb" {
  api_id                 = aws_apigatewayv2_api.backend.id
  integration_type       = "HTTP_PROXY"
  integration_uri        = "http://${aws_lb.main.dns_name}"
  integration_method     = "ANY"
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.backend.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.alb.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.backend.id
  name        = "$default"
  auto_deploy = true
  tags        = { Name = "pactocar-api-gw-stage" }
}
