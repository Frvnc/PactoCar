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
  'El ARRENDATARIO declara contar con licencia de conducir vigente y acorde a la clase del vehiculo, y se obliga a no cederlo a terceros durante el periodo de arriendo.',
  'Las partes declaran haber leido y aceptado los Terminos y Condiciones de PactoCar, disponibles en la plataforma, que forman parte integrante de este contrato.',
  'Este documento constituye el respaldo formal de la transaccion registrada en PactoCar y se rige por la legislacion chilena vigente.',
];

const MARGEN = 50;
const ALTO_BANDA = 78;
// Alto que ocupa el bloque de firmas: si no cabe entero, se pasa a la pagina
// siguiente en vez de partirlo
const ALTO_FIRMAS = 80;

// Dibuja la banda de color superior. Se repite en cada pagina para que un
// contrato de dos hojas no parezca cortado
const encabezado = (doc, folio, fechaEmision) => {
  doc.rect(0, 0, doc.page.width, ALTO_BANDA).fill(ACENTO);
  doc.fillColor('#ffffff').fontSize(21).font('Helvetica-Bold').text('PactoCar', MARGEN, 22);
  doc.fontSize(10).font('Helvetica').text('Contrato de Arriendo de Vehiculo', MARGEN, 50);
  doc.fontSize(8).text(`Folio ${folio}`, 0, 26, { align: 'right', width: doc.page.width - MARGEN });
  doc.text(`Emitido: ${fechaEmision}`, 0, 40, { align: 'right', width: doc.page.width - MARGEN });
  doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
  // Los textos anteriores van en coordenadas absolutas y dejan el cursor dentro
  // de la banda: hay que bajarlo al inicio real del contenido
  doc.x = MARGEN;
  doc.y = doc.page.margins.top;
};

const tituloSeccion = (doc, texto) => {
  doc.moveDown(0.5);
  doc.fillColor(ACENTO).font('Helvetica-Bold').fontSize(10).text(texto.toUpperCase(), MARGEN, doc.y);
  doc.moveTo(MARGEN, doc.y + 2).lineTo(doc.page.width - MARGEN, doc.y + 2).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.45);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
};

const filaDato = (doc, etiqueta, valor) => {
  const y = doc.y;
  doc.fillColor(TENUE).font('Helvetica-Bold').fontSize(7.5).text(etiqueta.toUpperCase(), MARGEN, y + 1.5, { width: 160 });
  doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5).text(valor, 215, y, { width: doc.page.width - 215 - MARGEN });
  doc.moveDown(0.25);
};

// Genera el PDF del contrato en memoria y lo devuelve como Buffer.
const generarContratoPdf = (datos) =>
  new Promise((resolve, reject) => {
    try {
      // El margen superior deja sitio a la banda; bufferPages permite volver al
      // final para numerar las paginas cuando ya se sabe cuantas hay
      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: { top: ALTO_BANDA + 22, bottom: 62, left: MARGEN, right: MARGEN },
      });
      const partes = [];
      doc.on('data', (parte) => partes.push(parte));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);

      const fechaEmision = soloFecha(new Date());
      const folio = folioDe(datos.reserva_id, new Date());

      // La garantia la informa pagos-service con el importe realmente retenido
      // Si no respondio, se cae al calculo local para poder emitir el contrato igual
      const garantiaInformada = datos.garantia !== undefined && datos.garantia !== null;
      const garantia = garantiaInformada
        ? Number(datos.garantia)
        : Math.round(Number(datos.monto || 0) * GARANTIA_PORCENTAJE);

      // Cada pagina nueva repite la banda superior
      doc.on('pageAdded', () => encabezado(doc, folio, fechaEmision));
      encabezado(doc, folio, fechaEmision);

      doc.fillColor(GRIS).fontSize(9).text(
        `En Chile, con fecha ${fechaEmision}, las partes que se individualizan a continuacion acuerdan el arriendo del vehiculo detallado, sujeto a las condiciones de este contrato.`,
        { align: 'justify' }
      );

      tituloSeccion(doc, 'Partes');
      filaDato(doc, 'Arrendador (propietario)', datos.arrendador);
      if (datos.arrendador_rut) filaDato(doc, 'RUT del arrendador', datos.arrendador_rut);
      if (datos.arrendador_email) filaDato(doc, 'Contacto', datos.arrendador_email);
      doc.moveDown(0.3);
      filaDato(doc, 'Arrendatario (conductor)', datos.arrendatario);
      if (datos.arrendatario_rut) filaDato(doc, 'RUT del arrendatario', datos.arrendatario_rut);
      if (datos.numero_licencia) {
        const clase = datos.clase_licencia ? ` (clase ${datos.clase_licencia})` : '';
        filaDato(doc, 'Licencia de conducir', `${datos.numero_licencia}${clase}`);
      }
      if (datos.arrendatario_email) filaDato(doc, 'Contacto', datos.arrendatario_email);

      tituloSeccion(doc, 'Vehiculo');
      if (datos.marca && datos.modelo) {
        filaDato(doc, 'Marca y modelo', `${datos.marca} ${datos.modelo}`);
        if (datos.anio) filaDato(doc, 'Ano', String(datos.anio));
        if (datos.patente) filaDato(doc, 'Placa patente', String(datos.patente).toUpperCase());
      } else {
        filaDato(doc, 'Descripcion', datos.vehiculo);
      }
      if (datos.aseguradora) {
        const poliza = datos.numero_poliza ? ` - poliza ${datos.numero_poliza}` : '';
        filaDato(doc, 'Seguro vigente', `${datos.aseguradora}${poliza}`);
      }

      tituloSeccion(doc, 'Periodo y montos');
      filaDato(doc, 'Desde', soloFecha(datos.fecha_inicio));
      filaDato(doc, 'Hasta', soloFecha(datos.fecha_fin));
      filaDato(doc, 'Monto del arriendo', formatoCLP(datos.monto));
      filaDato(doc, 'Garantia en custodia', `${formatoCLP(garantia)} (retenida en escrow)`);
      if (datos.comision !== undefined && datos.comision !== null) {
        filaDato(doc, 'Comision de la plataforma', formatoCLP(datos.comision));
      }
      if (datos.metodo) {
        filaDato(doc, 'Medio de pago', String(datos.metodo).replace(/_/g, ' '));
      }
      if (garantiaInformada) {
        doc.fillColor(TENUE).font('Helvetica').fontSize(8)
          .text('Importes confirmados por el modulo de pagos.', 220, doc.y);
        doc.moveDown(0.4);
        doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
      }

      tituloSeccion(doc, 'Condiciones');
      doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
      CLAUSULAS.forEach((clausula, i) => {
        doc.text(`${i + 1}. ${clausula}`, MARGEN, doc.y, {
          align: 'justify',
          width: doc.page.width - MARGEN * 2,
        });
        doc.moveDown(0.3);
      });

      // Firmas: si no queda sitio para el bloque entero, se abre pagina nueva
      // antes de dibujarlo, para no dejar las lineas separadas de los nombres
      doc.moveDown(2);
      const limiteInferior = doc.page.height - doc.page.margins.bottom;
      if (doc.y + ALTO_FIRMAS > limiteInferior) {
        doc.addPage();
      }
      const yFirma = doc.y;
      const anchoCol = (doc.page.width - MARGEN * 2) / 2;
      doc.strokeColor('#94a3b8');
      doc.moveTo(50, yFirma).lineTo(50 + anchoCol - 20, yFirma).stroke();
      doc.moveTo(50 + anchoCol + 20, yFirma).lineTo(doc.page.width - 50, yFirma).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
      doc.text(datos.arrendador, 50, yFirma + 6, { width: anchoCol - 20 });
      doc.text(datos.arrendatario, 50 + anchoCol + 20, yFirma + 6, { width: anchoCol - 20 });
      doc.fillColor(TENUE).font('Helvetica').fontSize(9);
      const pieArrendador = datos.arrendador_rut
        ? `Arrendador  -  RUT ${datos.arrendador_rut}`
        : 'Arrendador';
      const pieArrendatario = datos.arrendatario_rut
        ? `Arrendatario  -  RUT ${datos.arrendatario_rut}`
        : 'Arrendatario';
      doc.text(pieArrendador, 50, yFirma + 22, { width: anchoCol - 20 });
      doc.text(pieArrendatario, 50 + anchoCol + 20, yFirma + 22, { width: anchoCol - 20 });
      doc.fontSize(8);
      doc.text(fechaEmision, 50, yFirma + 34, { width: anchoCol - 20 });
      doc.text(fechaEmision, 50 + anchoCol + 20, yFirma + 34, { width: anchoCol - 20 });

      // Pie en todas las paginas, con numeracion, una vez se sabe cuantas hay
      const rango = doc.bufferedPageRange();
      for (let i = 0; i < rango.count; i += 1) {
        doc.switchToPage(rango.start + i);
        // Escribir por debajo del margen inferior haria que PDFKit anadiera una
        // pagina mas por cada pie, asi que se anula mientras se dibuja
        doc.page.margins.bottom = 0;
        doc.fillColor(TENUE).font('Helvetica').fontSize(7).text(
          `Documento generado automaticamente por PactoCar - Folio ${folio}. `
          + 'Este contrato no requiere timbre para su validez entre las partes.',
          MARGEN,
          doc.page.height - 46,
          { align: 'center', width: doc.page.width - MARGEN * 2, lineBreak: false }
        );
        doc.text(
          `Pagina ${i + 1} de ${rango.count}`,
          MARGEN,
          doc.page.height - 34,
          { align: 'center', width: doc.page.width - MARGEN * 2, lineBreak: false }
        );
      }

      doc.flushPages();
      doc.end();
    } catch (err) {
      reject(err);
    }
  });

module.exports = { generarContratoPdf };
