const db = require('../db');

const MAX_LEN = 1000;

// Comunicacion inter-modulo: valida contra el core que el usuario participa en la reserva.
const buscarReserva = (reservaId) =>
  db.query(
    `SELECT r.id, r.estado, r.conductor_id, v.propietario_id
     FROM reservas r
     JOIN vehiculos v ON r.vehiculo_id = v.id
     WHERE r.id = $1`,
    [reservaId]
  );

const esParticipante = (reserva, usuarioId) =>
  reserva.conductor_id === usuarioId || reserva.propietario_id === usuarioId;

// POST /api/chat/:reservaId - envia un mensaje en la conversacion de una reserva.
const enviarMensaje = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { contenido } = req.body;

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido del mensaje es obligatorio.' });
    }
    if (contenido.length > MAX_LEN) {
      return res.status(422).json({ error: `El mensaje supera el maximo de ${MAX_LEN} caracteres.` });
    }

    const reserva = await buscarReserva(reservaId);
    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }
    const r = reserva.rows[0];
    if (!esParticipante(r, req.usuario.id)) {
      return res.status(403).json({ error: 'No participas en esta reserva.' });
    }
    if (r.estado === 'cancelada') {
      return res.status(422).json({ error: 'No se puede enviar mensajes en una reserva cancelada.' });
    }

    const resultado = await db.query(
      `INSERT INTO mensajes (reserva_id, emisor_id, contenido)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reservaId, req.usuario.id, contenido.trim()]
    );

    return res.status(201).json({ mensaje: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al enviar el mensaje.' });
  }
};

// GET /api/chat/:reservaId - lista los mensajes de una reserva (modelo de polling).
// Incluye el nombre del emisor y marca la conversacion como leida por el usuario.
const getMensajes = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const reserva = await buscarReserva(reservaId);
    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }
    const r = reserva.rows[0];
    if (!esParticipante(r, req.usuario.id)) {
      return res.status(403).json({ error: 'No participas en esta reserva.' });
    }

    const resultado = await db.query(
      `SELECT m.id, m.reserva_id, m.emisor_id, u.nombre_completo AS emisor_nombre,
              m.contenido, m.creado_en
       FROM mensajes m
       JOIN usuarios u ON m.emisor_id = u.id
       WHERE m.reserva_id = $1
       ORDER BY m.creado_en ASC`,
      [reservaId]
    );

    // Marca como leidos hasta el ultimo mensaje visto.
    const ultimoId = resultado.rows.length ? resultado.rows[resultado.rows.length - 1].id : 0;
    await db.query(
      `INSERT INTO chat_lecturas (reserva_id, usuario_id, ultimo_leido_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (reserva_id, usuario_id)
       DO UPDATE SET ultimo_leido_id = GREATEST(chat_lecturas.ultimo_leido_id, EXCLUDED.ultimo_leido_id)`,
      [reservaId, req.usuario.id, ultimoId]
    );

    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los mensajes.' });
  }
};

// GET /api/chat - resumen de conversaciones del usuario, con mensajes no leidos.
const getConversaciones = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT m.reserva_id,
              COUNT(*)::int AS total_mensajes,
              MAX(m.creado_en) AS ultimo,
              COUNT(*) FILTER (
                WHERE m.emisor_id <> $1 AND m.id > COALESCE(cl.ultimo_leido_id, 0)
              )::int AS no_leidos
       FROM mensajes m
       JOIN reservas r ON m.reserva_id = r.id
       JOIN vehiculos v ON r.vehiculo_id = v.id
       LEFT JOIN chat_lecturas cl ON cl.reserva_id = m.reserva_id AND cl.usuario_id = $1
       WHERE r.conductor_id = $1 OR v.propietario_id = $1
       GROUP BY m.reserva_id, cl.ultimo_leido_id
       ORDER BY ultimo DESC`,
      [req.usuario.id]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las conversaciones.' });
  }
};

module.exports = { enviarMensaje, getMensajes, getConversaciones };
