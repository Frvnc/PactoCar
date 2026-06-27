const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const soloVerificado = require('../middlewares/soloVerificado');
const {
  crearReserva,
  getMisReservas,
  getReservasVehiculos,
  actualizarEstadoReserva,
} = require('../controllers/reservas.controller');

router.post('/', verificarToken, soloVerificado, crearReserva);
router.get('/mias', verificarToken, getMisReservas);
router.get('/mis-vehiculos', verificarToken, getReservasVehiculos);
router.patch('/:id', verificarToken, soloVerificado, actualizarEstadoReserva);

module.exports = router;
