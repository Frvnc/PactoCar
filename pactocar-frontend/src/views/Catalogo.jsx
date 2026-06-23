import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Catalogo = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCatalogo = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/vehiculos`
        );
        setVehiculos(data);
      } catch (err) {
        setError('No se pudo cargar el catálogo.');
      }
    };
    fetchCatalogo();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <h2>Catálogo de Vehículos</h2>
      <button onClick={handleLogout}>Cerrar sesión</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {vehiculos.length === 0 ? (
        <p>No hay vehículos disponibles por ahora.</p>
      ) : (
        <ul>
          {vehiculos.map((v) => (
            <li key={v.id}>
              {v.marca} {v.modelo} ({v.anio}) — Patente: {v.patente} — $
              {v.precio_diario_clp.toLocaleString('es-CL')} / día
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Catalogo;
