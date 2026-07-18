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
      `SELECT id, reserva_id, emisor_id, contenido, creado_en
       FROM mensajes WHERE reserva_id = $1
       ORDER BY creado_en ASC`,
      [reservaId]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los mensajes.' });
  }
};

// GET /api/chat - resumen de conversaciones del usuario autenticado.
const getConversaciones = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT m.reserva_id, COUNT(*)::int AS total_mensajes, MAX(m.creado_en) AS ultimo
       FROM mensajes m
       JOIN reservas r ON m.reserva_id = r.id
       JOIN vehiculos v ON r.vehiculo_id = v.id
       WHERE r.conductor_id = $1 OR v.propietario_id = $1
       GROUP BY m.reserva_id
       ORDER BY ultimo DESC`,
      [req.usuario.id]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las conversaciones.' });
  }
};

module.exports = { enviarMensaje, getMensajes, getConversaciones };
