import React, { useState, useEffect } from 'react';
import { api } from '../api';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export default function DocenteView({ user, targetTabTrigger }) {
  const [activeTab, setActiveTab] = useState('clases'); // 'clases' | 'horario' | 'eventos'
  const [clases, setClases] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [filtroEventos, setFiltroEventos] = useState('todos'); // 'todos' | 'mis_propuestas' | 'aprobados'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Si se emitio un trigger para ir a eventos, cambiar de pestana directamente
  useEffect(() => {
    if (targetTabTrigger) {
      setActiveTab('eventos');
      fetchEventos();
    }
  }, [targetTabTrigger]);

  const fetchEventos = async () => {
    try {
      const data = await api.getEventos();
      setEventos(data);
    } catch (err) {
      console.error("Error al cargar eventos en docente:", err);
    }
  };

  // Estados locales editables por tarjeta de clase
  const [formStates, setFormStates] = useState({});

  const fetchClases = async () => {
    try {
      const data = await api.getClasesDocente(user.id_usuario);
      setClases(data);
      setError('');

      const initialForms = {};
      data.forEach((c) => {
        initialForms[c.id_clase] = {
          estado: c.estado || 'normal',
          enlace_virtual: c.enlace_virtual || '',
          observaciones: c.observaciones || '',
          fecha: new Date().toISOString().split('T')[0],
          saving: false,
          successMsg: '',
          errorMsg: '',
        };
      });
      setFormStates(initialForms);
    } catch (err) {
      console.error("Error al cargar clases del docente:", err);
      setError(err.detail || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClases();
    fetchEventos();

    // Sincronizacion periodica en vivo cada 3 segundos
    const intervalId = setInterval(() => {
      fetchClases();
      fetchEventos();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [user.id_usuario]);

  // Manejadores de cambios en campos locales
  const handleInputChange = (idClase, field, value) => {
    setFormStates((prev) => ({
      ...prev,
      [idClase]: {
        ...prev[idClase],
        [field]: value,
        successMsg: '',
        errorMsg: '',
      },
    }));
  };

  // Guardar cambio de estado de clase
  const handleGuardarEstado = async (idClase) => {
    const form = formStates[idClase];
    if (!form) return;

    if (form.estado === 'virtual' && (!form.enlace_virtual || !form.enlace_virtual.startsWith('http'))) {
      setFormStates((prev) => ({
        ...prev,
        [idClase]: {
          ...prev[idClase],
          errorMsg: 'Debe ingresar un enlace web valido (iniciado con http:// o https://)',
        },
      }));
      return;
    }

    setFormStates((prev) => ({
      ...prev,
      [idClase]: { ...prev[idClase], saving: true, errorMsg: '', successMsg: '' },
    }));

    try {
      await api.actualizarEstadoClase(idClase, {
        fecha: form.fecha || new Date().toISOString().split('T')[0],
        estado: form.estado,
        enlace_virtual: form.estado === 'virtual' ? form.enlace_virtual : null,
        observaciones: form.observaciones.trim() || null,
      });

      setFormStates((prev) => ({
        ...prev,
        [idClase]: {
          ...prev[idClase],
          saving: false,
          successMsg: '✓ Estado actualizado correctamente',
        },
      }));

      // Actualizar tambien la lista principal de clases
      setClases((prevClases) =>
        prevClases.map((c) =>
          c.id_clase === idClase
            ? { ...c, estado: form.estado, enlace_virtual: form.enlace_virtual, observaciones: form.observaciones }
            : c
        )
      );

      setTimeout(() => {
        setFormStates((prev) => ({
          ...prev,
          [idClase]: { ...prev[idClase], successMsg: '' },
        }));
      }, 4000);
    } catch (err) {
      setFormStates((prev) => ({
        ...prev,
        [idClase]: {
          ...prev[idClase],
          saving: false,
          errorMsg: err.detail || 'Error al guardar el estado',
        },
      }));
    }
  };

  // Metricas para las tarjetas de resumen
  const totalClases = clases.length;
  const totalAlumnos = clases.reduce((acc, c) => acc + (parseInt(c.total_alumnos, 10) || 0), 0);
  const sesionesVirtuales = clases.filter((c) => c.estado === 'virtual').length;

  return (
    <div className="main-content">
      {/* Subnav / Tabs */}
      <div className="tab-list">
        <button
          className={`tab-btn ${activeTab === 'clases' ? 'active' : ''}`}
          onClick={() => setActiveTab('clases')}
        >
          📋 Mis Clases Asignadas
        </button>
        <button
          className={`tab-btn ${activeTab === 'horario' ? 'active' : ''}`}
          onClick={() => setActiveTab('horario')}
        >
          📅 Mi Horario Docente
        </button>
        <button
          className={`tab-btn ${activeTab === 'eventos' ? 'active' : ''}`}
          onClick={() => setActiveTab('eventos')}
        >
          📨 Eventos Comunitarios ({eventos.length})
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* TARJETAS RESUMEN */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div>
            <div className="stat-number">{totalClases}</div>
            <div className="stat-label">Clases Asignadas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>👥</div>
          <div>
            <div className="stat-number">{totalAlumnos}</div>
            <div className="stat-label">Estudiantes Inscritos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>📹</div>
          <div>
            <div className="stat-number">{sesionesVirtuales}</div>
            <div className="stat-label">Sesiones Virtuales Activas</div>
          </div>
        </div>
      </div>

      {/* VISTA 1: LISTA DETALLADA DE CLASES CON CONTROLES */}
      {activeTab === 'clases' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Gestion de Estado de Clases</h2>
            <p style={{ color: '#64748B', fontSize: '0.88rem' }}>
              Puedes cambiar el estado de tus clases (ej. pasar a virtual e ingresar enlace, o cancelar por motivos de fuerza mayor). Tus estudiantes recibiran los avisos al instante.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
            {clases.map((clase) => {
              const form = formStates[clase.id_clase] || {
                estado: clase.estado || 'normal',
                enlace_virtual: clase.enlace_virtual || '',
                observaciones: clase.observaciones || '',
                saving: false,
                successMsg: '',
                errorMsg: '',
              };

              const isVirtual = form.estado === 'virtual';

              return (
                <div key={clase.id_clase} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Header de la tarjeta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
                        {clase.dia_semana.toUpperCase()} {clase.hora_inicio} - {clase.hora_fin}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        👥 {clase.total_alumnos} alumnos
                      </span>
                    </div>

                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                      {clase.clave_materia} - {clase.nombre_materia}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px' }}>
                      📍 Espacio asignado: <strong>{clase.nombre_espacio}</strong> ({clase.tipo_espacio})
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', marginBottom: '16px' }} />

                    {/* Selector de Estado */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.82rem' }}>Estado Actual de la Clase:</label>
                      <select
                        className="form-control"
                        value={form.estado}
                        onChange={(e) => handleInputChange(clase.id_clase, 'estado', e.target.value)}
                      >
                        <option value="normal">🟢 Presencial (Normal)</option>
                        <option value="virtual">🔵 Sesion Virtual (Videollamada)</option>
                        <option value="cancelada">🔴 Clase Cancelada</option>
                        <option value="reprogramada">🟠 Clase Reprogramada</option>
                      </select>
                    </div>

                    {/* Campo Enlace web */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.82rem' }}>
                        Enlace a Videollamada (Google Meet, Zoom, etc.): {isVirtual && <strong style={{ color: '#2563EB' }}>* Requerido</strong>}
                      </label>
                      <input
                        type="url"
                        className={`form-control ${isVirtual ? 'highlight-virtual' : ''}`}
                        placeholder="https://meet.google.com/..."
                        value={form.enlace_virtual}
                        onChange={(e) => handleInputChange(clase.id_clase, 'enlace_virtual', e.target.value)}
                        disabled={!isVirtual && form.estado !== 'normal'}
                      />
                    </div>

                    {/* Observaciones */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.82rem' }}>Aviso / Observaciones para los Alumnos:</label>
                      <textarea
                        rows="2"
                        className="form-control"
                        placeholder="Ej. Llevar material didactico / Sesion virtual por mantenimiento..."
                        value={form.observaciones}
                        onChange={(e) => handleInputChange(clase.id_clase, 'observaciones', e.target.value)}
                      />
                    </div>

                    {form.errorMsg && (
                      <div className="field-error" style={{ marginBottom: '10px' }}>
                        ⚠️ {form.errorMsg}
                      </div>
                    )}

                    {form.successMsg && (
                      <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '10px' }}>
                        {form.successMsg}
                      </div>
                    )}
                  </div>

                  {/* Boton Guardar */}
                  <div style={{ marginTop: '12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => handleGuardarEstado(clase.id_clase)}
                      disabled={form.saving}
                    >
                      {form.saving ? 'Guardando cambios...' : 'Guardar Estado y Notificar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: HORARIO DOCENTE */}
      {activeTab === 'horario' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>Mi Cronograma Semanal</h2>
          <div className="weekly-grid">
            {DIAS_SEMANA.map((dia) => {
              const clasesDia = clases.filter((c) => c.dia_semana === dia);
              return (
                <div key={dia} className="day-column">
                  <div className="day-header">
                    <span>{dia}</span>
                    <span className="count">{clasesDia.length}</span>
                  </div>
                  {clasesDia.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', marginTop: '40px' }}>
                      Sin clases
                    </div>
                  ) : (
                    clasesDia.map((c) => (
                      <div key={c.id_clase} className="class-card">
                        <div className="class-time">{c.hora_inicio} - {c.hora_fin}</div>
                        <div className="class-code">{c.clave_materia}</div>
                        <div className="class-name">{c.nombre_materia}</div>
                        <div className="class-meta">
                          <span>📍 {c.nombre_espacio}</span>
                          <span>👥 {c.total_alumnos} inscritos</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: EVENTOS COMUNITARIOS DE LA FACULTAD */}
      {activeTab === 'eventos' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Eventos Comunitarios de la Facultad</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                Consulta los eventos programados en los espacios academicos y el estado de tus propuestas.
              </p>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventos === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventos('todos')}
              >
                Todos ({eventos.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventos === 'mis_propuestas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventos('mis_propuestas')}
              >
                Mis Solicitudes ({eventos.filter((e) => e.id_proponente === user.id_usuario).length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventos === 'aprobados' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventos('aprobados')}
              >
                Aprobados ({eventos.filter((e) => e.estado_evento === 'aprobado').length})
              </button>
            </div>
          </div>

          {eventos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              No hay eventos para mostrar. Haz clic en <strong>+ Proponer evento</strong> en la barra superior para registrar una actividad.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Titulo y Proponente</th>
                    <th>Espacio Asignado</th>
                    <th>Fecha y Horario</th>
                    <th>Estado</th>
                    <th>Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos
                    .filter((ev) => {
                      if (filtroEventos === 'mis_propuestas') return ev.id_proponente === user.id_usuario;
                      if (filtroEventos === 'aprobados') return ev.estado_evento === 'aprobado';
                      return true;
                    })
                    .map((ev) => {
                      const esMio = ev.id_proponente === user.id_usuario;
                      return (
                        <tr key={ev.id_evento} style={esMio && ev.estado_evento === 'pendiente' ? { background: '#EFF6FF' } : {}}>
                          <td>
                            <div style={{ fontWeight: '700' }}>{ev.titulo}</div>
                            <div style={{ fontSize: '0.78rem', color: esMio ? '#2563EB' : '#64748B', fontWeight: esMio ? '600' : 'normal' }}>
                              {esMio ? '👤 Mi propuesta' : `Por: ${ev.nombre_proponente} (${ev.rol_proponente})`}
                            </div>
                          </td>
                          <td>
                            <div>{ev.nombre_espacio}</div>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Cap: {ev.capacidad_espacio} pers.</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600' }}>{ev.fecha_evento}</div>
                            <div style={{ fontSize: '0.8rem', color: '#2563EB' }}>{ev.hora_inicio} - {ev.hora_fin} hrs</div>
                          </td>
                          <td>
                            {ev.estado_evento === 'aprobado' && <span className="badge badge-aprobado">Aprobado</span>}
                            {ev.estado_evento === 'rechazado' && <span className="badge badge-rechazado">Rechazado</span>}
                            {ev.estado_evento === 'cancelado' && <span className="badge badge-cancelada">Cancelado</span>}
                            {ev.estado_evento === 'pendiente' && <span className="badge badge-pendiente">Pendiente</span>}
                          </td>
                          <td style={{ color: '#64748B', maxWidth: '300px' }}>
                            {ev.descripcion || 'Sin descripcion'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
