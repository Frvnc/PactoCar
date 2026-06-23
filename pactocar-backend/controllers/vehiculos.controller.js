const db = require('../db');

const publicarVehiculo = async (req, res) => {
  try {
    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Solo los propietarios pueden publicar vehículos.' });
    }

    const { marca, modelo, anio, patente, precio_diario_clp } = req.body;

    if (!marca || !modelo || !anio || !patente || !precio_diario_clp) {
      return res.status(400).json({ error: 'Todos los campos del vehículo son obligatorios.' });
    }

    const resultado = await db.query(
      `INSERT INTO vehiculos (propietario_id, marca, modelo, anio, patente, precio_diario_clp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.usuario.id, marca, modelo, anio, patente, precio_diario_clp]
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
      'SELECT * FROM vehiculos WHERE disponible = true'
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

module.exports = { publicarVehiculo, getCatalogo, getMisVehiculos };
