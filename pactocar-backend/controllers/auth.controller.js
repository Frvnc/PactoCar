const bcrypt = require('bcryptjs');
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

    const verificado = Number(rol_id) === 1;

    const resultado = await db.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, verificado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre_completo, email, rol_id, activo, verificado`,
      [nombre_completo, email, password_hash, Number(rol_id), verificado]
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
      { id: usuario.id, rol_id: usuario.rol_id, verificado: usuario.verificado },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol_id: usuario.rol_id,
        verificado: usuario.verificado,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
};

const editarPerfil = async (req, res) => {
  try {
    const { nombre_completo, password_actual, password_nueva } = req.body;

    if (!nombre_completo || !password_actual) {
      return res.status(400).json({ error: 'Nombre y contrasena actual son obligatorios.' });
    }

    const resultado = await db.query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const passwordValida = await bcrypt.compare(password_actual, resultado.rows[0].password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'La contrasena actual es incorrecta.' });
    }

    let nuevoHash = resultado.rows[0].password_hash;
    if (password_nueva) {
      if (password_nueva.length < 8) {
        return res.status(422).json({ error: 'La nueva contrasena debe tener al menos 8 caracteres.' });
      }
      nuevoHash = await bcrypt.hash(password_nueva, SALT_ROUNDS);
    }

    const actualizado = await db.query(
      `UPDATE usuarios SET nombre_completo = $1, password_hash = $2
       WHERE id = $3
       RETURNING id, nombre_completo, email, rol_id`,
      [nombre_completo, nuevoHash, req.usuario.id]
    );

    return res.status(200).json({ usuario: actualizado.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el perfil.' });
  }
};

module.exports = { register, login, editarPerfil };
