-- PactoCar — Inicialización de base de datos
-- Idempotente: se puede ejecutar múltiples veces sin errores

CREATE TABLE IF NOT EXISTS roles (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    rol_id          INTEGER NOT NULL REFERENCES roles(id),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    verificado      BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP DEFAULT NOW()
);

-- Para bases de datos existentes que no tienen la columna verificado
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE;

-- Para bases de datos existentes que no tienen imagen_url en vehiculos
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS imagen_aprobada BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS vehiculos (
    id                SERIAL PRIMARY KEY,
    propietario_id    INTEGER NOT NULL REFERENCES usuarios(id),
    marca             VARCHAR(50) NOT NULL,
    modelo            VARCHAR(50) NOT NULL,
    anio              INTEGER NOT NULL,
    patente           VARCHAR(10) NOT NULL UNIQUE,
    precio_diario_clp INTEGER NOT NULL,
    disponible        BOOLEAN NOT NULL DEFAULT TRUE,
    imagen_url        TEXT,
    imagen_aprobada   BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservas (
    id           SERIAL PRIMARY KEY,
    vehiculo_id  INTEGER NOT NULL REFERENCES vehiculos(id),
    conductor_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NOT NULL,
    estado       VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_verificacion (
    id                   SERIAL PRIMARY KEY,
    usuario_id           INTEGER NOT NULL REFERENCES usuarios(id) UNIQUE,
    rut                  VARCHAR(12) NOT NULL,
    numero_licencia      VARCHAR(20),
    clase_licencia       VARCHAR(10),
    vencimiento_licencia DATE,
    aseguradora          VARCHAR(100),
    numero_poliza        VARCHAR(30),
    vencimiento_seguro   DATE,
    estado               VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    mensaje_rechazo      TEXT,
    creado_en            TIMESTAMP DEFAULT NOW()
);

-- Seed de roles (no falla si ya existen)
INSERT INTO roles (nombre)
VALUES ('Administrador'), ('Propietario'), ('Conductor')
ON CONFLICT (nombre) DO NOTHING;
