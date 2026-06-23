import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const MisVehiculos = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/vehiculos/mios`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        setVehiculos(data);
      } catch (err) {
        setError('No se pudieron cargar tus vehículos.');
      }
    };

    if (auth.token) {
      fetchVehiculos();
    }
  }, [auth.token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <h2>Mis Vehículos Publicados</h2>
      <p>Bienvenido, {auth.usuario?.nombre}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {vehiculos.length === 0 ? (
        <p>No tienes vehículos publicados aún.</p>
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

export default MisVehiculos;
