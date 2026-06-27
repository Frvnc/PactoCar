import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const CLASES = ['A1', 'A2', 'A3', 'A4', 'B', 'C', 'D', 'E', 'F'];

const FORM_VACIO = {
  rut: '',
  numero_licencia: '', clase_licencia: '', vencimiento_licencia: '',
  aseguradora: '', numero_poliza: '', vencimiento_seguro: '',
};

const VerificacionBanner = ({ embedded = false }) => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const esConductor = auth.usuario?.rol_id === 3;

  const [solicitud, setSolicitud] = useState(undefined);
  const [colapsado, setColapsado] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => {
    const fetchSolicitud = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/verificacion/mia`,
          { headers }
        );
        setSolicitud(data.solicitud);
      } catch {
        setSolicitud(null);
      }
    };
    if (auth.token && (!auth.usuario?.verificado || embedded)) fetchSolicitud();
  }, [auth.token]);

  if (auth.usuario?.verificado) {
    if (!embedded) return null;
    return (
      <div className="verificacion-card estado-aprobado">
        <div className="verificacion-card-title">Cuenta verificada</div>
        <div className="verificacion-card-desc">Tu identidad y documentos han sido aprobados.</div>
      </div>
    );
  }

  if (solicitud === undefined) return null;

  if (!embedded && colapsado) {
    return (
      <div className="verificacion-mini">
        <span>Cuenta sin verificar</span>
        <button className="btn-link" onClick={() => setColapsado(false)}>
          Verificar ahora
        </button>
      </div>
    );
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/verificacion`,
        form,
        { headers }
      );
      setSolicitud(data.solicitud);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (solicitud?.estado === 'pendiente') {
    return (
      <div className="verificacion-card estado-pendiente">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="verificacion-card-title">Solicitud en revision</div>
          {!embedded && (
            <button className="btn-link" onClick={() => setColapsado(true)}>Ocultar</button>
          )}
        </div>
        <div className="verificacion-card-desc">
          Tu documentacion fue enviada y esta siendo revisada por un administrador.
          Podras usar todas las funciones una vez que tu cuenta sea aprobada.
        </div>
      </div>
    );
  }

  if (solicitud?.estado === 'aprobado') {
    return (
      <div className="verificacion-card estado-aprobado">
        <div className="verificacion-card-title">Cuenta aprobada</div>
        <div className="verificacion-card-desc">
          Tu documentacion fue aprobada. Debes cerrar sesion e iniciar de nuevo para activar todas las funciones.
        </div>
        {!embedded && (
          <button
            className="btn"
            style={{ marginTop: '14px', background: '#4ade80', color: '#0f1f0f', border: 'none' }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Cerrar sesion ahora
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="verificacion-card estado-sin-verificar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="verificacion-card-title">
          {solicitud?.estado === 'rechazado' ? 'Solicitud rechazada' : 'Verifica tu cuenta'}
        </div>
        {!embedded && (
          <button className="btn-link" onClick={() => setColapsado(true)}>Verificar mas tarde</button>
        )}
      </div>
      <div className="verificacion-card-desc">
        {solicitud?.estado === 'rechazado' ? (
          <span className="rechazo-msg">Motivo: {solicitud.mensaje_rechazo}</span>
        ) : esConductor ? (
          'Para hacer reservas debes verificar tu licencia de conducir e identidad.'
        ) : (
          'Para publicar vehiculos debes verificar tu identidad y el seguro del vehiculo.'
        )}
        {solicitud?.estado === 'rechazado' && (
          <span style={{ display: 'block', marginTop: '4px', color: 'var(--text-2)' }}>
            Puedes corregir y reenviar tu documentacion.
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>RUT</label>
          <input
            className="input"
            name="rut"
            placeholder="12345678-9"
            value={form.rut}
            onChange={handleChange}
            required
          />
        </div>

        {esConductor ? (
          <>
            <div className="row-2">
              <div className="field">
                <label>Numero de licencia</label>
                <input
                  className="input"
                  name="numero_licencia"
                  placeholder="A1-123456"
                  value={form.numero_licencia}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="field">
                <label>Clase</label>
                <select
                  className="select"
                  name="clase_licencia"
                  value={form.clase_licencia}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar</option>
                  {CLASES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Vencimiento de licencia</label>
              <input
                className="input"
                type="date"
                name="vencimiento_licencia"
                value={form.vencimiento_licencia}
                onChange={handleChange}
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Aseguradora</label>
              <input
                className="input"
                name="aseguradora"
                placeholder="HDI, MAPFRE, Zurich..."
                value={form.aseguradora}
                onChange={handleChange}
                required
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label>Numero de poliza</label>
                <input
                  className="input"
                  name="numero_poliza"
                  placeholder="POL-2026-12345"
                  value={form.numero_poliza}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="field">
                <label>Vencimiento del seguro</label>
                <input
                  className="input"
                  type="date"
                  name="vencimiento_seguro"
                  value={form.vencimiento_seguro}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </>
        )}

        <button type="submit" className="btn" disabled={enviando}>
          {enviando
            ? 'Enviando...'
            : solicitud?.estado === 'rechazado'
            ? 'Reenviar documentacion'
            : 'Enviar documentacion'}
        </button>
      </form>
    </div>
  );
};

export default VerificacionBanner;
