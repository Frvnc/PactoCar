const db = require('../db');

const ESTADOS_VALIDOS = ['pendiente', 'confirmada', 'en_curso', 'finalizada', 'cancelada'];

// Transiciones permitidas del ciclo de vida de una reserva.
// pendiente -> confirmada -> en_curso -> finalizada  (o cancelada mientras no haya empezado)
const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['en_curso', 'cancelada'],
  en_curso: ['finalizada'],
  finalizada: [],
  cancelada: [],
};

const MS_POR_DIA = 1000 * 60 * 60 * 24;

const crearReserva = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 3) {
      return res.status(403).json({ error: 'Solo los conductores pueden crear reservas.' });
    }

    const { vehiculo_id, fecha_inicio, fecha_fin } = req.body;

    if (!vehiculo_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const hoy = new Date().toISOString().split('T')[0];
    if (fecha_inicio < hoy) {
      return res.status(422).json({ error: 'La fecha de inicio no puede ser en el pasado.' });
    }
    if (fecha_inicio >= fecha_fin) {
      return res.status(422).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin.' });
    }

    const vehiculo = await db.query(
      'SELECT id, propietario_id, disponible, precio_diario_clp FROM vehiculos WHERE id = $1',
      [vehiculo_id]
    );
    if (vehiculo.rows.length === 0) {
      return res.status(404).json({ error: 'Vehiculo no encontrado.' });
    }
    if (!vehiculo.rows[0].disponible) {
      return res.status(422).json({ error: 'El vehiculo no esta disponible.' });
    }

    const conflicto = await db.query(
      `SELECT id FROM reservas
       WHERE vehiculo_id = $1
         AND estado != 'cancelada'
         AND NOT (fecha_fin < $2 OR fecha_inicio > $3)`,
      [vehiculo_id, fecha_inicio, fecha_fin]
    );
    if (conflicto.rows.length > 0) {
      return res.status(422).json({ error: 'El vehiculo ya tiene una reserva en esas fechas.' });
    }

    const dias = Math.round((new Date(fecha_fin) - new Date(fecha_inicio)) / MS_POR_DIA);
    const monto_total = dias * vehiculo.rows[0].precio_diario_clp;

    const resultado = await db.query(
      `INSERT INTO reservas (vehiculo_id, conductor_id, fecha_inicio, fecha_fin, monto_total)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehiculo_id, req.usuario.id, fecha_inicio, fecha_fin, monto_total]
    );

    return res.status(201).json({ reserva: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear la reserva.' });
  }
};

const getMisReservas = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 3) {
      return res.status(403).json({ error: 'Solo los conductores pueden ver sus reservas.' });
    }

    const resultado = await db.query(
      `SELECT r.id, r.fecha_inicio, r.fecha_fin, r.monto_total, r.estado, r.creado_en,
              v.marca, v.modelo, v.anio, v.patente, v.precio_diario_clp
       FROM reservas r
       JOIN vehiculos v ON r.vehiculo_id = v.id
       WHERE r.conductor_id = $1
       ORDER BY r.creado_en DESC`,
      [req.usuario.id]
    );

    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las reservas.' });
  }
};

const getReservasVehiculos = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Solo los propietarios pueden ver estas reservas.' });
    }

    const resultado = await db.query(
      `SELECT r.id, r.fecha_inicio, r.fecha_fin, r.monto_total, r.estado, r.creado_en,
              v.marca, v.modelo, v.patente, v.precio_diario_clp,
              u.nombre_completo AS conductor_nombre, u.email AS conductor_email
       FROM reservas r
       JOIN vehiculos v ON r.vehiculo_id = v.id
       JOIN usuarios u ON r.conductor_id = u.id
       WHERE v.propietario_id = $1
       ORDER BY r.creado_en DESC`,
      [req.usuario.id]
    );

    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las reservas.' });
  }
};

const actualizarEstadoReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { rol_id, id: usuario_id } = req.usuario;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(422).json({ error: 'Estado no valido.' });
    }

    let reservaActual;
    if (rol_id === 3) {
      if (estado !== 'cancelada') {
        return res.status(403).json({ error: 'Los conductores solo pueden cancelar sus reservas.' });
      }
      const check = await db.query(
        'SELECT id, estado FROM reservas WHERE id = $1 AND conductor_id = $2',
        [id, usuario_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Reserva no encontrada.' });
      }
      reservaActual = check.rows[0];
    } else if (rol_id === 2) {
      const check = await db.query(
        `SELECT r.id, r.estado FROM reservas r
         JOIN vehiculos v ON r.vehiculo_id = v.id
         WHERE r.id = $1 AND v.propietario_id = $2`,
        [id, usuario_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Reserva no encontrada.' });
      }
      reservaActual = check.rows[0];
    } else {
      return res.status(403).json({ error: 'Solo propietarios y conductores pueden gestionar reservas.' });
    }

    const permitidas = TRANSICIONES[reservaActual.estado] || [];
    if (!permitidas.includes(estado)) {
      return res.status(422).json({
        error: `No se puede cambiar la reserva de "${reservaActual.estado}" a "${estado}".`,
      });
    }

    const resultado = await db.query(
      'UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );

    return res.status(200).json({ reserva: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar la reserva.' });
  }
};

module.exports = { crearReserva, getMisReservas, getReservasVehiculos, actualizarEstadoReserva };
