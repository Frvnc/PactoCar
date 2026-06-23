const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const ROLES_VALIDOS = [1, 2, 3];
const SALT_ROUNDS = 10;

const register = async (req, res) => {
  try {
    const { nombre_completo, email, password, rol_id } = req.body;

    if (!nombre_completo || !email || !password || !rol_id) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (!ROLES_VALIDOS.includes(Number(rol_id))) {
      return res.status(422).json({ error: 'El rol seleccionado no es válido.' });
    }

    if (password.length < 8) {
      return res.status(422).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const usuarioExistente = await db.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ingresado ya está registrado.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const resultado = await db.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre_completo, email, rol_id, activo`,
      [nombre_completo, email, password_hash, Number(rol_id)]
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado con éxito.',
      usuario: resultado.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al registrar el usuario.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const resultado = await db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const usuario = resultado.rows[0];

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario suspendido. Contacte a soporte.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol_id: usuario.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        rol_id: usuario.rol_id,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
};

module.exports = { register, login };
