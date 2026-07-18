import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Icon from '../components/Icon';

const REDIRECT_POR_ROL = {
  1: '/admin/dashboard',
  2: '/mis-vehiculos',
  3: '/catalogo',
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        { email, password }
      );
      login(data.token, data.usuario);
      navigate(REDIRECT_POR_ROL[data.usuario.rol_id] || '/');
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
        <div className="auth-brand">
          <span className="auth-brand-badge"><Icon name="car" size={22} /></span>
          <span className="auth-brand-name">PactoCar</span>
        </div>
        <div className="auth-title">Bienvenido</div>
        <div className="auth-subtitle">Ingresa a tu cuenta de PactoCar</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Correo electronico</label>
          <input
            className="input"
            type="email"
            placeholder="tu@correo.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Contrasena</label>
          <div className="password-wrapper">
            <input
              className="input"
              type={showPass ? 'text' : 'password'}
              placeholder="Minimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="show-pass-btn" onClick={() => setShowPass(!showPass)}>
              {showPass ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Iniciar sesion'}
        </button>
      </form>

      <div className="auth-footer">
        No tienes cuenta? <Link to="/register" className="link">Registrate</Link>
      </div>
    </div>
  );
};

export default Login;
