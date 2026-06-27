import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="error-page">
        <div className="error-code">403</div>
        <div className="error-title">Acceso denegado</div>
        <div className="error-desc">No tienes permisos para ver esta pagina.</div>
        <button className="btn" style={{ maxWidth: '200px' }} onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
