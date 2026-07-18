# PactoCar P2P - Plataforma de Car Sharing colaborativo

Asignatura: Arquitectura Multi Cloud (TI3053) - INACAP, Ingenieria en Informatica.
Grupo: Francisco Parra, Diego Ibanez, Guido Zapata.
Docente: Felipe Andres Henriquez Vilugron.

Evaluacion 4: modularizacion del software en microservicios contenerizados de forma
independiente y pipelines DevSecOps con las cuatro fases de seguridad automatizadas.

---

## 1. Arquitectura

La plataforma se divide en un **core existente** (autenticacion, catalogo, reservas y
administracion) mas **cuatro modulos nuevos** que cierran el ciclo completo del arriendo.
Cada modulo es un microservicio Express independiente, con su propio `Dockerfile`, su
propia tabla y su propio pipeline. Todos comparten un contenedor PostgreSQL local y
reutilizan el mismo JWT emitido por el core.

| Componente | Carpeta | Puerto | Responsabilidad | Tabla propia |
|------------|---------|--------|-----------------|--------------|
| Core API (existente) | `pactocar-backend` | 3000 | auth, catalogo, reservas, admin, verificacion | usuarios, vehiculos, reservas, ... |
| Frontend (existente) | `pactocar-frontend` | 80 | SPA React servida con nginx | - |
| **Modulo 1: pagos** | `pactocar-pagos` | 3005 | Pagos y retencion de garantias (escrow), pasarela mock | pagos |
| **Modulo 2: contratos** | `pactocar-contratos` | 3006 | Generacion de contratos digitales en PDF (pdfkit) | contratos |
| **Modulo 3: reputacion** | `pactocar-reputacion` | 3007 | Reputacion bidireccional (calificaciones 1-5) | calificaciones |
| **Modulo 4: chat** | `pactocar-chat` | 3008 | Chat interno de coordinacion por polling | mensajes |
| Base de datos | (contenedor) | 5433 | PostgreSQL 15 compartido | - |

### Ciclo de vida del arriendo (narrativa de comunicacion inter-modulo)

```
reservar (core)
   -> PAGAR / escrow (pagos-service)
      -> CONTRATO PDF (contratos-service)
         -> CHAT coordinar entrega (chat-service)
            -> devolver -> liberar garantia (pagos-service)
               -> REPUTACION calificar (reputacion-service)
```

### Como se comunican los modulos

- **Con el core (PostgreSQL compartido):** cada modulo lee `reservas`, `vehiculos` y
  `usuarios` para validar la operacion (por ejemplo, pagos calcula la garantia sobre
  `monto_total`; contratos arma el PDF con los datos de la reserva; reputacion valida que
  la reserva este finalizada; chat valida que el usuario participe en la reserva).
- **Autenticacion unificada:** los cuatro modulos validan el mismo JWT emitido por el core
  (`middlewares/auth.js` comparte el `JWT_SECRET`). No hay login duplicado.
- **Aislamiento por modulo:** cada servicio tiene su propia tabla y no define claves foraneas
  cruzadas, de modo que puede desplegarse, probarse y escalarse de forma independiente.

---

## 2. Como levantar el stack en local

Requisitos: Docker y Docker Compose.

```bash
# desde la raiz del repositorio
docker compose up --build -d
```

Servicios expuestos:

| URL | Servicio |
|-----|----------|
| http://localhost | Frontend (nginx) |
| http://localhost:3000/api/ping | Core API |
| http://localhost:3005/api/ping | pagos-service |
| http://localhost:3006/api/ping | contratos-service |
| http://localhost:3007/api/ping | reputacion-service |
| http://localhost:3008/api/ping | chat-service |

Variables de entorno (`.env` en la raiz, no versionado): `DB_PASSWORD` y `JWT_SECRET`.

Datos de demo (opcional, corre el seed del core):

```bash
docker exec -it pactocar-api node seed.js
```

Para detener todo:

```bash
docker compose down
```

---

## 3. Pipelines DevSecOps

Cada modulo tiene su **pipeline independiente** en `.github/workflows/`, que se dispara solo
cuando cambia su carpeta (filtro `paths`). El core mantiene su propio pipeline.

| Workflow | Modulo |
|----------|--------|
| `pipeline.yml` | core (backend + frontend) |
| `pagos-service.yml` | pagos-service |
| `contratos-service.yml` | contratos-service |
| `reputacion-service.yml` | reputacion-service |
| `chat-service.yml` | chat-service |

Cada pipeline integra las **cuatro fases de seguridad obligatorias**, ademas de los tests
unitarios y el build local de la imagen (sin despliegue a la nube):

| Fase | Herramienta | Que valida |
|------|-------------|------------|
| SAST | Semgrep (SonarCloud en el core) | Malas practicas y fallos logicos en el codigo fuente |
| SCA | Trivy `fs` | Vulnerabilidades (CVEs) en dependencias de terceros |
| Secret Scanning | Gitleaks | Credenciales o tokens filtrados en el codigo |
| IaC Scanning | Trivy `config` | Malas configuraciones en los Dockerfiles |

Las fases estan configuradas para **interceptar** hallazgos: un CVE critico, un secreto
detectado o una mala configuracion critica detienen el pipeline (`exit-code: 1`).

Como todo corre en local por la restriccion de presupuesto cloud, el pipeline construye y
escanea la imagen pero no la despliega a AWS. El "despliegue continuo" se demuestra con
`docker compose up --build`.

---

## 4. Estructura del repositorio

```
PactoCar/
├── pactocar-backend/       core API (existente)
├── pactocar-frontend/      SPA React (existente)
├── pactocar-pagos/         Modulo 1 - escrow
├── pactocar-contratos/     Modulo 2 - contratos PDF
├── pactocar-reputacion/    Modulo 3 - reputacion
├── pactocar-chat/          Modulo 4 - chat
├── .github/workflows/      pipelines por modulo + core
├── docker-compose.yml      orquestacion local de todo el stack
└── README.md
```

Cada modulo sigue el mismo patron: `index.js`, `db.js`, `controllers/`, `routes/`,
`middlewares/`, `init.sql`, `Dockerfile`, `.dockerignore`, `package.json` y `__tests__/`.
