const bcrypt = require('bcryptjs');
const db = require('./db');

const SALT_ROUNDS = 10;

// Crea la cuenta de administrador la primera vez que arranca contra una base vacia
//
// El registro publico solo permite Propietario y Conductor, asi que sin esto no
// existiria ningun admin y nadie podria aprobar las verificaciones de cuenta,
// que son requisito para publicar vehiculos y para reservar
//
// La contrasena llega por variable de entorno y nunca se escribe en el repositorio
const asegurarAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    return { creado: false, motivo: 'ADMIN_EMAIL o ADMIN_PASSWORD no definidos' };
  }

  const existente = await db.query('SELECT id FROM usuarios WHERE rol_id = 1 LIMIT 1');
  if (existente.rows.length > 0) {
    return { creado: false, motivo: 'ya existe un administrador' };
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.query(
    `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, verificado)
     VALUES ($1, $2, $3, 1, TRUE)
     ON CONFLICT (email) DO NOTHING`,
    ['Administrador', email, password_hash]
  );

  return { creado: true };
};

module.exports = asegurarAdmin;
