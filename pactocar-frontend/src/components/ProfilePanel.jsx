import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PerfilEditor from './PerfilEditor';
import VerificacionBanner from './VerificacionBanner';

const ROLES = { 1: 'Administrador', 2: 'Propietario', 3: 'Conductor' };

const ProfilePanel = ({ onCerrar }) => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const inicial = auth.usuario?.nombre?.charAt(0).toUpperCase() || '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="panel-overlay" onClick={onCerrar}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span className="panel-title">Mi perfil</span>
          <button className="btn-link" onClick={onCerrar}>Cerrar</button>
        </div>

        <div className="panel-user">
          <div className="panel-avatar">{inicial}</div>
          <div>
            <div className="panel-user-name">{auth.usuario?.nombre}</div>
            {auth.usuario?.email && (
              <div className="panel-user-email">{auth.usuario.email}</div>
            )}
            <span className="badge" style={{ marginTop: '6px', display: 'inline-block' }}>
              {ROLES[auth.usuario?.rol_id] || 'Usuario'}
            </span>
          </div>
        </div>

        {auth.usuario?.rol_id !== 1 && (
          <div style={{ marginBottom: '16px' }}>
            <VerificacionBanner embedded />
          </div>
        )}

        <PerfilEditor />

        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
