-- reputacion-service - Inicializacion de tabla de calificaciones
-- Idempotente: se puede ejecutar multiples veces sin errores.
-- Nota: no se define FK a reservas/usuarios para mantener el modulo desacoplado del core.
-- Restriccion UNIQUE (reserva_id, autor_id): cada usuario califica una sola vez por reserva.

CREATE TABLE IF NOT EXISTS calificaciones (
    id              SERIAL PRIMARY KEY,
    reserva_id      INTEGER NOT NULL,
    autor_id        INTEGER NOT NULL,
    destinatario_id INTEGER NOT NULL,
    puntaje         INTEGER NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    comentario      TEXT,
    creado_en       TIMESTAMP DEFAULT NOW(),
    UNIQUE (reserva_id, autor_id)
);
