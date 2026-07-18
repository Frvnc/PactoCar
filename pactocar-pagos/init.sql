-- pagos-service - Inicializacion de tabla de pagos (Escrow)
-- Idempotente: se puede ejecutar multiples veces sin errores.
-- Nota: no se define FK a reservas para mantener el modulo desacoplado del core.

CREATE TABLE IF NOT EXISTS pagos (
    id              SERIAL PRIMARY KEY,
    reserva_id      INTEGER NOT NULL UNIQUE,
    monto           INTEGER NOT NULL,
    garantia        INTEGER NOT NULL,
    comision        INTEGER NOT NULL DEFAULT 0,
    metodo          VARCHAR(30) NOT NULL DEFAULT 'tarjeta_credito',
    estado          VARCHAR(20) NOT NULL DEFAULT 'pagado',
    estado_garantia VARCHAR(20) NOT NULL DEFAULT 'retenida',
    creado_en       TIMESTAMP DEFAULT NOW()
);

-- Para bases de datos existentes que no tienen las columnas nuevas
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS comision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'pagado';
