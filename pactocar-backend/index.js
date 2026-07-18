const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const asegurarAdmin = require('./bootstrap-admin');
const authRoutes = require('./routes/auth.routes');
const vehiculosRoutes = require('./routes/vehiculos.routes');
const adminRoutes = require('./routes/admin.routes');
const reservasRoutes = require('./routes/reservas.routes');
const verificacionRoutes = require('./routes/verificacion.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/verificacion', verificacionRoutes);

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

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      await db.query(sql);

      const admin = await asegurarAdmin();
      if (admin.creado) {
        process.stdout.write('Cuenta de administrador creada\n');
      }

      app.listen(PORT, () => {
        process.stdout.write(`Servidor corriendo en el puerto ${PORT}\n`);
      });
    } catch (err) {
      process.stderr.write(`Error al inicializar la base de datos: ${err.message}\n`);
      process.exit(1);
    }
  })();
}

module.exports = app;
