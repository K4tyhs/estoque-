import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FarmarcasLogo from '../components/FarmarcasLogo';
import { IconEye, IconEyeOff, IconAlert, IconCheck } from '../components/Icons';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'first' | 'request'

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // First access form state
  const [firstEmail, setFirstEmail] = useState('');
  const [firstPass, setFirstPass] = useState('');
  const [firstPassConfirm, setFirstPassConfirm] = useState('');

  // Request access form state
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqRole, setReqRole] = useState('TI');
  const [reqReason, setReqReason] = useState('');

  const validateEmailDomain = (emailVal) => {
    if (!emailVal.trim().toLowerCase().endsWith('@farmarcas.com.br')) {
      return 'Apenas e-mails corporativos @farmarcas.com.br são permitidos.';
    }
    return null;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const domainErr = validateEmailDomain(email);
    if (domainErr) return setError(domainErr);

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao efetuar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstAccessSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const domainErr = validateEmailDomain(firstEmail);
    if (domainErr) return setError(domainErr);

    if (firstPass !== firstPassConfirm) {
      return setError('As senhas não coincidem');
    }
    if (firstPass.length < 8) {
      return setError('A senha deve ter no mínimo 8 caracteres');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/first-access', {
        email: firstEmail,
        password: firstPass,
      });
      setSuccess(data.message || 'Senha cadastrada com sucesso! Faça login.');
      setTab('login');
      setEmail(firstEmail);
      setFirstEmail(''); setFirstPass(''); setFirstPassConfirm('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar primeiro acesso.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccessSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const domainErr = validateEmailDomain(reqEmail);
    if (domainErr) return setError(domainErr);

    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-access', {
        name: reqName,
        email: reqEmail,
        role: reqRole,
        reason: reqReason,
      });
      setSuccess(data.message || 'Solicitação enviada ao Administrador!');
      setReqName(''); setReqEmail(''); setReqReason('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar solicitação de acesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-card fade-in">
        <div className="login-logo">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <FarmarcasLogo width={64} height={64} />
          </div>
          <div className="login-logo-title">ESTOQUE</div>
          <div className="login-logo-sub">Sistema de Gestão Preditiva de Estoque · TI Farmarcas</div>
        </div>

        <div className="flex gap-8 mb-24" style={{ background: 'var(--bg-dark)', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            className={`btn ${tab === 'login' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px', fontSize: 13 }}
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`btn ${tab === 'first' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px', fontSize: 13 }}
            onClick={() => { setTab('first'); setError(''); setSuccess(''); }}
          >
            Primeiro acesso
          </button>
          <button
            type="button"
            className={`btn ${tab === 'request' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px', fontSize: 13 }}
            onClick={() => { setTab('request'); setError(''); setSuccess(''); }}
          >
            Solicitar Acesso
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-16">
            <IconAlert size={16} /> {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-16">
            <IconCheck size={16} /> {success}
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail corporativo (@farmarcas.com.br)</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="seu.email@farmarcas.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Sua senha de acesso"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }}></div> Acessando...</> : 'Entrar no Sistema'}
            </button>
          </form>
        )}

        {tab === 'first' && (
          <form onSubmit={handleFirstAccessSubmit}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Se o seu e-mail corporativo foi pré-autorizado ou aprovado pelo Administrador, cadastre sua senha abaixo:
            </p>

            <div className="form-group">
              <label className="form-label">E-mail corporativo *</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu.email@farmarcas.com.br"
                value={firstEmail}
                onChange={e => setFirstEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nova Senha (mín. 8 caracteres) *</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={firstPass}
                onChange={e => setFirstPass(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Nova Senha *</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={firstPassConfirm}
                onChange={e => setFirstPassConfirm(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }}></div> Cadastrando...</> : 'Cadastrar Senha e Ativar'}
            </button>
          </form>
        )}

        {tab === 'request' && (
          <form onSubmit={handleRequestAccessSubmit}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Não possui pré-autorização? Solicite permissão de acesso diretamente ao Administrador:
            </p>

            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Seu nome"
                value={reqName}
                onChange={e => setReqName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail corporativo (@farmarcas.com.br) *</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu.email@farmarcas.com.br"
                value={reqEmail}
                onChange={e => setReqEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Perfil Desejado *</label>
              <select
                className="form-select"
                value={reqRole}
                onChange={e => setReqRole(e.target.value)}
              >
                <option value="TI">Equipe de TI</option>
                <option value="PATRIMONIO">Equipe de Patrimônio</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }}></div> Enviando...</> : 'Enviar Solicitação ao Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
