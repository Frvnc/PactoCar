const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const tokenHeader = req.header('Authorization');
  if (!tokenHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Se requiere un token de autenticación.' });
  }

  try {
    const token = tokenHeader.replace('Bearer ', '');
    const payloadVerificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payloadVerificado;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports = verificarToken;
