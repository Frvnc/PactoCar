import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../hooks/useDialog';
import { MODULOS, fmtHora } from '../utils/format';
import Icon from './Icon';

// Bandeja central de conversaciones. Al tocar una, abre el chat de esa reserva.
const MensajesPanel = ({ onCerrar, onAbrirReserva }) => {
  const { auth } = useContext(AuthContext);
  const dialogRef = useDialog(onCerrar);
  const token = auth.token;
  const [convs, setConvs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const { data } = await axios.get(`${MODULOS.chat}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConvs(data);
    } catch {
      /* ignore */
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="panel-overlay" onClick={onCerrar}>
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="msg-panel-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="panel-title" id="msg-panel-title">Mensajes</span>
          <button className="btn-link" onClick={onCerrar} aria-label="Cerrar mensajes">Cerrar</button>
        </div>

        {cargando ? (
          <div className="spinner" role="status" aria-label="Cargando conversaciones" />
        ) : convs.length === 0 ? (
          <div className="empty">
            <span className="empty-icon"><Icon name="chat" size={26} /></span>
            <strong>Sin conversaciones</strong>
            Inicia un chat desde una de tus reservas.
          </div>
        ) : (
          <div className="conv-list">
            {convs.map((c) => (
              <button
                key={c.reserva_id}
                className="conv-item"
                onClick={() =>
                  onAbrirReserva({
                    id: c.reserva_id,
                    estado: c.estado,
                    fecha_inicio: c.fecha_inicio,
                    fecha_fin: c.fecha_fin,
                  })
                }
              >
                <span className="conv-avatar"><Icon name="chat" size={18} /></span>
                <span className="conv-body">
                  <span className="conv-top">
                    <span className="conv-name">{c.marca} {c.modelo}</span>
                    <span className="conv-hora">{fmtHora(c.ultimo)}</span>
                  </span>
                  <span className="conv-sub">{c.otra_parte} &middot; Reserva #{c.reserva_id}</span>
                  <span className="conv-preview">{c.ultimo_mensaje}</span>
                </span>
                {c.no_leidos > 0 && <span className="conv-badge">{c.no_leidos}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MensajesPanel;
