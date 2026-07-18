import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfilePanel from '../components/ProfilePanel';
import { useToast } from '../context/ToastContext';

const AdminDashboard = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [seccion, setSeccion] = useState('resumen');
  const [estadisticas, setEstadisticas] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [verificaciones, setVerificaciones] = useState([]);
  const [fotosPendientes, setFotosPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [rechazando, setRechazando] = useState({});
  const [panelAbierto, setPanelAbierto] = useState(false);

  const { showToast } = useToast();
  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resEst, resUsr, resVerif, resFotos] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/estadisticas`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/usuarios`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/verificaciones`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/fotos`, { headers }),
        ]);
        setEstadisticas(resEst.data);
        setUsuarios(resUsr.data);
        setVerificaciones(resVerif.data);
        setFotosPendientes(resFotos.data);
      } catch {
        setError('No se pudo cargar la informacion.');
      } finally {
        setCargando(false);
      }
    };
    if (auth.token) fetchData();
  }, [auth.token]);

  const patchUsuario = async (id, campos) => {
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/usuarios/${id}`,
        campos,
        { headers }
      );
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.usuario } : u)));
      showToast('Usuario actualizado.');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el usuario.');
    }
  };

  const gestionarVerificacion = async (solicitudId, accion, mensaje_rechazo) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/verificaciones/${solicitudId}`,
        { accion, mensaje_rechazo },
        { headers }
      );
      setVerificaciones((prev) => prev.filter((v) => v.id !== solicitudId));
      showToast(accion === 'aprobar' ? 'Cuenta aprobada.' : 'Solicitud rechazada.', accion === 'aprobar' ? 'success' : 'error');
      if (accion === 'aprobar') {
        const verif = verificaciones.find((v) => v.id === solicitudId);
        if (verif) {
          setUsuarios((prev) =>
            prev.map((u) => (u.id === verif.usuario_id ? { ...u, verificado: true } : u))
          );
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al gestionar la solicitud.');
    }
  };

  const gestionarFoto = async (vehiculoId, accion) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/fotos/${vehiculoId}`,
        { accion },
        { headers }
      );
      setFotosPendientes((prev) => prev.filter((v) => v.id !== vehiculoId));
      showToast(accion === 'aprobar' ? 'Foto aprobada.' : 'Foto rechazada.', accion === 'aprobar' ? 'success' : 'error');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al gestionar la foto.');
    }
  };

  const toggleRechazando = (id) =>
    setRechazando((prev) => ({ ...prev, [id]: prev[id] ? undefined : { mensaje: '' } }));

  const handleLogout = () => { logout(); navigate('/login'); };

  const inicial = auth.usuario?.nombre?.charAt(0).toUpperCase() || 'A';
  const todos = usuarios.filter((u) => u.id !== auth.usuario?.id);

  const totalPendientes = verificaciones.length + fotosPendientes.length;

  return (
    <div className="page">
      {panelAbierto && <ProfilePanel onCerrar={() => setPanelAbierto(false)} />}

      <div className="page-header">
        <Link to="/" className="page-brand">PactoCar</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {totalPendientes > 0 && <span className="badge-alert">{totalPendientes}</span>}
          <span className="badge">Admin</span>
          <button className="nav-avatar-btn" onClick={() => setPanelAbierto(true)} title="Mi perfil" aria-label="Abrir mi perfil">
            {inicial}
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {cargando ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="tabs">
            <button
              className={`tab${seccion === 'resumen' ? ' active' : ''}`}
              onClick={() => setSeccion('resumen')}
            >
              Resumen
            </button>
            <button
              className={`tab${seccion === 'verificaciones' ? ' active' : ''}`}
              onClick={() => setSeccion('verificaciones')}
            >
              Verificaciones
              {verificaciones.length > 0 && <span className="tab-badge">{verificaciones.length}</span>}
            </button>
            <button
              className={`tab${seccion === 'fotos' ? ' active' : ''}`}
              onClick={() => setSeccion('fotos')}
            >
              Fotos
              {fotosPendientes.length > 0 && <span className="tab-badge">{fotosPendientes.length}</span>}
            </button>
            <button
              className={`tab${seccion === 'usuarios' ? ' active' : ''}`}
              onClick={() => setSeccion('usuarios')}
            >
              Usuarios
            </button>
          </div>

          {/* ── Resumen ──────────────────────────────── */}
          {seccion === 'resumen' && estadisticas && (() => {
            const p = Number(estadisticas.reservas_pendientes || 0);
            const c = Number(estadisticas.reservas_confirmadas || 0);
            const e = Number(estadisticas.reservas_en_curso || 0);
            const f = Number(estadisticas.reservas_finalizadas || 0);
            const totalReservas = p + c + e + f;
            return (
              <>
                <div className="stat-ingresos">
                  <div className="stat-ingresos-label">Ingresos totales</div>
                  <div className="stat-ingresos-value">
                    ${Number(estadisticas.ingresos_totales || 0).toLocaleString('es-CL')}
                  </div>
                  <div className="stat-ingresos-sub">Reservas finalizadas</div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{estadisticas.total_usuarios}</div>
                    <div className="stat-label">Usuarios</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{estadisticas.total_vehiculos}</div>
                    <div className="stat-label">Vehiculos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{totalReservas}</div>
                    <div className="stat-label">Reservas</div>
                  </div>
                </div>

                {totalReservas > 0 && (
                  <div className="reservas-desglose">
                    <span><strong>{p}</strong> pendientes</span>
                    <span><strong>{c}</strong> confirmadas</span>
                    <span><strong>{e}</strong> en curso</span>
                    <span><strong>{f}</strong> finalizadas</span>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Verificaciones ────────────────────────── */}
          {seccion === 'verificaciones' && (
            <>
              {verificaciones.length === 0 ? (
                <div className="empty" style={{ padding: '40px 0' }}>
                  <strong>Sin solicitudes pendientes</strong>
                  Cuando un usuario solicite verificacion aparecera aqui.
                </div>
              ) : (
                verificaciones.map((v) => (
                  <div key={v.id} className="verif-card">
                    <div className="verif-card-header">
                      <div>
                        <div className="verif-card-name">{v.nombre_completo}</div>
                        <div className="verif-card-email">{v.email}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span className="estado estado-pendiente">{v.rol_nombre}</span>
                        </div>
                      </div>
                    </div>

                    <div className="verif-doc-grid">
                      <div className="verif-doc-item">
                        <strong>RUT</strong>
                        <span>{v.rut}</span>
                      </div>
                      {v.rol_id === 3 && (
                        <>
                          <div className="verif-doc-item">
                            <strong>Numero de licencia</strong>
                            <span>{v.numero_licencia || '—'}</span>
                          </div>
                          <div className="verif-doc-item">
                            <strong>Clase</strong>
                            <span>{v.clase_licencia || '—'}</span>
                          </div>
                          <div className="verif-doc-item">
                            <strong>Vencimiento licencia</strong>
                            <span>{v.vencimiento_licencia?.split('T')[0] || '—'}</span>
                          </div>
                        </>
                      )}
                      {v.rol_id === 2 && (
                        <>
                          <div className="verif-doc-item">
                            <strong>Aseguradora</strong>
                            <span>{v.aseguradora || '—'}</span>
                          </div>
                          <div className="verif-doc-item">
                            <strong>Numero de poliza</strong>
                            <span>{v.numero_poliza || '—'}</span>
                          </div>
                          <div className="verif-doc-item">
                            <strong>Vencimiento seguro</strong>
                            <span>{v.vencimiento_seguro?.split('T')[0] || '—'}</span>
                          </div>
                        </>
                      )}
                      <div className="verif-doc-item">
                        <strong>Enviado</strong>
                        <span>{new Date(v.creado_en).toLocaleDateString('es-CL')}</span>
                      </div>
                    </div>

                    <div className="verif-actions">
                      <button className="btn-sm success" onClick={() => gestionarVerificacion(v.id, 'aprobar')}>
                        Aprobar
                      </button>
                      <button className="btn-sm danger" onClick={() => toggleRechazando(v.id)}>
                        {rechazando[v.id] ? 'Cancelar' : 'Rechazar'}
                      </button>
                    </div>

                    {rechazando[v.id] && (
                      <div style={{ marginTop: '10px' }}>
                        <input
                          className="verif-reject-input"
                          placeholder="Motivo del rechazo (opcional)..."
                          value={rechazando[v.id].mensaje}
                          onChange={(e) =>
                            setRechazando((prev) => ({ ...prev, [v.id]: { mensaje: e.target.value } }))
                          }
                        />
                        <div className="verif-actions" style={{ marginTop: '8px' }}>
                          <button
                            className="btn-sm danger"
                            onClick={() => gestionarVerificacion(v.id, 'rechazar', rechazando[v.id].mensaje)}
                          >
                            Confirmar rechazo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {/* ── Fotos pendientes ──────────────────────── */}
          {seccion === 'fotos' && (
            <>
              {fotosPendientes.length === 0 ? (
                <div className="empty" style={{ padding: '40px 0' }}>
                  <strong>Sin fotos pendientes</strong>
                  Las fotos subidas por propietarios apareceran aqui para aprobacion.
                </div>
              ) : (
                fotosPendientes.map((v) => (
                  <div key={v.id} className="foto-card">
                    <img
                      className="foto-card-img"
                      src={v.imagen_url}
                      alt={`${v.marca} ${v.modelo}`}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="foto-card-body">
                      <div className="foto-card-title">{v.marca} {v.modelo} ({v.anio})</div>
                      <div className="foto-card-meta">Patente {v.patente} &middot; {v.propietario_nombre}</div>
                      <div className="verif-actions">
                        <button className="btn-sm success" onClick={() => gestionarFoto(v.id, 'aprobar')}>
                          Aprobar foto
                        </button>
                        <button className="btn-sm danger" onClick={() => gestionarFoto(v.id, 'rechazar')}>
                          Rechazar foto
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* ── Usuarios ──────────────────────────────── */}
          {seccion === 'usuarios' && (
            <>
              {todos.length === 0 ? (
                <div className="empty"><strong>Sin otros usuarios registrados.</strong></div>
              ) : (
                todos.map((u) => (
                  <div key={u.id} className={`user-item${!u.activo ? ' suspendido' : ''}`}>
                    <div className="user-item-info">
                      <div className="user-item-name">{u.nombre_completo}</div>
                      <div className="user-item-email">{u.email}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                        <select
                          className="rol-select"
                          value={u.rol_id}
                          onChange={(e) => patchUsuario(u.id, { rol_id: Number(e.target.value) })}
                        >
                          <option value={1}>Admin</option>
                          <option value={2}>Propietario</option>
                          <option value={3}>Conductor</option>
                        </select>
                        {u.verificado && <span className="estado estado-confirmada">verificado</span>}
                        {!u.verificado && u.activo && <span className="estado estado-pendiente">sin verificar</span>}
                        {!u.activo && <span className="estado estado-cancelada">suspendido</span>}
                      </div>
                    </div>
                    <div className="user-item-actions">
                      <button
                        className={`btn-sm ${u.activo ? 'danger' : 'success'}`}
                        onClick={() => patchUsuario(u.id, { activo: !u.activo })}
                      >
                        {u.activo ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </>
      )}

      <div style={{ marginTop: '24px' }}>
        <button className="btn-ghost" onClick={handleLogout}>Cerrar sesion</button>
      </div>
    </div>
  );
};

export default AdminDashboard;
