const db = require('../db');

// POST /api/reputacion - un participante califica al otro tras finalizar la reserva.
// Comunicacion inter-modulo: lee la reserva del core para validar estado y partes.
const crearCalificacion = async (req, res) => {
  try {
    const { reserva_id, puntaje, comentario } = req.body;
    if (!reserva_id || puntaje === undefined) {
      return res.status(400).json({ error: 'La reserva y el puntaje son obligatorios.' });
    }
    if (!Number.isInteger(Number(puntaje)) || puntaje < 1 || puntaje > 5) {
      return res.status(422).json({ error: 'El puntaje debe ser un entero entre 1 y 5.' });
    }

    const reserva = await db.query(
      `SELECT r.id, r.estado, r.conductor_id, v.propietario_id
       FROM reservas r
       JOIN vehiculos v ON r.vehiculo_id = v.id
       WHERE r.id = $1`,
      [reserva_id]
    );
    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const r = reserva.rows[0];
    if (r.conductor_id !== req.usuario.id && r.propietario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No puedes calificar una reserva ajena.' });
    }
    if (r.estado !== 'finalizada') {
      return res.status(422).json({ error: 'Solo se puede calificar una reserva finalizada.' });
    }

    const destinatario_id = r.conductor_id === req.usuario.id ? r.propietario_id : r.conductor_id;

    const existente = await db.query(
      'SELECT id FROM calificaciones WHERE reserva_id = $1 AND autor_id = $2',
      [reserva_id, req.usuario.id]
    );
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Ya calificaste esta reserva.' });
    }

    const resultado = await db.query(
      `INSERT INTO calificaciones (reserva_id, autor_id, destinatario_id, puntaje, comentario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reserva_id, req.usuario.id, destinatario_id, Number(puntaje), comentario || null]
    );

    return res.status(201).json({
      mensaje: 'Calificacion registrada.',
      calificacion: resultado.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar la calificacion.' });
  }
};

// GET /api/reputacion/usuario/:usuarioId - promedio, total y detalle recibido por un usuario.
const getReputacionUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const resumen = await db.query(
      `SELECT COUNT(*)::int AS total, COALESCE(ROUND(AVG(puntaje)::numeric, 2), 0) AS promedio
       FROM calificaciones WHERE destinatario_id = $1`,
      [usuarioId]
    );
    const lista = await db.query(
      `SELECT id, reserva_id, autor_id, puntaje, comentario, creado_en
       FROM calificaciones WHERE destinatario_id = $1
       ORDER BY creado_en DESC`,
      [usuarioId]
    );
    return res.status(200).json({
      usuario_id: Number(usuarioId),
      promedio: Number(resumen.rows[0].promedio),
      total: resumen.rows[0].total,
      calificaciones: lista.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener la reputacion.' });
  }
};

// GET /api/reputacion/mias - calificaciones que el usuario autenticado ha emitido.
const getMisCalificaciones = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT id, reserva_id, destinatario_id, puntaje, comentario, creado_en
       FROM calificaciones WHERE autor_id = $1
       ORDER BY creado_en DESC`,
      [req.usuario.id]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener tus calificaciones.' });
  }
};

// GET /api/reputacion/reserva/:reservaId - calificaciones asociadas a una reserva.
const getCalificacionesReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const resultado = await db.query(
      `SELECT id, reserva_id, autor_id, destinatario_id, puntaje, comentario, creado_en
       FROM calificaciones WHERE reserva_id = $1`,
      [reservaId]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las calificaciones.' });
  }
};

module.exports = {
  crearCalificacion,
  getReputacionUsuario,
  getMisCalificaciones,
  getCalificacionesReserva,
};
