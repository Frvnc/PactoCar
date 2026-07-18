const PDFDocument = require('pdfkit');

const formatoCLP = (valor) => `$${Number(valor || 0).toLocaleString('es-CL')}`;

const soloFecha = (valor) =>
  valor instanceof Date ? valor.toISOString().split('T')[0] : String(valor).split('T')[0];

// Genera el PDF del contrato en memoria y lo devuelve como Buffer.
// Usa las fuentes AFM estandar embebidas en pdfkit (Helvetica), sin archivos externos.
const generarContratoPdf = (datos) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const partes = [];
      doc.on('data', (parte) => partes.push(parte));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);

      doc.fontSize(22).text('PactoCar', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).text('Contrato de Arriendo de Vehiculo', { align: 'center' });
      doc.moveDown(1.2);

      doc.fontSize(10);
      doc.text(`Contrato asociado a la reserva N ${datos.reserva_id}`);
      doc.text(`Fecha de emision: ${soloFecha(new Date())}`);
      doc.moveDown(1);

      doc.fontSize(12).text('Partes', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Arrendador (propietario): ${datos.arrendador}`);
      doc.text(`Arrendatario (conductor): ${datos.arrendatario}`);
      doc.moveDown(1);

      doc.fontSize(12).text('Vehiculo', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).text(datos.vehiculo);
      doc.moveDown(1);

      doc.fontSize(12).text('Periodo y monto', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Desde: ${soloFecha(datos.fecha_inicio)}`);
      doc.text(`Hasta: ${soloFecha(datos.fecha_fin)}`);
      doc.text(`Monto total del arriendo: ${formatoCLP(datos.monto)}`);
      doc.moveDown(1);

      doc.fontSize(12).text('Condiciones', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9);
      doc.text('1. El arrendatario recibe el vehiculo en las condiciones acordadas y se compromete a devolverlo en el mismo estado.', { align: 'justify' });
      doc.text('2. El arrendador declara que el vehiculo cuenta con la documentacion y el seguro vigentes.', { align: 'justify' });
      doc.text('3. La garantia retenida se libera una vez que el arrendador confirma la devolucion sin danos.', { align: 'justify' });
      doc.text('4. Cualquier siniestro o incidente debe ser reportado de inmediato a traves de la plataforma.', { align: 'justify' });
      doc.moveDown(3);

      doc.fontSize(10);
      doc.text('_______________________________                _______________________________');
      doc.text(`${datos.arrendador}`, { continued: false });
      doc.text('Arrendador                                                    Arrendatario');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

module.exports = { generarContratoPdf };
