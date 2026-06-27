import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const RUTAS_ROL = { 1: '/admin/dashboard', 2: '/mis-vehiculos', 3: '/catalogo' };
const ROLES = { 1: 'Administrador', 2: 'Propietario', 3: 'Conductor' };

const Home = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [totalVehiculos, setTotalVehiculos] = useState(null);

  const logueado = !!auth.token;
  const rutaPanel = RUTAS_ROL[auth.usuario?.rol_id];

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/vehiculos`)
      .then(({ data }) => setTotalVehiculos(data.length))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page">
      {/* ── Cabecera ─────────────────────────────── */}
      <div className="home-navbar">
        <span className="page-brand">PactoCar</span>
        {logueado ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link to={rutaPanel} className="btn-link">Mi panel</Link>
            <button className="btn-ghost btn-sm" onClick={handleLogout}>Salir</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/login" className="btn-link">Iniciar sesion</Link>
            <Link to="/register" className="btn btn-sm">Registrarse</Link>
          </div>
        )}
      </div>

      {/* ── Hero ─────────────────────────────────── */}
      <div className="home-hero">
        {logueado ? (
          <>
            <div className="home-greeting">Bienvenido, {auth.usuario?.nombre}</div>
            <div className="home-role-line">{ROLES[auth.usuario?.rol_id]}</div>
            <p className="home-tagline">
              Accede a tu panel para {auth.usuario?.rol_id === 2
                ? 'gestionar tus vehiculos y reservas.'
                : auth.usuario?.rol_id === 3
                ? 'explorar el catalogo y gestionar tus reservas.'
                : 'administrar la plataforma.'}
            </p>
            <div className="home-actions">
              <Link to={rutaPanel} className="btn">Ir a mi panel</Link>
            </div>
          </>
        ) : (
          <>
            <div className="home-brand">PactoCar</div>
            <p className="home-tagline">
              Car sharing P2P entre particulares. Arrienda o publica tu vehiculo de forma simple y segura.
            </p>
            <div className="home-actions">
              <Link to="/register" className="btn">Crear cuenta</Link>
              <Link to="/login" className="btn-ghost">Iniciar sesion</Link>
            </div>
          </>
        )}
      </div>

      {/* ── Stats ────────────────────────────────── */}
      {totalVehiculos !== null && (
        <div className="home-stats">
          <div className="home-stat">
            <div className="home-stat-value">{totalVehiculos}</div>
            <div className="home-stat-label">Vehiculos disponibles</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">2</div>
            <div className="home-stat-label">Nubes activas</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">24/7</div>
            <div className="home-stat-label">Alta disponibilidad</div>
          </div>
        </div>
      )}

      {/* ── Como funciona ─────────────────────────── */}
      <div className="home-section-title">Como funciona</div>
      <div className="home-steps">
        <div className="home-step">
          <div className="home-step-num">1</div>
          <div>
            <div className="home-step-title">Crea tu cuenta</div>
            <div className="home-step-desc">Registrate como propietario o conductor en menos de un minuto.</div>
          </div>
        </div>
        <div className="home-step">
          <div className="home-step-num">2</div>
          <div>
            <div className="home-step-title">Verifica tu identidad</div>
            <div className="home-step-desc">Sube tus documentos. Un administrador revisa y aprueba tu cuenta.</div>
          </div>
        </div>
        <div className="home-step">
          <div className="home-step-num">3</div>
          <div>
            <div className="home-step-title">Publica o reserva</div>
            <div className="home-step-desc">Los propietarios publican sus vehiculos. Los conductores reservan por dias.</div>
          </div>
        </div>
      </div>

      {/* ── Features ──────────────────────────────── */}
      <div className="home-section-title">Por que PactoCar</div>
      <div className="home-features">
        <div className="home-feature">
          <div className="home-feature-title">Propietarios verificados</div>
          <div className="home-feature-desc">
            Cada propietario acredita el seguro del vehiculo antes de publicar.
          </div>
        </div>
        <div className="home-feature">
          <div className="home-feature-title">Conductores con licencia</div>
          <div className="home-feature-desc">
            Verificamos licencia y clase antes de permitir cualquier reserva.
          </div>
        </div>
        <div className="home-feature">
          <div className="home-feature-title">Infraestructura multi-cloud</div>
          <div className="home-feature-desc">
            Frontend en Azure Static Web Apps, API en AWS ECS Fargate Multi-AZ con respaldo on-premise.
          </div>
        </div>
      </div>

      {!logueado && (
        <div style={{ textAlign: 'center', paddingBottom: '32px' }}>
          <Link to="/register" className="btn">Comenzar ahora</Link>
        </div>
      )}
    </div>
  );
};

export default Home;
