const db = require('../db');
const { generarContratoPdf } = require('../utils/contrato-pdf');
const { obtenerPago } = require('../services/pagos.client');

// Solo se genera contrato una vez que la reserva quedo confirmada (o mas avanzada).
const ESTADOS_CON_CONTRATO = ['confirmada', 'en_curso', 'finalizada'];

// POST /api/contratos - genera el contrato PDF de una reserva.
// Comunicacion inter-modulo: lee reserva/vehiculo/usuarios del core para armar el documento.
const generarContrato = async (req, res) => {
  try {
    const { reserva_id } = req.body;
    if (!reserva_id) {
      return res.status(400).json({ error: 'El id de la reserva es obligatorio.' });
    }

    const consulta = await db.query(
      `SELECT r.id, r.fecha_inicio, r.fecha_fin, r.monto_total, r.estado,
              r.conductor_id, v.propietario_id,
              v.marca, v.modelo, v.anio, v.patente,
              arr.nombre_completo AS arrendador,
              con.nombre_completo AS arrendatario
       FROM reservas r
       JOIN vehiculos v ON r.vehiculo_id = v.id
       JOIN usuarios arr ON v.propietario_id = arr.id
       JOIN usuarios con ON r.conductor_id = con.id
       WHERE r.id = $1`,
      [reserva_id]
    );
    if (consulta.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const r = consulta.rows[0];
    if (r.conductor_id !== req.usuario.id && r.propietario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No puedes generar el contrato de una reserva ajena.' });
    }
    if (!ESTADOS_CON_CONTRATO.includes(r.estado)) {
      return res.status(422).json({ error: 'Solo se genera contrato de una reserva confirmada.' });
    }

    const existente = await db.query('SELECT id FROM contratos WHERE reserva_id = $1', [reserva_id]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Esta reserva ya tiene un contrato generado.' });
    }

    const vehiculo = `${r.marca} ${r.modelo} ${r.anio} (${r.patente})`;

    // Se piden a pagos-service los importes efectivamente cobrados, para no duplicar
    // aqui el calculo de la garantia y la comision
    const pago = await obtenerPago(reserva_id, req.headers.authorization);

    const pdf = await generarContratoPdf({
      reserva_id: r.id,
      arrendador: r.arrendador,
      arrendatario: r.arrendatario,
      vehiculo,
      monto: r.monto_total,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      garantia: pago ? pago.garantia : undefined,
      comision: pago ? pago.comision : undefined,
      metodo: pago ? pago.metodo : undefined,
    });

    const resultado = await db.query(
      `INSERT INTO contratos
         (reserva_id, arrendador, arrendatario, vehiculo, monto, fecha_inicio, fecha_fin, pdf)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, reserva_id, arrendador, arrendatario, vehiculo, monto, fecha_inicio, fecha_fin, creado_en`,
      [reserva_id, r.arrendador, r.arrendatario, vehiculo, r.monto_total, r.fecha_inicio, r.fecha_fin, pdf]
    );

    return res.status(201).json({
      mensaje: 'Contrato generado.',
      contrato: resultado.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al generar el contrato.' });
  }
};

// GET /api/contratos/mios - contratos donde el usuario es arrendador o arrendatario.
const getMisContratos = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT c.id, c.reserva_id, c.arrendador, c.arrendatario, c.vehiculo,
              c.monto, c.fecha_inicio, c.fecha_fin, c.creado_en
       FROM contratos c
       JOIN reservas r ON c.reserva_id = r.id
       JOIN vehiculos v ON r.vehiculo_id = v.id
       WHERE r.conductor_id = $1 OR v.propietario_id = $1
       ORDER BY c.creado_en DESC`,
      [req.usuario.id]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los contratos.' });
  }
};

// GET /api/contratos/reserva/:reservaId - metadatos del contrato de una reserva.
const getContratoReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const resultado = await db.query(
      `SELECT id, reserva_id, arrendador, arrendatario, vehiculo, monto, fecha_inicio, fecha_fin, creado_en
       FROM contratos WHERE reserva_id = $1`,
      [reservaId]
    );
    return res.status(200).json({ contrato: resultado.rows[0] || null });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el contrato.' });
  }
};

// GET /api/contratos/:id/pdf - descarga el PDF (solo las partes del contrato).
const descargarPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await db.query(
      `SELECT c.pdf, c.reserva_id
       FROM contratos c
       JOIN reservas r ON c.reserva_id = r.id
       JOIN vehiculos v ON r.vehiculo_id = v.id
       WHERE c.id = $1 AND (r.conductor_id = $2 OR v.propietario_id = $2)`,
      [id, req.usuario.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado.' });
    }

    const { pdf, reserva_id } = resultado.rows[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-reserva-${reserva_id}.pdf"`);
    return res.status(200).send(pdf);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el contrato.' });
  }
};

module.exports = { generarContrato, getMisContratos, getContratoReserva, descargarPdf };
