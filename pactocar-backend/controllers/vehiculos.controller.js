const db = require('../db');

const ANIO_MINIMO = 1950;

const publicarVehiculo = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Solo los propietarios pueden publicar vehículos.' });
    }

    const { marca, modelo, anio, patente, precio_diario_clp, imagen_url } = req.body;

    if (!marca || !modelo || !anio || !patente || !precio_diario_clp) {
      return res.status(400).json({ error: 'Todos los campos del vehículo son obligatorios.' });
    }

    const anioActual = new Date().getFullYear();
    if (!Number.isInteger(Number(anio)) || anio < ANIO_MINIMO || anio > anioActual + 1) {
      return res.status(422).json({ error: `El año debe estar entre ${ANIO_MINIMO} y ${anioActual + 1}.` });
    }

    if (!Number.isInteger(Number(precio_diario_clp)) || precio_diario_clp <= 0) {
      return res.status(422).json({ error: 'El precio diario debe ser un valor positivo.' });
    }

    const resultado = await db.query(
      `INSERT INTO vehiculos (propietario_id, marca, modelo, anio, patente, precio_diario_clp, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.usuario.id, marca, modelo, anio, patente, precio_diario_clp, imagen_url || null]
    );

    return res.status(201).json({
      mensaje: 'Vehículo publicado en el catálogo.',
      vehiculo: resultado.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Esta patente ya se encuentra registrada.' });
    }
    return res.status(500).json({ error: 'Error interno al publicar el vehículo.' });
  }
};

const getCatalogo = async (req, res) => {
  try {
    const catalogo = await db.query(
      `SELECT v.*, u.nombre_completo AS propietario_nombre
       FROM vehiculos v
       JOIN usuarios u ON v.propietario_id = u.id
       WHERE v.disponible = true
       ORDER BY v.creado_en DESC`
    );
    return res.status(200).json(catalogo.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el catálogo.' });
  }
};

const getMisVehiculos = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const resultado = await db.query(
      'SELECT * FROM vehiculos WHERE propietario_id = $1',
      [req.usuario.id]
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener tus vehículos.' });
  }
};

const toggleDisponibleVehiculo = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Solo los propietarios pueden gestionar vehiculos.' });
    }
    const check = await db.query(
      'SELECT id, disponible FROM vehiculos WHERE id = $1 AND propietario_id = $2',
      [req.params.id, req.usuario.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Vehiculo no encontrado.' });
    }
    const resultado = await db.query(
      'UPDATE vehiculos SET disponible = $1 WHERE id = $2 RETURNING *',
      [!check.rows[0].disponible, req.params.id]
    );
    return res.status(200).json({ vehiculo: resultado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el vehiculo.' });
  }
};

module.exports = { publicarVehiculo, getCatalogo, getMisVehiculos, toggleDisponibleVehiculo };
