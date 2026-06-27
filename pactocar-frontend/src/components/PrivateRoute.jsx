import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, rolPermitido }) => {
  const { auth } = useContext(AuthContext);

  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }

  if (rolPermitido && auth.usuario?.rol_id !== rolPermitido) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (auth.usuario?.rol_id !== 1 && auth.usuario?.verificado === false) {
    return <Navigate to="/pending" replace />;
  }

  return children;
};

export default PrivateRoute;
