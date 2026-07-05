const db = require('../db');

const ROLES_VALIDOS = [1, 2, 3];

const getUsuarios = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT u.id, u.nombre_completo, u.email, u.rol_id, u.activo, u.verificado, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       ORDER BY u.id ASC`
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los usuarios.' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes modificar tu propia cuenta.' });
    }

    const { activo, rol_id, verificado } = req.body;
    const campos = [];
    const valores = [];
    let idx = 1;

    if (activo !== undefined) {
      campos.push(`activo = $${idx++}`);
      valores.push(activo);
    }

    if (rol_id !== undefined) {
      if (!ROLES_VALIDOS.includes(Number(rol_id))) {
        return res.status(422).json({ error: 'Rol no valido.' });
      }
      campos.push(`rol_id = $${idx++}`);
      valores.push(Number(rol_id));
    }

    if (verificado !== undefined) {
      campos.push(`verificado = $${idx++}`);
      valores.push(verificado);
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'Sin cambios que aplicar.' });
    }

    valores.push(Number(id));

    const resultado = await db.query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${idx}
       RETURNING id, nombre_completo, email, rol_id, activo, verificado`,
      valores
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ usuario: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el usuario.' });
  }
};

const getVerificaciones = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT sv.*, u.nombre_completo, u.email, u.rol_id, r.nombre AS rol_nombre
       FROM solicitudes_verificacion sv
       JOIN usuarios u ON sv.usuario_id = u.id
       JOIN roles r ON u.rol_id = r.id
       WHERE sv.estado = 'pendiente'
       ORDER BY sv.creado_en ASC`
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las solicitudes de verificacion.' });
  }
};

const gestionarVerificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion, mensaje_rechazo } = req.body;

    if (!['aprobar', 'rechazar'].includes(accion)) {
      return res.status(422).json({ error: 'Accion no valida. Use "aprobar" o "rechazar".' });
    }

    const check = await db.query(
      `SELECT usuario_id FROM solicitudes_verificacion WHERE id = $1 AND estado = 'pendiente'`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada.' });
    }

    const { usuario_id } = check.rows[0];

    if (accion === 'aprobar') {
      await db.query(
        `UPDATE solicitudes_verificacion SET estado = 'aprobado' WHERE id = $1`,
        [id]
      );
      await db.query(
        `UPDATE usuarios SET verificado = true WHERE id = $1`,
        [usuario_id]
      );
    } else {
      await db.query(
        `UPDATE solicitudes_verificacion SET estado = 'rechazado', mensaje_rechazo = $1 WHERE id = $2`,
        [mensaje_rechazo || 'Documentacion insuficiente o incorrecta.', id]
      );
    }

    return res.status(200).json({
      mensaje: accion === 'aprobar' ? 'Solicitud aprobada.' : 'Solicitud rechazada.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al gestionar la verificacion.' });
  }
};

const getEstadisticas = async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE rol_id != 1) AS total_usuarios,
        (SELECT COUNT(*) FROM vehiculos WHERE disponible = true) AS total_vehiculos,
        (SELECT COUNT(*) FROM reservas WHERE estado = 'pendiente') AS reservas_pendientes,
        (SELECT COUNT(*) FROM reservas WHERE estado = 'confirmada') AS reservas_confirmadas,
        (SELECT COUNT(*) FROM reservas WHERE estado = 'en_curso') AS reservas_en_curso,
        (SELECT COUNT(*) FROM reservas WHERE estado = 'finalizada') AS reservas_finalizadas,
        (SELECT COALESCE(SUM(monto_total), 0) FROM reservas WHERE estado = 'finalizada') AS ingresos_totales
    `);
    return res.status(200).json(resultado.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener estadisticas.' });
  }
};

const getFotosPendientes = async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT v.id, v.marca, v.modelo, v.anio, v.patente, v.imagen_url,
              u.nombre_completo AS propietario_nombre
       FROM vehiculos v
       JOIN usuarios u ON v.propietario_id = u.id
       WHERE v.imagen_url IS NOT NULL AND v.imagen_aprobada = false
       ORDER BY v.creado_en ASC`
    );
    return res.status(200).json(resultado.rows);
  } catch {
    return res.status(500).json({ error: 'Error al obtener fotos pendientes.' });
  }
};

const gestionarFoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion } = req.body;

    if (!['aprobar', 'rechazar'].includes(accion)) {
      return res.status(422).json({ error: 'Accion no valida.' });
    }

    const query = accion === 'aprobar'
      ? 'UPDATE vehiculos SET imagen_aprobada = true WHERE id = $1 RETURNING id'
      : 'UPDATE vehiculos SET imagen_url = null, imagen_aprobada = false WHERE id = $1 RETURNING id';

    const resultado = await db.query(query, [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Vehiculo no encontrado.' });
    }

    return res.status(200).json({ mensaje: accion === 'aprobar' ? 'Foto aprobada.' : 'Foto rechazada.' });
  } catch {
    return res.status(500).json({ error: 'Error al gestionar la foto.' });
  }
};

module.exports = { getUsuarios, actualizarUsuario, getVerificaciones, gestionarVerificacion, getEstadisticas, getFotosPendientes, gestionarFoto };
