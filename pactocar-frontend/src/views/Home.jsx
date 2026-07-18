import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Icon from '../components/Icon';
import TerminosModal from '../components/TerminosModal';

const RUTAS_ROL = { 1: '/admin/dashboard', 2: '/mis-vehiculos', 3: '/catalogo' };
const ROLES = { 1: 'Administrador', 2: 'Propietario', 3: 'Conductor' };

const TAGLINE_ROL = {
  1: 'Administra la plataforma: verifica cuentas, revisa fotos y gestiona usuarios.',
  2: 'Gestiona tus vehiculos, confirma reservas y revisa tus ingresos.',
  3: 'Explora el catalogo, reserva un vehiculo y gestiona tus arriendos.',
};

// Accesos rapidos por rol (todos llevan al panel del usuario).
const ACCESOS = {
  1: [
    { icon: 'shield', t: 'Verificaciones', d: 'Aprueba las cuentas nuevas' },
    { icon: 'car', t: 'Fotos y vehiculos', d: 'Revisa el contenido publicado' },
    { icon: 'user', t: 'Usuarios', d: 'Gestiona roles y accesos' },
  ],
  2: [
    { icon: 'car', t: 'Mis vehiculos', d: 'Publica y administra tu flota' },
    { icon: 'calendar', t: 'Reservas', d: 'Confirma, inicia y cierra arriendos' },
  ],
  3: [
    { icon: 'car', t: 'Catalogo', d: 'Encuentra el vehiculo ideal' },
    { icon: 'calendar', t: 'Mis reservas', d: 'Pago, contrato, chat y calificacion' },
  ],
};

const PASOS = [
  { n: 1, t: 'Crea tu cuenta', d: 'Registrate como propietario o conductor en menos de un minuto.' },
  { n: 2, t: 'Verifica tu identidad', d: 'Sube tus documentos. Un administrador revisa y aprueba tu cuenta.' },
  { n: 3, t: 'Publica o reserva', d: 'Los propietarios publican sus vehiculos. Los conductores reservan por dias.' },
];

const FEATURES = [
  { icon: 'shield', t: 'Propietarios verificados', d: 'Cada propietario acredita el seguro del vehiculo antes de publicar.' },
  { icon: 'id', t: 'Conductores con licencia', d: 'Verificamos licencia y clase antes de permitir cualquier reserva.' },
  { icon: 'lock', t: 'Pago protegido con garantia', d: 'El pago y la garantia quedan en custodia y se liberan al confirmar la devolucion.' },
];

const Home = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [totalVehiculos, setTotalVehiculos] = useState(null);
  const [verTerminos, setVerTerminos] = useState(false);

  const logueado = !!auth.token;
  const rol = auth.usuario?.rol_id;
  const rutaPanel = RUTAS_ROL[rol];

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

  const stats = totalVehiculos !== null && (
    <div className="home-stats">
      <div className="home-stat">
        <div className="home-stat-value">{totalVehiculos}</div>
        <div className="home-stat-label">Vehiculos disponibles</div>
      </div>
      <div className="home-stat">
        <div className="home-stat-value">100%</div>
        <div className="home-stat-label">Pago protegido</div>
      </div>
      <div className="home-stat">
        <div className="home-stat-value">24/7</div>
        <div className="home-stat-label">Soporte</div>
      </div>
    </div>
  );

  return (
    <div className="page home-page">
      {/* ── Cabecera ─────────────────────────────── */}
      <div className="home-navbar">
        <span className="page-brand">PactoCar</span>
        {logueado ? (
          <div className="home-nav-right">
            <Link to={rutaPanel} className="btn-link">Mi panel</Link>
            <button className="btn-ghost btn-sm" onClick={handleLogout}>Salir</button>
          </div>
        ) : (
          <div className="home-nav-right">
            <Link to="/login" className="btn-link">Iniciar sesion</Link>
            <Link to="/register" className="btn btn-sm">Registrarse</Link>
          </div>
        )}
      </div>

      {logueado ? (
        /* ══════════ HOME LOGUEADO (mini panel) ══════════ */
        <>
          <div className="home-hero-in">
            <div className="home-greeting">Bienvenido, {auth.usuario?.nombre}</div>
            <div className="home-role-line">{ROLES[rol]}</div>
            <p className="home-tagline-in">{TAGLINE_ROL[rol]}</p>
            <Link to={rutaPanel} className="btn home-cta">Ir a mi panel</Link>
          </div>

          <div className="home-section-title">Accesos rapidos</div>
          <div className="quick-grid">
            {(ACCESOS[rol] || []).map((a) => (
              <Link key={a.t} to={rutaPanel} className="quick-card">
                <span className="quick-icon"><Icon name={a.icon} size={22} /></span>
                <span>
                  <span className="quick-title">{a.t}</span>
                  <span className="quick-desc">{a.d}</span>
                </span>
              </Link>
            ))}
          </div>

          {stats}
        </>
      ) : (
        /* ══════════ HOME VISITANTE (marketing) ══════════ */
        <>
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-brand">PactoCar</div>
              <p className="home-tagline">
                Car sharing entre particulares. Arrienda o publica tu vehiculo de forma simple y segura.
              </p>
              <div className="home-actions">
                <Link to="/register" className="btn">Crear cuenta</Link>
                <Link to="/login" className="btn-ghost">Iniciar sesion</Link>
              </div>
            </div>
          </div>

          {stats}

          <div className="home-section-title">Como funciona</div>
          <div className="home-steps">
            {PASOS.map((p) => (
              <div key={p.n} className="home-step">
                <div className="home-step-num">{p.n}</div>
                <div>
                  <div className="home-step-title">{p.t}</div>
                  <div className="home-step-desc">{p.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="home-section-title">Por que PactoCar</div>
          <div className="home-features">
            {FEATURES.map((f) => (
              <div key={f.t} className="home-feature">
                <div className="home-feature-head">
                  <span className="home-feature-icon"><Icon name={f.icon} size={20} /></span>
                  <div className="home-feature-title">{f.t}</div>
                </div>
                <div className="home-feature-desc">{f.d}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', paddingBottom: '32px' }}>
            <Link to="/register" className="btn home-cta">Comenzar ahora</Link>
            <p className="home-legal">
              Al crear una cuenta aceptas los{' '}
              <button type="button" className="btn-link" onClick={() => setVerTerminos(true)}>
                terminos y condiciones
              </button>
              .
            </p>
          </div>
        </>
      )}

      <footer className="home-footer">
        <span>PactoCar - Car sharing entre particulares</span>
        <button type="button" className="btn-link" onClick={() => setVerTerminos(true)}>
          Terminos y condiciones
        </button>
      </footer>

      {verTerminos && <TerminosModal onCerrar={() => setVerTerminos(false)} />}
    </div>
  );
};

export default Home;
