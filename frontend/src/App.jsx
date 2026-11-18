import React, { useState, useEffect } from 'react';
import { getStoredUser, clearSession } from './api';
import Navbar from './components/Navbar';
import ModalEvento from './components/ModalEvento';
import Login from './pages/Login';
import AlumnoView from './pages/AlumnoView';
import DocenteView from './pages/DocenteView';
import AdminView from './pages/AdminView';

export default function App() {
  const [user, setUser] = useState(null);
  const [modalEventoOpen, setModalEventoOpen] = useState(false);
  const [targetTabTrigger, setTargetTabTrigger] = useState(null);

  // Sincronizar ruta en barra de direcciones
  const updateRoute = (rol) => {
    let path = '/';
    if (rol === 'alumno') path = '/alumno';
    else if (rol === 'docente') path = '/docente';
    else if (rol === 'administrador') path = '/admin';

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      updateRoute(storedUser.rol);
    } else {
      updateRoute(null);
    }
  }, []);

  const handleLoginSuccess = (usuario) => {
    setUser(usuario);
    updateRoute(usuario.rol);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    updateRoute(null);
  };

  const handleEventoCreado = () => {
    // Al registrar un evento, no reiniciar la vista ni mandar a horario: mandar a solicitudes/eventos
    setTargetTabTrigger({ tab: 'eventos', timestamp: Date.now() });
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenModalEvento={() => setModalEventoOpen(true)}
      />

      <main>
        {user.rol === 'alumno' && <AlumnoView user={user} targetTabTrigger={targetTabTrigger} />}
        {user.rol === 'docente' && <DocenteView user={user} targetTabTrigger={targetTabTrigger} />}
        {user.rol === 'administrador' && <AdminView user={user} targetTabTrigger={targetTabTrigger} />}
      </main>

      {/* Modal global de propuesta de evento comunitario */}
      <ModalEvento
        isOpen={modalEventoOpen}
        onClose={() => setModalEventoOpen(false)}
        onEventoCreado={handleEventoCreado}
      />
    </div>
  );
}

