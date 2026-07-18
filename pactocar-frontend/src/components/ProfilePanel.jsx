import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../hooks/useDialog';
import { MODULOS } from '../utils/format';
import Stars, { Star } from './Stars';
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

        {rep && rep.total > 0 && (
          <section className="perfil-reputacion" aria-labelledby="perfil-rep-title">
            <h3 className="modulo-title" id="perfil-rep-title">
              Lo que dicen de ti ({rep.total})
            </h3>
            <div className="calificacion-lista">
              {rep.calificaciones.map((c) => (
                <div key={c.id} className="calificacion-item">
                  <div className="calificacion-cabecera">
                    <span className="calificacion-autor">Reserva #{c.reserva_id}</span>
                    <span className="stars-inline" role="img" aria-label={`${c.puntaje} de 5 estrellas`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          filled={n <= c.puntaje}
                          size={14}
                          color={n <= c.puntaje ? 'var(--accent)' : 'var(--border)'}
                        />
                      ))}
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
          </section>
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
