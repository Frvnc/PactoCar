import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Acceso denegado</h2>
      <p>No tienes permisos para ver esta página.</p>
      <button onClick={() => navigate(-1)}>Volver</button>
    </div>
  );
};

export default Unauthorized;
