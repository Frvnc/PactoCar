import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VerificacionBanner from '../components/VerificacionBanner';
import ProfilePanel from '../components/ProfilePanel';
import ReservaModal from '../components/ReservaModal';
import Stars from '../components/Stars';
import { fmtFecha, diasEntre, ESTADO_LABEL, MODULOS } from '../utils/format';

const hoy = new Date().toISOString().split('T')[0];

const getEstado = (r) =>
  r.estado === 'confirmada' && r.fecha_fin < hoy ? 'completada' : r.estado;

const Catalogo = () => {
  const { auth, logout } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [reservandoId, setReservandoId] = useState(null);
  const [fechas, setFechas] = useState({ fecha_inicio: '', fecha_fin: '' });
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [orden, setOrden] = useState('reciente');
  const [confirmandoCancelId, setConfirmandoCancelId] = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [seccion, setSeccion] = useState('catalogo');
  const [reservaGestion, setReservaGestion] = useState(null);
  const [repMap, setRepMap] = useState({});
  const [chatMap, setChatMap] = useState({});

  const headers = { Authorization: `Bearer ${auth.token}` };
  const noVerificado = auth.usuario?.verificado === false;
  const inicial = auth.usuario?.nombre?.charAt(0).toUpperCase() || 'C';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resCat, resRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/vehiculos`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/reservas/mias`, { headers }),
        ]);
        setVehiculos(resCat.data);
        setReservas(resRes.data);

        const ids = [...new Set(resCat.data.map((v) => v.propietario_id).filter(Boolean))];
        if (ids.length) {
          try {
            const { data } = await axios.get(
              `${MODULOS.reputacion}/api/reputacion/resumen?usuarios=${ids.join(',')}`,
              { headers }
            );
            const map = {};
            data.forEach((rep) => { map[rep.usuario_id] = rep; });
            setRepMap(map);
          } catch { /* reputacion opcional */ }
        }
        try {
          const { data } = await axios.get(`${MODULOS.chat}/api/chat`, { headers });
          const cmap = {};
          data.forEach((c) => { cmap[c.reserva_id] = c.no_leidos; });
          setChatMap(cmap);
        } catch { /* chat opcional */ }
      } catch {
        setError('No se pudo cargar el catalogo.');
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, []);

  const vehiculosFiltrados = vehiculos
    .filter((v) => {
      const matchTexto =
        !filtroTexto ||
        `${v.marca} ${v.modelo}`.toLowerCase().includes(filtroTexto.toLowerCase());
      const matchPrecio = !precioMax || v.precio_diario_clp <= Number(precioMax);
      return matchTexto && matchPrecio;
    })
    .sort((a, b) => {
      if (orden === 'precio_asc') return a.precio_diario_clp - b.precio_diario_clp;
      if (orden === 'precio_desc') return b.precio_diario_clp - a.precio_diario_clp;
      return b.id - a.id;
    });

  const toggleReservar = (vehiculoId) => {
    if (reservandoId === vehiculoId) {
      setReservandoId(null);
    } else {
      setReservandoId(vehiculoId);
      setFechas({ fecha_inicio: '', fecha_fin: '' });
      setFormError('');
    }
  };

  const handleReservar = async (e, vehiculoId) => {
    e.preventDefault();
    setFormError('');
    setEnviando(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservas`,
        { vehiculo_id: vehiculoId, ...fechas },
        { headers }
      );
      const vehiculo = vehiculos.find((v) => v.id === vehiculoId);
      setReservas((prev) => [
        {
          ...data.reserva,
          marca: vehiculo?.marca,
          modelo: vehiculo?.modelo,
          anio: vehiculo?.anio,
          patente: vehiculo?.patente,
        },
        ...prev,
      ]);
      setReservandoId(null);
      showToast('Reserva creada correctamente.');
    } catch (err) {
      setFormError(err.response?.data?.error || 'No se pudo crear la reserva.');
    } finally {
      setEnviando(false);
    }
  };

  const cancelarReserva = async (reservaId) => {
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/reservas/${reservaId}`,
        { estado: 'cancelada' },
        { headers }
      );
      setReservas((prev) =>
        prev.map((r) => (r.id === reservaId ? { ...r, ...data.reserva } : r))
      );
      setConfirmandoCancelId(null);
      showToast('Reserva cancelada.', 'error');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar la reserva.');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const misReservasPendientes = reservas.filter((r) => r.estado === 'pendiente').length;

  return (
    <div className="page">
      {panelAbierto && <ProfilePanel onCerrar={() => setPanelAbierto(false)} />}
      {reservaGestion && <ReservaModal reserva={reservaGestion} onCerrar={() => setReservaGestion(null)} />}

      <div className="page-header">
        <Link to="/" className="page-brand">PactoCar</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge">Conductor</span>
          <button className="nav-avatar-btn" onClick={() => setPanelAbierto(true)} title="Mi perfil" aria-label="Abrir mi perfil">
            {inicial}
          </button>
        </div>
      </div>

      <VerificacionBanner />

      {error && <div className="error-msg">{error}</div>}

      <div className="tabs">
        <button
          className={`tab${seccion === 'catalogo' ? ' active' : ''}`}
          onClick={() => setSeccion('catalogo')}
        >
          Catalogo
        </button>
        <button
          className={`tab${seccion === 'reservas' ? ' active' : ''}`}
          onClick={() => setSeccion('reservas')}
        >
          Mis reservas
          {misReservasPendientes > 0 && (
            <span className="tab-badge">{misReservasPendientes}</span>
          )}
        </button>
      </div>

      {/* ── Seccion: Catalogo ─────────────────────── */}
      {seccion === 'catalogo' && (
        <>
          <div className="search-row">
            <input
              className="input"
              placeholder="Buscar marca o modelo..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </div>
          <div className="search-row">
            <input
              className="input"
              type="number"
              placeholder="Precio max / dia"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              min="0"
              style={{ flex: 1 }}
            />
            <select
              className="select"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="reciente">Mas recientes</option>
              <option value="precio_asc">Precio: menor</option>
              <option value="precio_desc">Precio: mayor</option>
            </select>
          </div>

          {cargando ? (
            <div className="spinner" />
          ) : vehiculosFiltrados.length === 0 ? (
            <div className="empty">
              <strong>Sin resultados</strong>
              {vehiculos.length === 0
                ? 'No hay vehiculos publicados en este momento.'
                : 'Intenta con otros filtros.'}
              {(filtroTexto || precioMax) && (
                <button
                  className="btn-ghost"
                  style={{ marginTop: '16px', width: 'auto', padding: '10px 20px', alignSelf: 'center' }}
                  onClick={() => { setFiltroTexto(''); setPrecioMax(''); }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            vehiculosFiltrados.map((v) => {
              const dias =
                fechas.fecha_inicio && fechas.fecha_fin && reservandoId === v.id
                  ? Math.ceil(
                      (new Date(fechas.fecha_fin) - new Date(fechas.fecha_inicio)) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0;

              return (
                <div key={v.id} className="vehicle-card">
                  {v.imagen_url && v.imagen_aprobada && (
                    <div className="vehicle-img">
                      <img
                        src={v.imagen_url}
                        alt={`${v.marca} ${v.modelo}`}
                        onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="vehicle-name">{v.marca} {v.modelo}</div>
                  <div className="vehicle-meta">{v.anio} &middot; Patente {v.patente}</div>
                  {v.propietario_nombre && (
                    <div className="propietario-rep">
                      <span className="propietario-tag">{v.propietario_nombre}</span>
                      <Stars
                        value={repMap[v.propietario_id]?.promedio || 0}
                        count={repMap[v.propietario_id]?.total || 0}
                        size={13}
                      />
                    </div>
                  )}
                  <div className="vehicle-footer">
                    <div className="vehicle-price">
                      ${v.precio_diario_clp.toLocaleString('es-CL')}
                      <span> / dia</span>
                    </div>
                    <button
                      className="btn-link"
                      onClick={() => !noVerificado && toggleReservar(v.id)}
                      style={noVerificado ? { opacity: 0.4, cursor: 'not-allowed', textDecoration: 'none' } : {}}
                      title={noVerificado ? 'Verifica tu cuenta para reservar' : ''}
                    >
                      {reservandoId === v.id ? 'Cancelar' : 'Reservar'}
                    </button>
                  </div>

                  {reservandoId === v.id && (
                    <div className="card-form">
                      <form onSubmit={(e) => handleReservar(e, v.id)}>
                        {formError && <div className="error-msg" style={{ marginBottom: '12px' }}>{formError}</div>}
                        <div className="row-2">
                          <div className="field">
                            <label>Fecha inicio</label>
                            <input
                              className="input"
                              type="date"
                              min={hoy}
                              value={fechas.fecha_inicio}
                              onChange={(e) => setFechas({ ...fechas, fecha_inicio: e.target.value })}
                              required
                            />
                          </div>
                          <div className="field">
                            <label>Fecha fin</label>
                            <input
                              className="input"
                              type="date"
                              min={fechas.fecha_inicio || hoy}
                              value={fechas.fecha_fin}
                              onChange={(e) => setFechas({ ...fechas, fecha_fin: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        {dias > 0 && (
                          <div className="precio-resumen">
                            {dias} dia{dias !== 1 ? 's' : ''} &times; ${v.precio_diario_clp.toLocaleString('es-CL')}
                            {' = '}
                            <strong>${(dias * v.precio_diario_clp).toLocaleString('es-CL')}</strong>
                          </div>
                        )}
                        <button type="submit" className="btn" disabled={enviando}>
                          {enviando ? 'Reservando...' : 'Confirmar reserva'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── Seccion: Mis reservas ──────────────────── */}
      {seccion === 'reservas' && (
        <>
          <div className="section-label">Historial de reservas</div>

          {cargando ? (
            <div className="spinner" />
          ) : reservas.length === 0 ? (
            <div className="empty">
              <strong>Sin reservas aun</strong>
              Reserva un vehiculo desde el catalogo.
            </div>
          ) : (
            reservas.map((r) => {
              const estado = getEstado(r);
              const dias = diasEntre(r.fecha_inicio, r.fecha_fin);
              return (
                <div key={r.id} className={`reserva-card ${estado}`}>
                  <div className="reserva-card-head">
                    <div className="reserva-title">{r.marca} {r.modelo}</div>
                    <span className={`estado estado-${estado}`}>{ESTADO_LABEL[estado] || estado}</span>
                  </div>
                  <div className="reserva-fechas">
                    {fmtFecha(r.fecha_inicio)} <span className="flecha">&rarr;</span> {fmtFecha(r.fecha_fin)}
                  </div>
                  <div className="reserva-sub">
                    {r.anio} &middot; Patente <span className="patente">{r.patente}</span> &middot; {dias} dia{dias !== 1 ? 's' : ''}
                  </div>
                  {r.monto_total > 0 && (
                    <div className="reserva-monto">
                      Total <strong>${Number(r.monto_total).toLocaleString('es-CL')}</strong>
                    </div>
                  )}

                  {r.estado !== 'cancelada' && (
                    <div className="reserva-actions">
                      <button className="btn-sm" onClick={() => setReservaGestion(r)}>
                        Gestionar reserva
                        {chatMap[r.id] > 0 && <span className="tab-badge" style={{ marginLeft: '6px' }}>{chatMap[r.id]}</span>}
                      </button>
                    </div>
                  )}

                  {r.estado === 'pendiente' && confirmandoCancelId !== r.id && (
                    <div className="reserva-actions">
                      <button className="btn-sm danger" onClick={() => setConfirmandoCancelId(r.id)}>
                        Cancelar reserva
                      </button>
                    </div>
                  )}

                  {r.estado === 'pendiente' && confirmandoCancelId === r.id && (
                    <div className="confirm-cancel">
                      <span>Confirmar cancelacion?</span>
                      <button className="btn-sm danger" onClick={() => cancelarReserva(r.id)}>
                        Si, cancelar
                      </button>
                      <button className="btn-sm" onClick={() => setConfirmandoCancelId(null)}>
                        Volver
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

export default Catalogo;
