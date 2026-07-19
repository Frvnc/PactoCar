// ARCHIVO DE DEMOSTRACION - credenciales FALSAS
// Sirve unicamente para comprobar que el pipeline intercepta secretos filtrados.
// No corresponde a ninguna cuenta real y debe borrarse tras la demostracion.

const configuracionPasarela = {
  region: 'us-east-1',
  aws_access_key_id: 'AKIA3F7QK2WD9XZL5RTM',
  aws_secret_access_key: 'hT4mQz8Kd2Rv6WpXcB1nY7sLgA5eJ3fUiO9tZrNq',
  endpoint: 'https://pasarela.example.com',
};

module.exports = { configuracionPasarela };
