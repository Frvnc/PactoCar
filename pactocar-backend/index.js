const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const verificarToken = require('./middlewares/auth');
const authRoutes = require('./routes/auth.routes');
const vehiculosRoutes = require('./routes/vehiculos.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculosRoutes);

app.get('/api/ping', async (req, res) => {
  try {
    const resultado = await db.query('SELECT NOW()');
    return res.status(200).json({
      mensaje: '¡Pong! Base de datos conectada.',
      tiempo: resultado.rows[0].now,
    });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo conectar a la base de datos.' });
  }
});

app.get('/api/admin/dashboard', verificarToken, (req, res) => {
  if (req.usuario.rol_id !== 1) {
    return res.status(403).json({ error: 'Acceso prohibido. Se requieren permisos de Administrador.' });
  }
  return res.status(200).json({
    mensaje: '¡Bienvenido al panel de PactoCar!',
    usuario: req.usuario,
  });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    process.stdout.write(`Servidor corriendo en el puerto ${PORT}\n`);
  });
}

module.exports = app;
