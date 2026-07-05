const db = require('../db');

// Porcentaje del monto del arriendo que se retiene como garantia (escrow).
const GARANTIA_PORCENTAJE = 0.2;

// POST /api/pagos - el conductor paga una reserva confirmada.
// Comunicacion inter-modulo: lee la reserva del core para obtener el monto y validar dueno/estado.
const procesarPago = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 3) {
      return res.status(403).json({ error: 'Solo los conductores pueden pagar una reserva.' });
    }

    const { reserva_id, metodo } = req.body;
    if (!reserva_id) {
      return res.status(400).json({ error: 'El id de la reserva es obligatorio.' });
    }

    const reserva = await db.query(
      'SELECT id, conductor_id, monto_total, estado FROM reservas WHERE id = $1',
      [reserva_id]
    );
    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const r = reserva.rows[0];
    if (r.conductor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No puedes pagar una reserva que no es tuya.' });
    }
    if (r.estado !== 'confirmada') {
      return res.status(422).json({ error: 'Solo se puede pagar una reserva confirmada.' });
    }

    const existente = await db.query('SELECT id FROM pagos WHERE reserva_id = $1', [reserva_id]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Esta reserva ya fue pagada.' });
    }

    const garantia = Math.round(r.monto_total * GARANTIA_PORCENTAJE);

    // Pasarela MOCK: el cobro siempre se considera exitoso (no hay integracion real).
    const resultado = await db.query(
      `INSERT INTO pagos (reserva_id, monto, garantia, metodo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [reserva_id, r.monto_total, garantia, metodo || 'tarjeta_credito']
    );

    return res.status(201).json({
      mensaje: 'Pago procesado. Garantia retenida en escrow.',
      pago: resultado.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al procesar el pago.' });
  }
};

// GET /api/pagos/mios - pagos del conductor autenticado.
const getMisPagos = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 3) {
      return res.status(403).json({ error: 'Solo los conductores pueden ver sus pagos.' });
    }
    const resultado = await db.query(
      `SELECT p.*, r.fecha_inicio, r.fecha_fin, r.estado AS estado_reserva
       FROM pagos p
       JOIN reservas r ON p.reserva_id = r.id
       WHERE r.conductor_id = $1
       ORDER BY p.creado_en DESC`,
      [req.usuario.id]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los pagos.' });
  }
};

// GET /api/pagos/reserva/:reservaId - pago asociado a una reserva.
const getPagoReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const resultado = await db.query('SELECT * FROM pagos WHERE reserva_id = $1', [reservaId]);
    return res.status(200).json({ pago: resultado.rows[0] || null });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el pago.' });
  }
};

// PATCH /api/pagos/:id/liberar-garantia - el propietario libera la garantia
// cuando la reserva quedo finalizada (devolucion confirmada).
const liberarGarantia = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Solo el propietario puede liberar la garantia.' });
    }
    const { id } = req.params;

    const check = await db.query(
      `SELECT p.id, p.estado_garantia, r.estado AS estado_reserva
       FROM pagos p
       JOIN reservas r ON p.reserva_id = r.id
       JOIN vehiculos v ON r.vehiculo_id = v.id
       WHERE p.id = $1 AND v.propietario_id = $2`,
      [id, req.usuario.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }
    if (check.rows[0].estado_reserva !== 'finalizada') {
      return res.status(422).json({ error: 'Solo se libera la garantia cuando la reserva esta finalizada.' });
    }
    if (check.rows[0].estado_garantia === 'liberada') {
      return res.status(409).json({ error: 'La garantia ya fue liberada.' });
    }

    const resultado = await db.query(
      `UPDATE pagos SET estado_garantia = 'liberada' WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.status(200).json({ mensaje: 'Garantia liberada.', pago: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al liberar la garantia.' });
  }
};

module.exports = { procesarPago, getMisPagos, getPagoReserva, liberarGarantia };
