const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const {
  procesarPago,
  getMisPagos,
  getPagoReserva,
  liberarGarantia,
  reembolsar,
} = require('../controllers/pagos.controller');

router.post('/', verificarToken, procesarPago);
router.get('/mios', verificarToken, getMisPagos);
router.get('/reserva/:reservaId', verificarToken, getPagoReserva);
router.patch('/:id/liberar-garantia', verificarToken, liberarGarantia);
router.patch('/:id/reembolsar', verificarToken, reembolsar);

module.exports = router;
