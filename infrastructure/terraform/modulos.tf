# ─── LOS 4 MODULOS EN ECS FARGATE ─────────────────────────────────────────────
#
# Cada modulo es un microservicio independiente con su propio repositorio ECR,
# su task definition, su servicio ECS y su regla de ruteo en el ALB
# El ALB enruta por path: /api/pagos -> pagos, /api/contratos -> contratos, etc
# El resto del trafico cae en la accion por defecto (el backend core)
#
# Los modulos no se llaman por HTTP entre si: comparten la base de datos RDS y
# el mismo JWT_SECRET, por lo que solo necesitan credenciales de BD
# Cada servicio ejecuta su init.sql idempotente al arrancar, asi que crea sus
# propias tablas contra RDS sin bootstrap manual

locals {
  modulos = {
    pagos = {
      puerto    = 3005
      ruta      = "/api/pagos"
      prioridad = 10
    }
    contratos = {
      puerto    = 3006
      ruta      = "/api/contratos"
      prioridad = 20
    }
    reputacion = {
      puerto    = 3007
      ruta      = "/api/reputacion"
      prioridad = 30
    }
    chat = {
      puerto    = 3008
      ruta      = "/api/chat"
      prioridad = 40
    }
  }
}

# ─── ECR (un repositorio por modulo) ──────────────────────────────────────────

resource "aws_ecr_repository" "modulo" {
  for_each = local.modulos

  name                 = "pactocar-${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "pactocar-${each.key}" }
}

# ─── CLOUDWATCH LOGS ──────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "modulo" {
  for_each = local.modulos

  name              = "/ecs/pactocar-${each.key}"
  retention_in_days = 7
  tags              = { Name = "pactocar-logs-${each.key}" }
}

# ─── TARGET GROUPS ────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "modulo" {
  for_each = local.modulos

  name        = "pactocar-tg-${each.key}"
  port        = each.value.puerto
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

  tags = { Name = "pactocar-tg-${each.key}" }
}

# ─── REGLAS DE RUTEO EN EL ALB ────────────────────────────────────────────────

resource "aws_lb_listener_rule" "modulo" {
  for_each = local.modulos

  listener_arn = aws_lb_listener.http.arn
  priority     = each.value.prioridad

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.modulo[each.key].arn
  }

  condition {
    path_pattern {
      values = ["${each.value.ruta}", "${each.value.ruta}/*"]
    }
  }

  tags = { Name = "pactocar-rule-${each.key}" }
}

# ─── TASK DEFINITIONS ─────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "modulo" {
  for_each = local.modulos

  family                   = "pactocar-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([{
    name  = "pactocar-${each.key}"
    image = "${aws_ecr_repository.modulo[each.key].repository_url}:latest"

    portMappings = [{
      containerPort = each.value.puerto
      protocol      = "tcp"
    }]

    # Al modulo de pagos se le inyecta ademas la URL de contratos-service: cuando
    # un pago se completa lo llama por HTTP para emitir el contrato. La llamada
    # sale por el ALB, que enruta /api/contratos al servicio correspondiente
    environment = concat(
      [
        { name = "PORT", value = tostring(each.value.puerto) },
        { name = "NODE_ENV", value = "production" },
        { name = "DB_HOST", value = aws_db_instance.postgres.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USER", value = var.db_username },
        { name = "DB_PASSWORD", value = var.db_password },
        { name = "JWT_SECRET", value = var.jwt_secret }
      ],
      each.key == "pagos" ? [
        { name = "CONTRATOS_URL", value = "http://${aws_lb.main.dns_name}" }
      ] : []
    )

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.modulo[each.key].name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ─── SERVICIOS ECS ────────────────────────────────────────────────────────────

resource "aws_ecs_service" "modulo" {
  for_each = local.modulos

  name            = "pactocar-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.modulo[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.modulo[each.key].arn
    container_name   = "pactocar-${each.key}"
    container_port   = each.value.puerto
  }

  deployment_circuit_breaker {
    enable   = false
    rollback = false
  }

  # Terraform define la task definition base (variables de entorno, recursos, logs)
  # El pipeline registra revisiones nuevas sobre esa base fijando la imagen por SHA,
  # asi que aqui se ignora: de lo contrario un apply devolveria el servicio a una
  # imagen antigua. Flujo: terraform apply cambia el entorno -> el pipeline despliega
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]

  tags = { Name = "pactocar-${each.key}" }
}
