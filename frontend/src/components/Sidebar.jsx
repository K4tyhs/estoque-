import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ROLE_LABELS = { ADMIN: 'Administrador', TI: 'Equipe TI', PATRIMONIO: 'Patrimônio' };

export default function Sidebar() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState(0);
  const [criticalItems, setCriticalItems] = useState(0);

  useEffect(() => {
    async function loadCounts() {
      try {
        const [items, orders] = await Promise.all([
          api.get('/stock'),
          api.get('/purchase-orders?status=PENDING'),
        ]);
        setCriticalItems(items.data.filter(i => i.status === 'CRITICAL' || i.status === 'ALERT').length);
        setPendingOrders(orders.data.length);
      } catch {}
    }
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="flex items-center gap-12">
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #FF6B00, #ff4500)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            📦
          </div>
          <div>
            <div className="sidebar-logo-text">MVP Estoque</div>
            <div className="sidebar-logo-sub">TI Farmarcas</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Principal</div>

        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">📊</span>
          Dashboard
          {criticalItems > 0 && <span className="badge-count">{criticalItems}</span>}
        </NavLink>

        <NavLink to="/estoque" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">📦</span>
          Estoque
        </NavLink>

        {can('ADMIN', 'TI') && (
          <NavLink to="/webhooks" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🔗</span>
            Webhooks
          </NavLink>
        )}

        {can('ADMIN', 'TI') && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Relatórios</div>
            <NavLink to="/relatorios" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">📈</span>
              Relatórios
            </NavLink>
          </>
        )}

        {can('ADMIN') && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Administração</div>
            <NavLink to="/triggers" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">⚡</span>
              Triggers
            </NavLink>
            <NavLink to="/usuarios" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">👥</span>
              Usuários
            </NavLink>
          </>
        )}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Conta</div>
        <NavLink to="/perfil" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon">👤</span>
          Perfil
        </NavLink>
        <button className="nav-item" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Sair
        </button>
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-name">{user?.name}</div>
        <div className="sidebar-user-email">{user?.email}</div>
        <div style={{ marginTop: 6 }}>
          <span className={`badge badge-${user?.role?.toLowerCase()}`}>
            {ROLE_LABELS[user?.role]}
          </span>
        </div>
      </div>
    </div>
  );
}
