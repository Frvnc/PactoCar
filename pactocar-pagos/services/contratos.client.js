// Cliente HTTP hacia contratos-service
//
// Comunicacion inter-modulo: al completarse un pago, pagos-service pide a
// contratos-service que genere el contrato digital de la reserva. Es una llamada
// HTTP real entre dos contenedores independientes; en la nube viaja por el ALB,
// que enruta /api/contratos al servicio correspondiente

const CONTRATOS_URL = process.env.CONTRATOS_URL || 'http://localhost:3006';
const TIMEOUT_MS = 5000;

// Solicita la generacion del contrato de una reserva
// El contrato es un efecto secundario del pago: si contratos-service no responde,
// el pago ya realizado sigue siendo valido, por eso ningun error se propaga
// Devuelve siempre un objeto con el resultado, nunca lanza
const solicitarContrato = async (reservaId, autorizacion) => {
  try {
    const respuesta = await fetch(`${CONTRATOS_URL}/api/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: autorizacion || '',
      },
      body: JSON.stringify({ reserva_id: reservaId }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (respuesta.status === 201) {
      return { generado: true };
    }
    // La reserva ya tenia contrato: no es un fallo, el resultado esperado ya existe
    if (respuesta.status === 409) {
      return { generado: false, motivo: 'El contrato ya existia.' };
    }
    return { generado: false, motivo: `contratos-service respondio ${respuesta.status}.` };
  } catch (error) {
    return { generado: false, motivo: 'No se pudo contactar a contratos-service.' };
  }
};

module.exports = { solicitarContrato };
