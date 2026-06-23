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
    creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehiculos (
    id                SERIAL PRIMARY KEY,
    propietario_id    INTEGER NOT NULL REFERENCES usuarios(id),
    marca             VARCHAR(50) NOT NULL,
    modelo            VARCHAR(50) NOT NULL,
    anio              INTEGER NOT NULL,
    patente           VARCHAR(10) NOT NULL UNIQUE,
    precio_diario_clp INTEGER NOT NULL,
    disponible        BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en         TIMESTAMP DEFAULT NOW()
);

-- Seed de roles (no falla si ya existen)
INSERT INTO roles (nombre)
VALUES ('Administrador'), ('Propietario'), ('Conductor')
ON CONFLICT (nombre) DO NOTHING;
