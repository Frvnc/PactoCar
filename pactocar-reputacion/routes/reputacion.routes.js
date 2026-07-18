const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const {
  crearCalificacion,
  getReputacionUsuario,
  getResumen,
  getMisCalificaciones,
  getCalificacionesReserva,
} = require('../controllers/reputacion.controller');

router.post('/', verificarToken, crearCalificacion);
router.get('/resumen', verificarToken, getResumen);
router.get('/mias', verificarToken, getMisCalificaciones);
router.get('/usuario/:usuarioId', verificarToken, getReputacionUsuario);
router.get('/reserva/:reservaId', verificarToken, getCalificacionesReserva);

module.exports = router;
