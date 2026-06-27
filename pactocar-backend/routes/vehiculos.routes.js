const { Router } = require('express');
const verificarToken = require('../middlewares/auth');
const soloVerificado = require('../middlewares/soloVerificado');
const {
  publicarVehiculo,
  getCatalogo,
  getMisVehiculos,
  toggleDisponibleVehiculo,
} = require('../controllers/vehiculos.controller');
const { subirFoto, uploadMiddleware } = require('../controllers/fotos.controller');

const router = Router();

router.get('/', getCatalogo);
router.post('/', verificarToken, soloVerificado, publicarVehiculo);
router.get('/mios', verificarToken, getMisVehiculos);
router.patch('/:id/disponible', verificarToken, soloVerificado, toggleDisponibleVehiculo);
router.post('/foto', verificarToken, soloVerificado, uploadMiddleware, subirFoto);

module.exports = router;
