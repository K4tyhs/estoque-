import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Orders from './pages/Orders';
import Triggers from './pages/Triggers';
import Reports from './pages/Reports';
import Webhooks from './pages/Webhooks';
import Users from './pages/Users';
import Profile from './pages/Profile';

import ResetPassword from './pages/ResetPassword';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando...</span></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/estoque" element={<Stock />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/triggers" element={<PrivateRoute roles={['ADMIN']}><Triggers /></PrivateRoute>} />
          <Route path="/relatorios" element={<PrivateRoute roles={['ADMIN', 'TI']}><Reports /></PrivateRoute>} />
          <Route path="/webhooks" element={<PrivateRoute roles={['ADMIN', 'TI']}><Webhooks /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute roles={['ADMIN']}><Users /></PrivateRoute>} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        <Route path="/*" element={<PrivateRoute><AppLayout /></PrivateRoute>} />
      </Routes>
    </AuthProvider>
  );
}
