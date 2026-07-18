import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../hooks/useDialog';
import { fmtFecha, fmtHora, ESTADO_LABEL, MODULOS } from '../utils/format';
import { Star } from './Stars';

const { pagos: PAGOS, contratos: CONTRATOS, reputacion: REPUTACION, chat: CHAT } = MODULOS;

const ESTADOS_CON_CONTRATO = ['confirmada', 'en_curso', 'finalizada'];
const clp = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;

// Que significa cada puntaje, para que la nota no sea solo un numero de estrellas
const ETIQUETA_PUNTAJE = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente',
};

const ReservaModal = ({ reserva, onCerrar }) => {
  const { auth } = useContext(AuthContext);
  const { showToast } = useToast();
  const esConductor = auth.usuario?.rol_id === 3;
  // Segun quien mire la reserva, la otra parte es el propietario o el conductor
  const otraParte = esConductor
    ? reserva.propietario_nombre || 'el propietario'
    : reserva.conductor_nombre || 'el conductor';
  const rid = reserva.id;
  const token = auth.token;
  const miId = auth.usuario?.id;

  const [pago, setPago] = useState(null);
  const [contrato, setContrato] = useState(null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [puntaje, setPuntaje] = useState(5);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const finRef = useRef(null);
  const dialogRef = useDialog(onCerrar);

  const headers = { Authorization: `Bearer ${token}` };

  const cargarTodo = useCallback(async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [rp, rc, rk] = await Promise.all([
        axios.get(`${PAGOS}/api/pagos/reserva/${rid}`, { headers: h }),
        axios.get(`${CONTRATOS}/api/contratos/reserva/${rid}`, { headers: h }),
        axios.get(`${REPUTACION}/api/reputacion/reserva/${rid}`, { headers: h }),
      ]);
      setPago(rp.data.pago);
      setContrato(rc.data.contrato);
      setCalificaciones(rk.data);
    } catch {
      /* si un modulo no responde, el resto sigue operando */
    } finally {
      setCargando(false);
    }
  }, [rid, token]);

  const cargarMensajes = useCallback(async () => {
    try {
      const { data } = await axios.get(`${CHAT}/api/chat/${rid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMensajes(data);
    } catch {
      /* ignore */
    }
  }, [rid, token]);

  useEffect(() => {
    cargarTodo();
    cargarMensajes();
  }, [cargarTodo, cargarMensajes]);

  useEffect(() => {
    const intervalo = setInterval(cargarMensajes, 3000);
    return () => clearInterval(intervalo);
  }, [cargarMensajes]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Libera el object URL del PDF al desmontar.
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const yaCalifique = calificaciones.some((c) => c.autor_id === miId);
  const puedePagar = esConductor && !pago && reserva.estado === 'confirmada';
  const puedeLiberar = !esConductor && pago && pago.estado_garantia === 'retenida' && reserva.estado === 'finalizada' && pago.estado !== 'reembolsado';
  const puedeReembolsar = pago && pago.estado === 'pagado' && reserva.estado === 'cancelada';
  const puedeGenerarContrato = !contrato && ESTADOS_CON_CONTRATO.includes(reserva.estado);
  const puedeChatear = reserva.estado !== 'cancelada';
  const puedeCalificar = reserva.estado === 'finalizada' && !yaCalifique;

  const pagar = async () => {
    setOcupado(true);
    try {
      const { data } = await axios.post(`${PAGOS}/api/pagos`, { reserva_id: rid }, { headers });
      setPago(data.pago);
      showToast('Pago realizado. Garantia retenida en escrow.');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al procesar el pago.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const liberar = async () => {
    setOcupado(true);
    try {
      const { data } = await axios.patch(`${PAGOS}/api/pagos/${pago.id}/liberar-garantia`, {}, { headers });
      setPago(data.pago);
      showToast('Garantia liberada al conductor.');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al liberar la garantia.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const reembolsar = async () => {
    setOcupado(true);
    try {
      const { data } = await axios.patch(`${PAGOS}/api/pagos/${pago.id}/reembolsar`, {}, { headers });
      setPago(data.pago);
      showToast('Pago reembolsado al conductor.');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al reembolsar.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const generarContrato = async () => {
    setOcupado(true);
    try {
      const { data } = await axios.post(`${CONTRATOS}/api/contratos`, { reserva_id: rid }, { headers });
      setContrato(data.contrato);
      showToast('Contrato generado.');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al generar el contrato.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const obtenerPdfBlob = async () => {
    const resp = await axios.get(`${CONTRATOS}/api/contratos/${contrato.id}/pdf`, { headers, responseType: 'blob' });
    return URL.createObjectURL(resp.data);
  };

  const verContrato = async () => {
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(await obtenerPdfBlob());
    } catch {
      showToast('Error al cargar el contrato.', 'error');
    }
  };

  const descargarPdf = async () => {
    try {
      const url = await obtenerPdfBlob();
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `contrato-reserva-${rid}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Error al descargar el contrato.', 'error');
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    try {
      await axios.post(`${CHAT}/api/chat/${rid}`, { contenido: texto.trim() }, { headers });
      setTexto('');
      cargarMensajes();
    } catch (er) {
      showToast(er.response?.data?.error || 'Error al enviar el mensaje.', 'error');
    }
  };

  const calificar = async () => {
    setOcupado(true);
    try {
      await axios.post(`${REPUTACION}/api/reputacion`, { reserva_id: rid, puntaje, comentario }, { headers });
      const rk = await axios.get(`${REPUTACION}/api/reputacion/reserva/${rid}`, { headers });
      setCalificaciones(rk.data);
      setComentario('');
      showToast('Calificacion enviada.');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al calificar.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="panel-overlay" onClick={onCerrar}>
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserva-modal-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="panel-title" id="reserva-modal-title">Gestionar reserva</span>
          <button className="btn-link" onClick={onCerrar} aria-label="Cerrar gestion de la reserva">
            Cerrar
          </button>
        </div>

        <div className="reserva-meta" style={{ marginBottom: '4px' }}>
          Reserva #{rid} &middot; {fmtFecha(reserva.fecha_inicio)} &rarr; {fmtFecha(reserva.fecha_fin)}
        </div>
        <div style={{ marginBottom: '16px' }}>
          <span className={`estado estado-${reserva.estado}`}>{ESTADO_LABEL[reserva.estado] || reserva.estado}</span>
        </div>

        {cargando ? (
          <div className="spinner" role="status" aria-label="Cargando datos de la reserva" />
        ) : (
          <>
            {/* ── Pagos / Escrow ─────────────────────────── */}
            <section className="modulo-section" aria-labelledby="sec-pago">
              <h3 className="modulo-title" id="sec-pago">Pago y garantia (escrow)</h3>
              {pago ? (
                <div className="recibo">
                  <div className="recibo-fila"><span>Arriendo</span><span>{clp(pago.monto)}</span></div>
                  <div className="recibo-fila"><span>Comision plataforma (10%)</span><span>{clp(pago.comision)}</span></div>
                  <div className="recibo-fila">
                    <span>Garantia</span>
                    <span>
                      {clp(pago.garantia)}{' '}
                      <span className={`estado estado-${pago.estado_garantia === 'liberada' ? 'finalizada' : 'pendiente'}`}>
                        {pago.estado_garantia}
                      </span>
                    </span>
                  </div>
                  <div className="recibo-fila total"><span>Total cobrado</span><span>{clp(Number(pago.monto) + Number(pago.garantia))}</span></div>
                  <div className="recibo-estado">
                    Estado del pago:{' '}
                    <span className={`estado estado-${pago.estado === 'reembolsado' ? 'cancelada' : 'confirmada'}`}>
                      {pago.estado}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="modulo-info">Aun no se ha registrado el pago.</div>
              )}
              {puedePagar && (
                <button className="btn-sm success" disabled={ocupado} onClick={pagar}>
                  Pagar arriendo
                </button>
              )}
              {puedeLiberar && (
                <button className="btn-sm success" disabled={ocupado} onClick={liberar}>
                  Liberar garantia
                </button>
              )}
              {puedeReembolsar && (
                <button className="btn-sm danger" disabled={ocupado} onClick={reembolsar}>
                  Reembolsar pago
                </button>
              )}
            </section>

            {/* ── Contrato PDF ───────────────────────────── */}
            <section className="modulo-section" aria-labelledby="sec-contrato">
              <h3 className="modulo-title" id="sec-contrato">Contrato digital</h3>
              {contrato ? (
                <>
                  <div>
                    <button className="btn-sm" onClick={verContrato}>Ver contrato</button>
                    <button className="btn-sm" onClick={descargarPdf}>Descargar PDF</button>
                  </div>
                  {pdfUrl && (
                    <iframe title="Vista previa del contrato" src={pdfUrl} className="pdf-preview" />
                  )}
                </>
              ) : puedeGenerarContrato ? (
                <button className="btn-sm" disabled={ocupado} onClick={generarContrato}>
                  Generar contrato
                </button>
              ) : (
                <div className="modulo-info">El contrato se genera cuando la reserva esta confirmada.</div>
              )}
            </section>

            {/* ── Chat ───────────────────────────────────── */}
            <section className="modulo-section" aria-labelledby="sec-chat">
              <h3 className="modulo-title" id="sec-chat">Chat de coordinacion</h3>
              <div className="chat-msgs" role="log" aria-label="Mensajes de la conversacion" aria-live="polite">
                {mensajes.length === 0 ? (
                  <div className="modulo-info">Sin mensajes aun.</div>
                ) : (
                  mensajes.map((m) => {
                    const mio = m.emisor_id === miId;
                    return (
                      <div key={m.id} className={`chat-msg${mio ? ' mio' : ''}`}>
                        <div className="chat-msg-head">
                          <span className="chat-autor">{mio ? 'Tu' : m.emisor_nombre}</span>
                          <span className="chat-hora">{fmtHora(m.creado_en)}</span>
                        </div>
                        {m.contenido}
                      </div>
                    );
                  })
                )}
                <div ref={finRef} />
              </div>
              {puedeChatear && (
                <form onSubmit={enviarMensaje} className="chat-form">
                  <label htmlFor="chat-input" className="sr-only">Escribe un mensaje</label>
                  <input
                    id="chat-input"
                    className="input"
                    placeholder="Escribe un mensaje..."
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    maxLength={1000}
                  />
                  <button type="submit" className="btn-sm success">Enviar</button>
                </form>
              )}
            </section>

            {/* ── Reputacion ─────────────────────────────── */}
            <section className="modulo-section" aria-labelledby="sec-reputacion">
              <h3 className="modulo-title" id="sec-reputacion">Reputacion</h3>
              {calificaciones.length > 0 && (
                <div className="calificacion-lista">
                  {calificaciones.map((c) => (
                    <div key={c.id} className="calificacion-item">
                      <div className="calificacion-cabecera">
                        <span className="calificacion-autor">
                          {c.autor_id === miId ? `Tu calificacion a ${otraParte}` : `${otraParte} te califico`}
                        </span>
                        <span className="stars-inline" role="img" aria-label={`${c.puntaje} de 5 estrellas`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              filled={n <= c.puntaje}
                              size={14}
                              color={n <= c.puntaje ? 'var(--accent)' : 'var(--border)'}
                            />
                          ))}
                          <span className="stars-count">{ETIQUETA_PUNTAJE[c.puntaje]}</span>
                        </span>
                      </div>
                      {c.comentario ? (
                        <blockquote className="calificacion-comentario">{c.comentario}</blockquote>
                      ) : (
                        <div className="calificacion-sin-comentario">Sin comentario</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {puedeCalificar ? (
                <div className="calificar-box">
                  <div className="calificar-pregunta">
                    Como fue tu experiencia con {otraParte}?
                  </div>
                  <div
                    className="stars"
                    role="radiogroup"
                    aria-label="Puntaje de 1 a 5 estrellas"
                    onMouseLeave={() => setHover(0)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={n === puntaje}
                        aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${ETIQUETA_PUNTAJE[n]}`}
                        className="star"
                        onMouseEnter={() => setHover(n)}
                        onFocus={() => setHover(n)}
                        onClick={() => setPuntaje(n)}
                      >
                        <Star
                          filled={n <= (hover || puntaje)}
                          size={30}
                          color={n <= (hover || puntaje) ? 'var(--accent)' : 'var(--border)'}
                        />
                      </button>
                    ))}
                    <span className="calificar-etiqueta">{ETIQUETA_PUNTAJE[hover || puntaje]}</span>
                  </div>
                  <label htmlFor="comentario" className="sr-only">Comentario de la calificacion</label>
                  <textarea
                    id="comentario"
                    className="input"
                    rows={2}
                    style={{ marginBottom: '8px', resize: 'vertical' }}
                    placeholder={`Cuenta como fue el trato con ${otraParte} (opcional)`}
                    value={comentario}
                    maxLength={500}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                  <button className="btn-sm success" disabled={ocupado} onClick={calificar}>
                    Enviar calificacion
                  </button>
                </div>
              ) : reserva.estado !== 'finalizada' ? (
                <div className="modulo-info">Podras calificar cuando la reserva finalice.</div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ReservaModal;
