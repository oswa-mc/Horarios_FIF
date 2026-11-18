const API_BASE_URL = 'http://localhost:8000/api';

export function getStoredUser() {
  const user = localStorage.getItem('fif_user');
  return user ? JSON.parse(user) : null;
}

export function getStoredToken() {
  return localStorage.getItem('fif_token') || '';
}

export function setSession(token, user) {
  localStorage.setItem('fif_token', token);
  localStorage.setItem('fif_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('fif_token');
  localStorage.removeItem('fif_user');
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || 'Ocurrio un error en el servidor';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.detail = data.detail;
    throw error;
  }

  return data;
}

export const api = {
  // Autenticacion
  login: (expediente, contrasena) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ expediente, contrasena }),
    }),

  getMe: () => request('/auth/me'),

  // Alumno
  getHorarioAlumno: (id_usuario) => request(`/alumno/${id_usuario}/horario`),

  // Docente
  getClasesDocente: (id_usuario) => request(`/docente/${id_usuario}/clases`),
  actualizarEstadoClase: (id_clase, payload) =>
    request(`/docente/clases/${id_clase}/estado`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin
  getAdminClases: () => request('/admin/clases'),
  crearClase: (claseData) =>
    request('/admin/clases', {
      method: 'POST',
      body: JSON.stringify(claseData),
    }),
  eliminarClase: (id_clase) =>
    request(`/admin/clases/${id_clase}`, {
      method: 'DELETE',
    }),

  // Eventos
  getEventos: () => request('/eventos'),
  crearEvento: (eventoData) =>
    request('/eventos', {
      method: 'POST',
      body: JSON.stringify(eventoData),
    }),
  cancelarEvento: (id_evento) =>
    request(`/eventos/${id_evento}/cancelar`, {
      method: 'PATCH',
    }),
  // PATCH /api/admin/eventos/{id_evento}
  actualizarEstadoEvento: (id_evento, estado_evento) =>
    request(`/admin/eventos/${id_evento}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado_evento }),
    }),

  // Espacios
  getEspacios: () => request('/espacios'),
  getEspaciosDisponibles: (fecha, hora_inicio, hora_fin) =>
    request(`/espacios/disponibles?fecha=${fecha}&hora_inicio=${hora_inicio}&hora_fin=${hora_fin}`),

  // Catalogos
  getMaterias: () => request('/materias'),
  getDocentes: () => request('/docentes'),
};

