const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const db = require('./db');
const pagosRoutes = require('./routes/pagos.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/pagos', pagosRoutes);

app.get('/api/ping', async (req, res) => {
  try {
    await db.query('SELECT NOW()');
    return res.status(200).json({ mensaje: 'pagos-service OK. Base de datos conectada.' });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo conectar a la base de datos.' });
  }
});

const PORT = process.env.PORT || 3005;

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      await db.query(sql);
      app.listen(PORT, () => {
        process.stdout.write(`pagos-service corriendo en el puerto ${PORT}\n`);
      });
    } catch (err) {
      process.stderr.write(`Error al inicializar el servicio de pagos: ${err.message}\n`);
      process.exit(1);
    }
  })();
}

module.exports = app;
