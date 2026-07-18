import { useDialog } from '../hooks/useDialog';

// Terminos y condiciones de la plataforma. Se referencian tambien en el contrato
// PDF que emite el modulo de contratos, por eso las clausulas deben coincidir
const SECCIONES = [
  {
    titulo: '1. Objeto de la plataforma',
    texto: 'PactoCar es una plataforma que conecta a propietarios de vehiculos con conductores interesados en arrendarlos. PactoCar no es propietaria de los vehiculos publicados ni parte del contrato de arriendo: actua como intermediario tecnologico y custodio de la garantia.',
  },
  {
    titulo: '2. Registro y verificacion',
    texto: 'Para publicar un vehiculo o realizar una reserva es obligatorio completar el proceso de verificacion de identidad. El propietario debe acreditar el seguro vigente del vehiculo; el conductor, una licencia de conducir valida y acorde a la clase del vehiculo. Un administrador revisa y aprueba cada solicitud.',
  },
  {
    titulo: '3. Reservas y pagos',
    texto: 'El arriendo se paga por adelantado a traves de la plataforma. Sobre el monto del arriendo se aplica una comision del 10% para la plataforma y se retiene una garantia equivalente al 20% en custodia (escrow). El arriendo no puede iniciarse mientras el pago no este registrado.',
  },
  {
    titulo: '4. Garantia en custodia',
    texto: 'La garantia se mantiene retenida durante todo el periodo de arriendo y se libera al conductor una vez que el propietario confirma la devolucion del vehiculo sin danos. En caso de dano, perdida o infraccion, la plataforma podra retenerla total o parcialmente para cubrir los costos correspondientes.',
  },
  {
    titulo: '5. Cancelaciones y reembolsos',
    texto: 'Una reserva puede cancelarse mientras no haya comenzado el arriendo. Si la reserva ya estaba pagada, el monto se reembolsa integramente al conductor.',
  },
  {
    titulo: '6. Obligaciones del conductor',
    texto: 'El conductor recibe el vehiculo en las condiciones acordadas y se compromete a devolverlo en el mismo estado, salvo el desgaste normal por uso. No puede cederlo a terceros ni destinarlo a un uso distinto del pactado.',
  },
  {
    titulo: '7. Contrato digital',
    texto: 'Cada arriendo pagado genera automaticamente un contrato en formato PDF con la identificacion de las partes, los datos del vehiculo y los montos involucrados. Ese documento constituye el respaldo formal de la transaccion y se rige por la legislacion chilena vigente.',
  },
  {
    titulo: '8. Reputacion',
    texto: 'Al finalizar el arriendo, ambas partes pueden calificarse mutuamente con un puntaje de 1 a 5 y un comentario. Las calificaciones son publicas dentro de la plataforma y no pueden editarse una vez enviadas.',
  },
  {
    titulo: '9. Datos personales',
    texto: 'Los datos entregados durante el registro y la verificacion se utilizan unicamente para validar la identidad de los usuarios y para emitir los contratos. No se comparten con terceros ajenos a la operacion.',
  },
];

const TerminosModal = ({ onCerrar }) => {
  const dialogRef = useDialog(onCerrar);

  return (
    <div className="panel-overlay" onClick={onCerrar}>
      <div
        className="panel panel-ancho"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terminos-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="panel-title" id="terminos-title">Terminos y condiciones</span>
          <button className="btn-link" onClick={onCerrar} aria-label="Cerrar terminos y condiciones">
            Cerrar
          </button>
        </div>

        <p className="terminos-intro">
          Al crear una cuenta en PactoCar aceptas las condiciones descritas a continuacion.
        </p>

        {SECCIONES.map((s) => (
          <section key={s.titulo} className="terminos-seccion">
            <h3 className="terminos-titulo">{s.titulo}</h3>
            <p className="terminos-texto">{s.texto}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default TerminosModal;
