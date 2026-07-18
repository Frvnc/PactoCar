const PDFDocument = require('pdfkit');

const GARANTIA_PORCENTAJE = 0.2;
const ACENTO = '#d97706';
const GRIS = '#475569';
const TENUE = '#94a3b8';

const formatoCLP = (valor) => `$${Number(valor || 0).toLocaleString('es-CL')}`;

const soloFecha = (valor) =>
  valor instanceof Date ? valor.toISOString().split('T')[0] : String(valor).split('T')[0];

const folioDe = (reservaId, fecha) => {
  const anio = soloFecha(fecha).split('-')[0];
  return `PC-${anio}-${String(reservaId).padStart(5, '0')}`;
};

const CLAUSULAS = [
  'El ARRENDATARIO recibe el vehiculo en las condiciones acordadas y se compromete a devolverlo en el mismo estado, salvo el desgaste normal por uso.',
  'El ARRENDADOR declara que el vehiculo cuenta con la documentacion vigente (permiso de circulacion, revision tecnica) y con seguro obligatorio al dia.',
  'La garantia indicada se retiene en custodia por la plataforma (escrow) y se libera al ARRENDATARIO una vez que el ARRENDADOR confirma la devolucion sin danos.',
  'En caso de dano, perdida o infraccion durante el periodo de arriendo, la plataforma podra retener total o parcialmente la garantia para cubrir los costos correspondientes.',
  'Cualquier siniestro, falla mecanica o incidente debe ser reportado de inmediato a traves de la plataforma para iniciar la mediacion.',
  'Este documento constituye el respaldo formal de la transaccion registrada en PactoCar y se rige por la legislacion chilena vigente.',
];

// Dibuja el encabezado con banda de color.
const encabezado = (doc, folio, fechaEmision) => {
  doc.rect(0, 0, doc.page.width, 90).fill(ACENTO);
  doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('PactoCar', 50, 28);
  doc.fontSize(11).font('Helvetica').text('Contrato de Arriendo de Vehiculo', 50, 58);
  doc.fontSize(9).text(`Folio ${folio}`, 0, 30, { align: 'right', width: doc.page.width - 50 });
  doc.text(`Emitido: ${fechaEmision}`, 0, 46, { align: 'right', width: doc.page.width - 50 });
  doc.fillColor('#000000');
  doc.y = 120;
};

const tituloSeccion = (doc, texto) => {
  doc.moveDown(0.6);
  doc.fillColor(ACENTO).font('Helvetica-Bold').fontSize(11).text(texto.toUpperCase());
  doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.5);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
};

const filaDato = (doc, etiqueta, valor) => {
  const y = doc.y;
  doc.fillColor(TENUE).font('Helvetica-Bold').fontSize(9).text(etiqueta.toUpperCase(), 50, y, { width: 170 });
  doc.fillColor('#0f172a').font('Helvetica').fontSize(11).text(valor, 220, y, { width: doc.page.width - 270 });
  doc.moveDown(0.4);
};

// Genera el PDF del contrato en memoria y lo devuelve como Buffer.
const generarContratoPdf = (datos) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const partes = [];
      doc.on('data', (parte) => partes.push(parte));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);

      const fechaEmision = soloFecha(new Date());
      const folio = folioDe(datos.reserva_id, new Date());
      const garantia = Math.round(Number(datos.monto || 0) * GARANTIA_PORCENTAJE);

      encabezado(doc, folio, fechaEmision);

      doc.fillColor(GRIS).fontSize(10).text(
        `En Chile, con fecha ${fechaEmision}, las partes que se individualizan a continuacion acuerdan el arriendo del vehiculo detallado, sujeto a las condiciones de este contrato.`,
        { align: 'justify' }
      );

      tituloSeccion(doc, 'Partes');
      filaDato(doc, 'Arrendador (propietario)', datos.arrendador);
      filaDato(doc, 'Arrendatario (conductor)', datos.arrendatario);

      tituloSeccion(doc, 'Vehiculo');
      filaDato(doc, 'Descripcion', datos.vehiculo);

      tituloSeccion(doc, 'Periodo y montos');
      filaDato(doc, 'Desde', soloFecha(datos.fecha_inicio));
      filaDato(doc, 'Hasta', soloFecha(datos.fecha_fin));
      filaDato(doc, 'Monto del arriendo', formatoCLP(datos.monto));
      filaDato(doc, 'Garantia en custodia', `${formatoCLP(garantia)} (retenida en escrow)`);

      tituloSeccion(doc, 'Condiciones');
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
      CLAUSULAS.forEach((clausula, i) => {
        doc.text(`${i + 1}. ${clausula}`, { align: 'justify' });
        doc.moveDown(0.35);
      });

      // Firmas
      doc.moveDown(3);
      const yFirma = doc.y;
      const anchoCol = (doc.page.width - 100) / 2;
      doc.strokeColor('#94a3b8');
      doc.moveTo(50, yFirma).lineTo(50 + anchoCol - 20, yFirma).stroke();
      doc.moveTo(50 + anchoCol + 20, yFirma).lineTo(doc.page.width - 50, yFirma).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
      doc.text(datos.arrendador, 50, yFirma + 6, { width: anchoCol - 20 });
      doc.text(datos.arrendatario, 50 + anchoCol + 20, yFirma + 6, { width: anchoCol - 20 });
      doc.fillColor(TENUE).font('Helvetica').fontSize(9);
      doc.text(`Arrendador  -  ${fechaEmision}`, 50, yFirma + 22, { width: anchoCol - 20 });
      doc.text(`Arrendatario  -  ${fechaEmision}`, 50 + anchoCol + 20, yFirma + 22, { width: anchoCol - 20 });

      // Pie
      doc.fillColor(TENUE).fontSize(8).text(
        `Documento generado automaticamente por PactoCar - Folio ${folio}. Este contrato no requiere timbre para su validez entre las partes.`,
        50,
        doc.page.height - 60,
        { align: 'center', width: doc.page.width - 100 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

module.exports = { generarContratoPdf };
