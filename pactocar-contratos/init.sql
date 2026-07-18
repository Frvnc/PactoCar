-- contratos-service - Inicializacion de tabla de contratos digitales
-- Idempotente: se puede ejecutar multiples veces sin errores.
-- Nota: no se define FK a reservas para mantener el modulo desacoplado del core.
-- El PDF se almacena como BYTEA para que el modulo sea autocontenido (sin volumen ni S3).

CREATE TABLE IF NOT EXISTS contratos (
    id           SERIAL PRIMARY KEY,
    reserva_id   INTEGER NOT NULL UNIQUE,
    arrendador   VARCHAR(100) NOT NULL,
    arrendatario VARCHAR(100) NOT NULL,
    vehiculo     VARCHAR(120) NOT NULL,
    monto        INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NOT NULL,
    pdf          BYTEA NOT NULL,
    creado_en    TIMESTAMP DEFAULT NOW()
);
