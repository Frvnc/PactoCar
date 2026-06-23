const { Router } = require('express');
const verificarToken = require('../middlewares/auth');
const {
  publicarVehiculo,
  getCatalogo,
  getMisVehiculos,
} = require('../controllers/vehiculos.controller');

const router = Router();

router.get('/', getCatalogo);
router.post('/', verificarToken, publicarVehiculo);
router.get('/mios', verificarToken, getMisVehiculos);

module.exports = router;
