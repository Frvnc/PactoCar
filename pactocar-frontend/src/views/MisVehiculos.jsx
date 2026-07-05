import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VerificacionBanner from '../components/VerificacionBanner';
import ProfilePanel from '../components/ProfilePanel';

const FORM_VACIO = { marca: '', modelo: '', anio: '', patente: '', precio_diario_clp: '', imagen_url: '' };

const hoy = new Date().toISOString().split('T')[0];

const getEstado = (r) =>
  r.estado === 'confirmada' && r.fecha_fin < hoy ? 'completada' : r.estado;

const MisVehiculos = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [confirmandoCancelId, setConfirmandoCancelId] = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [seccion, setSeccion] = useState('vehiculos');

  const { showToast } = useToast();
  const headers = { Authorization: `Bearer ${auth.token}` };
  const noVerificado = auth.usuario?.verificado === false;
  const inicial = auth.usuario?.nombre?.charAt(0).toUpperCase() || 'P';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resVeh, resRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/vehiculos/mios`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/reservas/mis-vehiculos`, { headers }),
        ]);
        setVehiculos(resVeh.data);
        setReservas(resRes.data);
      } catch {
        setError('No se pudo cargar la informacion.');
      } finally {
        setCargando(false);
      }
    };
    if (auth.token) fetchData();
  }, [auth.token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFoto = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) {
      setFormError('La imagen no puede superar 5 MB.');
      return;
    }
    setSubiendoFoto(true);
    const formData = new FormData();
    formData.append('foto', archivo);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/vehiculos/foto`,
        formData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setForm((prev) => ({ ...prev, imagen_url: data.url }));
    } catch {
      setFormError('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handlePublicar = async (e) => {
    e.preventDefault();
    setFormError('');
    setEnviando(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/vehiculos`,
        { ...form, anio: Number(form.anio), precio_diario_clp: Number(form.precio_diario_clp) },
        { headers }
      );
      setVehiculos((prev) => [data.vehiculo, ...prev]);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      showToast('Vehiculo publicado correctamente.');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al publicar el vehiculo.');
    } finally {
      setEnviando(false);
    }
  };

  const toggleVehiculo = async (vehiculoId) => {
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/vehiculos/${vehiculoId}/disponible`,
        {},
        { headers }
      );
      setVehiculos((prev) =>
        prev.map((v) => (v.id === vehiculoId ? { ...v, disponible: data.vehiculo.disponible } : v))
      );
      showToast(data.vehiculo.disponible ? 'Vehiculo activado.' : 'Vehiculo desactivado.');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el vehiculo.');
    }
  };

  const MENSAJES_RESERVA = {
    confirmada: ['Reserva confirmada.', 'success'],
    cancelada: ['Reserva cancelada.', 'error'],
    en_curso: ['Arriendo iniciado.', 'success'],
    finalizada: ['Devolucion registrada.', 'success'],
  };

  const cambiarEstadoReserva = async (reservaId, estado) => {
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/reservas/${reservaId}`,
        { estado },
        { headers }
      );
      setReservas((prev) =>
        prev.map((r) => (r.id === reservaId ? { ...r, ...data.reserva } : r))
      );
      setConfirmandoCancelId(null);
      const [mensaje, tipo] = MENSAJES_RESERVA[estado] || ['Reserva actualizada.', 'success'];
      showToast(mensaje, tipo);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar la reserva.');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const reservasPendientes = reservas.filter((r) => r.estado === 'pendiente').length;

  return (
    <div className="page">
      {panelAbierto && <ProfilePanel onCerrar={() => setPanelAbierto(false)} />}

      <div className="page-header">
        <Link to="/" className="page-brand">PactoCar</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge">Propietario</span>
          <button className="nav-avatar-btn" onClick={() => setPanelAbierto(true)} title="Mi perfil">
            {inicial}
          </button>
        </div>
      </div>

      <VerificacionBanner />

      {error && <div className="error-msg">{error}</div>}

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="tabs">
        <button
          className={`tab${seccion === 'vehiculos' ? ' active' : ''}`}
          onClick={() => setSeccion('vehiculos')}
        >
          Mis vehiculos
        </button>
        <button
          className={`tab${seccion === 'reservas' ? ' active' : ''}`}
          onClick={() => setSeccion('reservas')}
        >
          Reservas
          {reservasPendientes > 0 && (
            <span className="tab-badge">{reservasPendientes}</span>
          )}
        </button>
      </div>

      {/* ── Seccion: Mis vehiculos ─────────────────── */}
      {seccion === 'vehiculos' && (
        <>
          <div className="section-header">
            <span className="section-label" style={{ marginBottom: 0 }}>Vehiculos publicados</span>
            <button
              className="btn-link"
              onClick={() => !noVerificado && (setMostrarForm(!mostrarForm), setFormError(''), setForm(FORM_VACIO))}
              style={noVerificado ? { opacity: 0.4, cursor: 'not-allowed', textDecoration: 'none' } : {}}
              title={noVerificado ? 'Verifica tu cuenta para publicar vehiculos' : ''}
            >
              {mostrarForm ? 'Cancelar' : '+ Publicar vehiculo'}
            </button>
          </div>

          {mostrarForm && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <form onSubmit={handlePublicar}>
                {formError && <div className="error-msg">{formError}</div>}
                <div className="row-2">
                  <div className="field">
                    <label>Marca</label>
                    <input className="input" name="marca" placeholder="Toyota" value={form.marca} onChange={handleChange} required />
                  </div>
                  <div className="field">
                    <label>Modelo</label>
                    <input className="input" name="modelo" placeholder="Corolla" value={form.modelo} onChange={handleChange} required />
                  </div>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Ano</label>
                    <input className="input" name="anio" type="number" placeholder="2022" min="1990" max="2030" value={form.anio} onChange={handleChange} required />
                  </div>
                  <div className="field">
                    <label>Patente</label>
                    <input className="input" name="patente" placeholder="ABCD12" value={form.patente} onChange={handleChange} required />
                  </div>
                </div>
                <div className="field">
                  <label>Precio por dia (CLP)</label>
                  <input className="input" name="precio_diario_clp" type="number" placeholder="25000" min="1000" value={form.precio_diario_clp} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label>Foto del vehiculo (opcional, max 5 MB)</label>
                  {form.imagen_url ? (
                    <div className="foto-preview">
                      <img src={form.imagen_url} alt="Vista previa" />
                      <button type="button" className="btn-sm danger" onClick={() => setForm({ ...form, imagen_url: '' })}>
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <label className="foto-upload-label">
                      {subiendoFoto ? 'Subiendo...' : 'Seleccionar imagen'}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        style={{ display: 'none' }}
                        disabled={subiendoFoto}
                        onChange={handleFoto}
                      />
                    </label>
                  )}
                </div>
                <button type="submit" className="btn" disabled={enviando}>
                  {enviando ? 'Publicando...' : 'Publicar vehiculo'}
                </button>
              </form>
            </div>
          )}

          {cargando ? (
            <div className="spinner" />
          ) : vehiculos.length === 0 ? (
            <div className="empty">
              <strong>Sin vehiculos aun</strong>
              Publica tu primer vehiculo con el boton de arriba.
            </div>
          ) : (
            vehiculos.map((v) => (
              <div key={v.id} className={`vehicle-card${!v.disponible ? ' vehicle-inactivo' : ''}`}>
                {v.imagen_url && (
                  <div className="vehicle-img">
                    <img src={v.imagen_url} alt={`${v.marca} ${v.modelo}`} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                  </div>
                )}
                {v.imagen_url && !v.imagen_aprobada && (
                  <div className="foto-pendiente-badge">Foto pendiente de aprobacion</div>
                )}
                <div className="vehicle-name">{v.marca} {v.modelo}</div>
                <div className="vehicle-meta">{v.anio} &middot; Patente {v.patente}</div>
                <div className="vehicle-footer">
                  <div className="vehicle-price">
                    ${v.precio_diario_clp.toLocaleString('es-CL')}
                    <span> / dia</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!v.disponible && <span className="estado estado-cancelada">inactivo</span>}
                    <button
                      className="btn-link"
                      style={{ color: v.disponible ? 'var(--error)' : 'var(--accent)' }}
                      onClick={() => toggleVehiculo(v.id)}
                    >
                      {v.disponible ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── Seccion: Reservas ──────────────────────── */}
      {seccion === 'reservas' && (
        <>
          <div className="section-label">Reservas de mis vehiculos</div>

          {(() => {
            const totalIngresos = reservas
              .filter((r) => ['confirmada', 'en_curso', 'finalizada'].includes(r.estado))
              .reduce((sum, r) => sum + (r.monto_total || 0), 0);
            return totalIngresos > 0 ? (
              <div className="ingresos-total">
                Ingresos comprometidos: <strong>${totalIngresos.toLocaleString('es-CL')}</strong>
              </div>
            ) : null;
          })()}

          {cargando ? (
            <div className="spinner" />
          ) : reservas.length === 0 ? (
            <div className="empty">
              <strong>Sin reservas aun</strong>
              Las reservas de conductores apareceran aqui.
            </div>
          ) : (
            reservas.map((r) => {
              const estado = getEstado(r);
              return (
                <div key={r.id} className={`reserva-card ${estado}`}>
                  <div className="reserva-title">{r.marca} {r.modelo} &middot; {r.patente}</div>
                  <div className="reserva-meta">
                    {r.conductor_nombre} &middot; {r.conductor_email}<br />
                    {r.fecha_inicio} &rarr; {r.fecha_fin}
                  </div>
                  {r.monto_total > 0 && (
                    <div className="reserva-monto">
                      Total: <strong>${Number(r.monto_total).toLocaleString('es-CL')}</strong>
                    </div>
                  )}
                  <span className={`estado estado-${estado}`}>{estado}</span>

                  {r.estado === 'pendiente' && confirmandoCancelId !== r.id && (
                    <div className="reserva-actions">
                      <button className="btn-sm success" onClick={() => cambiarEstadoReserva(r.id, 'confirmada')}>
                        Confirmar
                      </button>
                      <button className="btn-sm danger" onClick={() => setConfirmandoCancelId(r.id)}>
                        Cancelar
                      </button>
                    </div>
                  )}

                  {r.estado === 'pendiente' && confirmandoCancelId === r.id && (
                    <div className="confirm-cancel">
                      <span>Confirmar cancelacion?</span>
                      <button className="btn-sm danger" onClick={() => cambiarEstadoReserva(r.id, 'cancelada')}>
                        Si, cancelar
                      </button>
                      <button className="btn-sm" onClick={() => setConfirmandoCancelId(null)}>
                        Volver
                      </button>
                    </div>
                  )}

                  {r.estado === 'confirmada' && (
                    <div className="reserva-actions">
                      <button className="btn-sm success" onClick={() => cambiarEstadoReserva(r.id, 'en_curso')}>
                        Iniciar arriendo
                      </button>
                    </div>
                  )}

                  {r.estado === 'en_curso' && (
                    <div className="reserva-actions">
                      <button className="btn-sm success" onClick={() => cambiarEstadoReserva(r.id, 'finalizada')}>
                        Marcar devolucion
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      <div style={{ marginTop: '32px' }}>
        <button className="btn-ghost" onClick={handleLogout}>Cerrar sesion</button>
      </div>
    </div>
  );
};

export default MisVehiculos;
