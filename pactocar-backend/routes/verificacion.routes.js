const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const { enviarSolicitud, getMiSolicitud } = require('../controllers/verificacion.controller');

router.post('/', verificarToken, enviarSolicitud);
router.get('/mia', verificarToken, getMiSolicitud);

module.exports = router;
