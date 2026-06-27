import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PerfilEditor = () => {
  const { auth, login } = useContext(AuthContext);
  const { showToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: auth.usuario?.nombre || '',
    password_actual: '',
    password_nueva: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/auth/perfil`,
        form,
        { headers }
      );
      login(auth.token, { ...auth.usuario, nombre: data.usuario.nombre_completo });
      showToast('Perfil actualizado correctamente.');
      setForm((prev) => ({ ...prev, password_actual: '', password_nueva: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el perfil.');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <button className="btn-link" onClick={() => setAbierto(true)}>
          Editar perfil
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Editar perfil</span>
        <button className="btn-link" onClick={() => { setAbierto(false); setError(''); }}>
          Cerrar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Nombre completo</label>
          <input
            className="input"
            name="nombre_completo"
            value={form.nombre_completo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label>Contrasena actual</label>
          <input
            className="input"
            type="password"
            name="password_actual"
            placeholder="Requerida para guardar cambios"
            value={form.password_actual}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label>Nueva contrasena (opcional)</label>
          <input
            className="input"
            type="password"
            name="password_nueva"
            placeholder="Dejar en blanco para no cambiar"
            value={form.password_nueva}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
};

export default PerfilEditor;
