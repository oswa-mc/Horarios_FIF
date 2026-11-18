import React from 'react';

export default function Navbar({ user, onLogout, onOpenModalEvento, activeTab, setActiveTab }) {
  const getRoleBadge = (rol) => {
    switch (rol) {
      case 'administrador':
        return <span className="badge badge-normal" style={{ background: '#E0E7FF', color: '#4338CA' }}>Administrador</span>;
      case 'docente':
        return <span className="badge badge-virtual">Docente</span>;
      case 'alumno':
      default:
        return <span className="badge badge-normal">Estudiante</span>;
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo">FIF</div>
        <div className="brand-text">
          <h1>UAQ | Campus Virtual</h1>
          <span>Facultad de Informatica</span>
        </div>
      </div>

      {user && (
        <div className="navbar-actions">
          {/* Boton primario visible de proponer evento para todos los usuarios */}
          <button
            className="btn btn-primary"
            onClick={onOpenModalEvento}
            title="Solicitar reserva de espacio para evento comunitario"
          >
            + Proponer evento
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>{user.nombre}</div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Exp: {user.expediente}</span>
                {getRoleBadge(user.rol)}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onLogout}
              style={{ color: '#DC2626' }}
              title="Cerrar sesion"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
