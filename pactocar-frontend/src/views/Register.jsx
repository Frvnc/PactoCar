import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const ROLES = [
  { id: 1, label: 'Administrador' },
  { id: 2, label: 'Propietario (tengo un vehículo)' },
  { id: 3, label: 'Conductor (quiero arrendar)' },
];

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        ...form,
        rol_id: Number(form.rol_id),
      });
      navigate('/login');
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo conectar al servidor.';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h2>Crear cuenta en PactoCar</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nombre_completo"
          placeholder="Nombre completo"
          value={form.nombre_completo}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña (mín. 8 caracteres)"
          value={form.password}
          onChange={handleChange}
          required
        />
        <select name="rol_id" value={form.rol_id} onChange={handleChange} required>
          <option value="">Selecciona tu rol</option>
          {ROLES.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.label}
            </option>
          ))}
        </select>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? 'Registrando...' : 'Crear cuenta'}
        </button>
      </form>
      <p>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
};

export default Register;
