-- pagos-service - Inicializacion de tabla de pagos (Escrow)
-- Idempotente: se puede ejecutar multiples veces sin errores.
-- Nota: no se define FK a reservas para mantener el modulo desacoplado del core.

CREATE TABLE IF NOT EXISTS pagos (
    id              SERIAL PRIMARY KEY,
    reserva_id      INTEGER NOT NULL UNIQUE,
    monto           INTEGER NOT NULL,
    garantia        INTEGER NOT NULL,
    metodo          VARCHAR(30) NOT NULL DEFAULT 'tarjeta_credito',
    estado_garantia VARCHAR(20) NOT NULL DEFAULT 'retenida',
    creado_en       TIMESTAMP DEFAULT NOW()
);
