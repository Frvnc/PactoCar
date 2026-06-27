const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const { getUsuarios, actualizarUsuario, getVerificaciones, gestionarVerificacion, getEstadisticas, getFotosPendientes, gestionarFoto } = require('../controllers/admin.controller');

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol_id !== 1) {
    return res.status(403).json({ error: 'Acceso restringido a administradores.' });
  }
  next();
};

router.get('/estadisticas', verificarToken, soloAdmin, getEstadisticas);
router.get('/usuarios', verificarToken, soloAdmin, getUsuarios);
router.patch('/usuarios/:id', verificarToken, soloAdmin, actualizarUsuario);
router.get('/verificaciones', verificarToken, soloAdmin, getVerificaciones);
router.patch('/verificaciones/:id', verificarToken, soloAdmin, gestionarVerificacion);
router.get('/fotos', verificarToken, soloAdmin, getFotosPendientes);
router.patch('/fotos/:id', verificarToken, soloAdmin, gestionarFoto);

module.exports = router;
