import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FarmarcasLogo from './FarmarcasLogo';
import {
  IconDashboard,
  IconStock,
  IconOrders,
  IconWebhooks,
  IconReports,
  IconTriggers,
  IconUsers,
  IconProfile,
  IconLogout,
} from './Icons';
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
          <FarmarcasLogo width={38} height={38} />
          <div>
            <div className="sidebar-logo-text">MVP ESTOQUE</div>
            <div className="sidebar-logo-sub">TI FARMARCAS</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navegação</div>

        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon"><IconDashboard /></span>
          Dashboard
          {criticalItems > 0 && <span className="badge-count">{criticalItems}</span>}
        </NavLink>

        <NavLink to="/estoque" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon"><IconStock /></span>
          Estoque
        </NavLink>

        <NavLink to="/pedidos" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon"><IconOrders /></span>
          Pedidos de Compra
          {pendingOrders > 0 && <span className="badge-count" style={{ background: 'var(--orange)' }}>{pendingOrders}</span>}
        </NavLink>

        {can('ADMIN', 'TI') && (
          <NavLink to="/webhooks" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon"><IconWebhooks /></span>
            Webhooks
          </NavLink>
        )}

        {can('ADMIN', 'TI') && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Análise</div>
            <NavLink to="/relatorios" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon"><IconReports /></span>
              Relatórios Mensais
            </NavLink>
          </>
        )}

        {can('ADMIN') && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Administração</div>
            <NavLink to="/triggers" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon"><IconTriggers /></span>
              Triggers
            </NavLink>
            <NavLink to="/usuarios" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon"><IconUsers /></span>
              Usuários
            </NavLink>
          </>
        )}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Conta</div>
        <NavLink to="/perfil" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon"><IconProfile /></span>
          Meu Perfil
        </NavLink>
        <button className="nav-item" onClick={handleLogout}>
          <span className="nav-icon"><IconLogout /></span>
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
