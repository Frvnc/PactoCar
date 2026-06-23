import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

import Home from './views/Home';
import Login from './views/Login';
import Register from './views/Register';
import AdminDashboard from './views/AdminDashboard';
import MisVehiculos from './views/MisVehiculos';
import Catalogo from './views/Catalogo';
import Unauthorized from './views/Unauthorized';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

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
    </AuthProvider>
  );
}

export default App;
