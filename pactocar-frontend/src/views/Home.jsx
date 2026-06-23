import { Link } from 'react-router-dom';

const Home = () => (
  <div>
    <h1>Bienvenido a PactoCar</h1>
    <p>La plataforma de Car Sharing colaborativo entre particulares.</p>
    <Link to="/login">Iniciar sesión</Link>
    {' | '}
    <Link to="/register">Crear cuenta</Link>
  </div>
);

export default Home;
