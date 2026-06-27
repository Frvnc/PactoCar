import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Pending = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page">
      <div className="error-page">
        <div className="error-code" style={{ fontSize: '64px', color: 'var(--accent)' }}>
          En revision
        </div>
        <div className="error-title">Cuenta pendiente de verificacion</div>
        <div className="error-desc">
          Tu cuenta esta siendo revisada por un administrador de PactoCar.
          Una vez aprobada, vuelve a iniciar sesion para acceder a la plataforma.
        </div>
        <button className="btn" style={{ maxWidth: '220px' }} onClick={handleLogout}>
          Cerrar sesion
        </button>
      </div>
    </div>
  );
};

export default Pending;
