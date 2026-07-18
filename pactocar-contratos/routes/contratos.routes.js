const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const {
  generarContrato,
  getMisContratos,
  getContratoReserva,
  descargarPdf,
} = require('../controllers/contratos.controller');

router.post('/', verificarToken, generarContrato);
router.get('/mios', verificarToken, getMisContratos);
router.get('/reserva/:reservaId', verificarToken, getContratoReserva);
router.get('/:id/pdf', verificarToken, descargarPdf);

module.exports = router;
