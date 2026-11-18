import React, { useState } from 'react';
import { api, setSession } from '../api';

export default function Login({ onLoginSuccess }) {
  const [expediente, setExpediente] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expediente.trim() || !contrasena) {
      setErrorMsg('Por favor ingresa tanto tu expediente como tu contraseña.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await api.login(expediente.trim(), contrasena);
      setSession(data.token, data.usuario);
      if (onLoginSuccess) {
        onLoginSuccess(data.usuario);
      }
    } catch (err) {
      setErrorMsg(err.detail || 'Expediente o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (exp, pass) => {
    setExpediente(exp);
    setContrasena(pass);
    setErrorMsg('');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <h2>UAQ Campus Virtual</h2>
          <p>Facultad de Informatica (FIF) — Gestion Academica</p>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="expediente">Expediente Universitario</label>
            <input
              id="expediente"
              type="text"
              className="form-control"
              placeholder="Ej. 2024001, DOC001, ADM001"
              value={expediente}
              onChange={(e) => setExpediente(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Validando credenciales...' : 'Iniciar Sesion'}
          </button>
        </form>

        <div className="quick-login-pills">
          <p>Acceso rapido para pruebas (Datos Semilla):</p>
          <div className="pill-group">
            <button
              type="button"
              className="pill-btn"
              onClick={() => handleQuickFill('2024001', 'prueba123')}
            >
              🎓 Alumno (2024001)
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => handleQuickFill('DOC001', 'prueba123')}
            >
              👨‍🏫 Docente (DOC001)
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => handleQuickFill('ADM001', 'prueba123')}
            >
              🛡️ Admin (ADM001)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
