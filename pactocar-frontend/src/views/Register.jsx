import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const ROLES = [
  { id: 2, label: 'Propietario', desc: 'Tengo un vehiculo para arrendar' },
  { id: 3, label: 'Conductor', desc: 'Quiero arrendar un vehiculo' },
];

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleRol = (id) => setForm({ ...form, rol_id: id });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    setCargando(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        ...form,
        rol_id: Number(form.rol_id),
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo conectar al servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="page">
      <div className="auth-header">
        <Link to="/" className="auth-back">Volver al inicio</Link>
        <div className="auth-title">Crear cuenta</div>
        <div className="auth-subtitle">Unete a PactoCar como propietario o conductor</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Nombre completo</label>
          <input
            className="input"
            type="text"
            name="nombre_completo"
            placeholder="Juan Perez"
            value={form.nombre_completo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label>Correo electronico</label>
          <input
            className="input"
            type="email"
            name="email"
            placeholder="tu@correo.cl"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label>Contrasena</label>
          <div className="password-wrapper">
            <input
              className="input"
              type={showPass ? 'text' : 'password'}
              name="password"
              placeholder="Minimo 8 caracteres"
              value={form.password}
              onChange={handleChange}
              required
            />
            <button type="button" className="show-pass-btn" onClick={() => setShowPass(!showPass)}>
              {showPass ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="field">
          <label>Rol</label>
          <div className="role-options">
            {ROLES.map((rol) => (
              <button
                key={rol.id}
                type="button"
                className={`role-option${form.rol_id === rol.id ? ' selected' : ''}`}
                onClick={() => handleRol(rol.id)}
              >
                <div className="role-dot" />
                <div>
                  <div className="role-label">{rol.label}</div>
                  <div className="role-desc">{rol.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn" disabled={cargando || !form.rol_id}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <div className="auth-footer">
        Ya tienes cuenta? <Link to="/login" className="link">Inicia sesion</Link>
      </div>
    </div>
  );
};

export default Register;
