const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

async function seed() {
  const PASSWORD = 'Demo2026!';
  const hash = await bcrypt.hash(PASSWORD, 10);

  await db.query(
    `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, activo, verificado)
     VALUES
       ('Admin PactoCar',   'admin@pactocar.cl',       $1, 1, true, true),
       ('Carlos Mendoza',   'propietario@pactocar.cl', $1, 2, true, true),
       ('Maria Gonzalez',   'conductora@pactocar.cl',  $1, 3, true, true)
     ON CONFLICT (email) DO NOTHING`,
    [hash]
  );

  const { rows: [prop] } = await db.query(
    `SELECT id FROM usuarios WHERE email = 'propietario@pactocar.cl'`
  );

  if (prop) {
    await db.query(
      `INSERT INTO vehiculos (propietario_id, marca, modelo, anio, patente, precio_diario_clp, disponible, imagen_url)
       VALUES
         ($1, 'Toyota',  'Corolla', 2022, 'ABCD12', 25000, true, 'https://picsum.photos/seed/corolla22/600/300'),
         ($1, 'Suzuki',  'Swift',   2021, 'EFGH34', 18000, true, 'https://picsum.photos/seed/swift21/600/300'),
         ($1, 'Hyundai', 'Tucson',  2023, 'IJKL56', 45000, true, 'https://picsum.photos/seed/tucson23/600/300')
       ON CONFLICT (patente) DO NOTHING`,
      [prop.id]
    );
    await db.query(
      `INSERT INTO solicitudes_verificacion
         (usuario_id, rut, aseguradora, numero_poliza, vencimiento_seguro, estado)
       VALUES ($1, '12345678-9', 'HDI Seguros', 'POL-2026-001', '2027-12-31', 'aprobado')
       ON CONFLICT (usuario_id) DO NOTHING`,
      [prop.id]
    );
  }

  const { rows: [cond] } = await db.query(
    `SELECT id FROM usuarios WHERE email = 'conductora@pactocar.cl'`
  );

  if (cond) {
    await db.query(
      `INSERT INTO solicitudes_verificacion
         (usuario_id, rut, numero_licencia, clase_licencia, vencimiento_licencia, estado)
       VALUES ($1, '98765432-1', 'B-654321', 'B', '2028-06-30', 'aprobado')
       ON CONFLICT (usuario_id) DO NOTHING`,
      [cond.id]
    );
  }

  process.stdout.write('\nDatos de demo creados exitosamente:\n');
  process.stdout.write('  admin@pactocar.cl        → Administrador\n');
  process.stdout.write('  propietario@pactocar.cl  → Propietario (3 vehiculos)\n');
  process.stdout.write('  conductora@pactocar.cl   → Conductora verificada\n');
  process.stdout.write(`  Contrasena para todos: ${PASSWORD}\n\n`);
  process.exit(0);
}

seed().catch((err) => {
  process.stderr.write(`Error en seed: ${err.message}\n`);
  process.exit(1);
});
