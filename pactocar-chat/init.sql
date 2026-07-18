-- chat-service - Inicializacion de tablas
-- Idempotente: se puede ejecutar multiples veces sin errores.
-- Nota: no se define FK a reservas/usuarios para mantener el modulo desacoplado del core.

CREATE TABLE IF NOT EXISTS mensajes (
    id         SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL,
    emisor_id  INTEGER NOT NULL,
    contenido  TEXT NOT NULL,
    creado_en  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_reserva ON mensajes (reserva_id);

-- Control de lectura por usuario (para contar mensajes no leidos).
CREATE TABLE IF NOT EXISTS chat_lecturas (
    reserva_id      INTEGER NOT NULL,
    usuario_id      INTEGER NOT NULL,
    ultimo_leido_id INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (reserva_id, usuario_id)
);
