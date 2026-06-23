const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  // 1. Leer el token de los headers de la petición
  const tokenHeader = req.header('Authorization');
  if (!tokenHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Se requiere un token de autenticación.' });
  }

  try {
    // 2. Limpiar el formato (normalmente viene como "Bearer eyJhbG...")
    const token = tokenHeader.replace('Bearer ', '');

    // 3. Verificar que el token sea válido y no haya sido manipulado
    const payloadVerificado = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Inyectar los datos del usuario en la petición para que las rutas puedan usarlos
    req.usuario = payloadVerificado;
    
    // 5. Dar el paso
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports = verificarToken;