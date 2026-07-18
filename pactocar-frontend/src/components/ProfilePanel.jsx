import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../hooks/useDialog';
import { MODULOS } from '../utils/format';
import Stars from './Stars';
import PerfilEditor from './PerfilEditor';
import VerificacionBanner from './VerificacionBanner';

const ROLES = { 1: 'Administrador', 2: 'Propietario', 3: 'Conductor' };

const ProfilePanel = ({ onCerrar }) => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const dialogRef = useDialog(onCerrar);
  const inicial = auth.usuario?.nombre?.charAt(0).toUpperCase() || '?';
  const [rep, setRep] = useState(null);

  useEffect(() => {
    if (!auth.token || auth.usuario?.rol_id === 1) return;
    axios
      .get(`${MODULOS.reputacion}/api/reputacion/usuario/${auth.usuario?.id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      .then(({ data }) => setRep(data))
      .catch(() => {});
  }, [auth.token, auth.usuario?.id, auth.usuario?.rol_id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="panel-overlay" onClick={onCerrar}>
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="panel-title" id="perfil-title">Mi perfil</span>
          <button className="btn-link" onClick={onCerrar} aria-label="Cerrar panel de perfil">Cerrar</button>
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
            {rep && (
              <div style={{ marginTop: '8px' }}>
                <Stars value={rep.promedio} count={rep.total} size={15} />
              </div>
            )}
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
