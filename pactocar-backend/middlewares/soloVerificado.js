const soloVerificado = (req, res, next) => {
  if (req.usuario.rol_id === 1 || req.usuario.verificado) {
    return next();
  }
  return res.status(403).json({ error: 'Tu cuenta aun no ha sido verificada por un administrador.' });
};

module.exports = soloVerificado;
