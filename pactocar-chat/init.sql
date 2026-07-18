-- chat-service - Inicializacion de tabla de mensajes
-- Idempotente: se puede ejecutar multiples veces sin errores.
-- Nota: no se define FK a reservas/usuarios para mantener el modulo desacoplado del core.
-- Modelo simple de mensajeria por polling asociada a una reserva.

CREATE TABLE IF NOT EXISTS mensajes (
    id         SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL,
    emisor_id  INTEGER NOT NULL,
    contenido  TEXT NOT NULL,
    creado_en  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_reserva ON mensajes (reserva_id);
