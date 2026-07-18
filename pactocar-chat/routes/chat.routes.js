const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const {
  enviarMensaje,
  getMensajes,
  getConversaciones,
} = require('../controllers/chat.controller');

router.get('/', verificarToken, getConversaciones);
router.post('/:reservaId', verificarToken, enviarMensaje);
router.get('/:reservaId', verificarToken, getMensajes);

module.exports = router;
