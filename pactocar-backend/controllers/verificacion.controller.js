const db = require('../db');

const enviarSolicitud = async (req, res) => {
  try {
    const { id: usuario_id, rol_id } = req.usuario;
    const {
      rut,
      numero_licencia, clase_licencia, vencimiento_licencia,
      aseguradora, numero_poliza, vencimiento_seguro,
    } = req.body;

    if (!rut) {
      return res.status(400).json({ error: 'El RUT es obligatorio.' });
    }

    if (rol_id === 3) {
      if (!numero_licencia || !clase_licencia || !vencimiento_licencia) {
        return res.status(400).json({ error: 'Numero de licencia, clase y vencimiento son obligatorios para conductores.' });
      }
    } else if (rol_id === 2) {
      if (!aseguradora || !numero_poliza || !vencimiento_seguro) {
        return res.status(400).json({ error: 'Aseguradora, numero de poliza y vencimiento son obligatorios para propietarios.' });
      }
    }

    const resultado = await db.query(
      `INSERT INTO solicitudes_verificacion
         (usuario_id, rut, numero_licencia, clase_licencia, vencimiento_licencia,
          aseguradora, numero_poliza, vencimiento_seguro, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendiente')
       ON CONFLICT (usuario_id) DO UPDATE SET
         rut                = EXCLUDED.rut,
         numero_licencia    = EXCLUDED.numero_licencia,
         clase_licencia     = EXCLUDED.clase_licencia,
         vencimiento_licencia = EXCLUDED.vencimiento_licencia,
         aseguradora        = EXCLUDED.aseguradora,
         numero_poliza      = EXCLUDED.numero_poliza,
         vencimiento_seguro = EXCLUDED.vencimiento_seguro,
         estado             = 'pendiente',
         mensaje_rechazo    = NULL
       RETURNING *`,
      [
        usuario_id, rut,
        numero_licencia || null, clase_licencia || null, vencimiento_licencia || null,
        aseguradora || null, numero_poliza || null, vencimiento_seguro || null,
      ]
    );

    return res.status(201).json({ solicitud: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al enviar la solicitud.' });
  }
};

const getMiSolicitud = async (req, res) => {
  try {
    const resultado = await db.query(
      'SELECT * FROM solicitudes_verificacion WHERE usuario_id = $1',
      [req.usuario.id]
    );
    return res.status(200).json({ solicitud: resultado.rows[0] || null });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener la solicitud.' });
  }
};

module.exports = { enviarSolicitud, getMiSolicitud };
