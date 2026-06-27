const { Router } = require('express');
const { register, login, editarPerfil } = require('../controllers/auth.controller');
const verificarToken = require('../middlewares/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/perfil', verificarToken, editarPerfil);

module.exports = router;
