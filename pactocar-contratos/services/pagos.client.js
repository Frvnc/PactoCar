// Cliente HTTP hacia pagos-service
//
// Comunicacion inter-modulo: al emitir el contrato, contratos-service le pide a
// pagos-service los importes reales del cobro (monto, garantia retenida y comision)
// para reflejarlos en el PDF. Es una llamada HTTP real entre dos contenedores
// independientes; en la nube viaja por el ALB, que enruta /api/pagos al servicio
// correspondiente

const PAGOS_URL = process.env.PAGOS_URL || 'http://localhost:3005';
const TIMEOUT_MS = 5000;

// Obtiene el pago asociado a una reserva
// El contrato se emite igual aunque pagos-service no responda: en ese caso el PDF
// cae a los importes calculados localmente, por eso ningun error se propaga
// Devuelve el pago, o null si no se pudo obtener
const obtenerPago = async (reservaId, autorizacion) => {
  try {
    const respuesta = await fetch(`${PAGOS_URL}/api/pagos/reserva/${reservaId}`, {
      headers: { Authorization: autorizacion || '' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (respuesta.status !== 200) {
      return null;
    }

    const cuerpo = await respuesta.json();
    return cuerpo.pago || null;
  } catch (error) {
    return null;
  }
};

module.exports = { obtenerPago };
