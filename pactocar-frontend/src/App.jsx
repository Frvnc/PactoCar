import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/PrivateRoute';

import Home from './views/Home';
import Login from './views/Login';
import Register from './views/Register';
import AdminDashboard from './views/AdminDashboard';
import MisVehiculos from './views/MisVehiculos';
import Catalogo from './views/Catalogo';
import Unauthorized from './views/Unauthorized';
import Pending from './views/Pending';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/pending" element={<Pending />} />

          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute rolPermitido={1}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/mis-vehiculos"
            element={
              <PrivateRoute rolPermitido={2}>
                <MisVehiculos />
              </PrivateRoute>
            }
          />
          <Route
            path="/catalogo"
            element={
              <PrivateRoute rolPermitido={3}>
                <Catalogo />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
