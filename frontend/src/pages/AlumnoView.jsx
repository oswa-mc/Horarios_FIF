import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  CalendarIcon,
  InboxIcon,
  BookOpenIcon,
  BookmarkIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  VideoIcon,
  AlertTriangleIcon,
  FilterIcon
} from '../components/Icons';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export default function AlumnoView({ user, targetTabTrigger }) {
  const [activeTab, setActiveTab] = useState('horario'); // 'horario' | 'solicitudes' | 'asignaturas'
  const [clases, setClases] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtroEventos, setFiltroEventos] = useState('todos'); // 'todos' | 'mis_solicitudes' | 'comunidad'
  const [filtroMateria, setFiltroMateria] = useState(''); // Filtrar por clase
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Si se emitio un trigger para ir a solicitudes/eventos, cambiar de pestana sin volver a horario
  useEffect(() => {
    if (targetTabTrigger) {
      setActiveTab('solicitudes');
      fetchSolicitudes();
    }
  }, [targetTabTrigger]);

  const fetchHorario = async () => {
    try {
      const data = await api.getHorarioAlumno(user.id_usuario);
      setClases(data);
      setError('');
    } catch (err) {
      console.error("Error al cargar horario del alumno:", err);
      setError(err.detail || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSolicitudes = async () => {
    try {
      const data = await api.getEventos();
      setSolicitudes(data);
    } catch (err) {
      console.error("Error al cargar solicitudes:", err);
    }
  };

  const handleCancelarEvento = async (idEvento) => {
    if (!window.confirm("Estas seguro de que deseas cancelar este evento?")) return;
    try {
      await api.cancelarEvento(idEvento);
      setSolicitudes((prev) =>
        prev.map((e) => (e.id_evento === idEvento ? { ...e, estado_evento: 'cancelado' } : e))
      );
    } catch (err) {
      alert(err.detail || "Error al cancelar el evento");
    }
  };

  // Carga inicial y Polling cada 3 segundos (RNF2: Actualizacion en tiempo real)
  useEffect(() => {
    fetchHorario();
    fetchSolicitudes();

    const intervalId = setInterval(() => {
      fetchHorario();
      if (activeTab === 'solicitudes') {
        fetchSolicitudes();
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [user.id_usuario, activeTab]);

  // Calculo de la proxima clase del dia
  const getProximaClase = () => {
    if (!clases || clases.length === 0) return null;

    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const now = new Date();
    const hoy = daysMap[now.getDay()];
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Buscar clase de hoy que no haya terminado
    const clasesHoy = clases.filter((c) => c.dia_semana === hoy);
    const proximaHoy = clasesHoy.find((c) => c.hora_fin > horaActual);
    if (proximaHoy) return { ...proximaHoy, esHoy: true };

    // Si no hay mas hoy o no hay clases hoy, tomar la primera de la semana
    return { ...clases[0], esHoy: false };
  };

  const proximaClase = getProximaClase();

  // Filtrado de clases por materia si el alumno selecciona una clase especifica
  const clasesFiltradas = filtroMateria
    ? clases.filter((c) => String(c.id_materia) === String(filtroMateria))
    : clases;

  // Agrupar clases filtradas por dia de la semana para la parrilla semanal
  const clasesPorDia = DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = clasesFiltradas.filter((c) => c.dia_semana === dia);
    return acc;
  }, {});

  // Extraer lista unica de asignaturas para el filtro y para la pestana de asignaturas
  const asignaturasUnicas = Array.from(
    new Set(clases.map((c) => c.id_materia))
  ).map((id) => clases.find((c) => c.id_materia === id));

  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'virtual':
        return <span className="badge badge-virtual">Virtual</span>;
      case 'cancelada':
        return <span className="badge badge-cancelada">Cancelada</span>;
      case 'reprogramada':
        return <span className="badge badge-reprogramada">Reprogramada</span>;
      default:
        return <span className="badge badge-normal">Presencial</span>;
    }
  };

  const renderBadgeSolicitud = (estado) => {
    switch (estado) {
      case 'aprobado':
        return <span className="badge badge-aprobado">Aprobado</span>;
      case 'rechazado':
        return <span className="badge badge-rechazado">Rechazado</span>;
      case 'cancelado':
        return <span className="badge badge-cancelada">Cancelado</span>;
      default:
        return <span className="badge badge-pendiente">Pendiente</span>;
    }
  };

  return (
    <div className="main-content">
      {/* Navbar secundario / Tabs */}
      <div className="tab-list">
        <button
          className={`tab-btn ${activeTab === 'horario' ? 'active' : ''}`}
          onClick={() => setActiveTab('horario')}
        >
          <CalendarIcon size={16} /> Mi Horario Semanal
        </button>
        <button
          className={`tab-btn ${activeTab === 'solicitudes' ? 'active' : ''}`}
          onClick={() => setActiveTab('solicitudes')}
        >
          <InboxIcon size={16} /> Eventos Comunitarios ({solicitudes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'asignaturas' ? 'active' : ''}`}
          onClick={() => setActiveTab('asignaturas')}
        >
          <BookOpenIcon size={16} /> Asignaturas Inscritas ({asignaturasUnicas.length})
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* BANNER DESTACANDO LA PROXIMA CLASE DEL DIA */}
      {proximaClase && activeTab === 'horario' && (
        <div className="next-class-banner">
          <div className="next-class-info">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookmarkIcon size={18} />
              {proximaClase.esHoy ? 'Tu Proxima Clase Hoy' : `Proxima Clase Asignada (${proximaClase.dia_semana.toUpperCase()})`}
            </h3>
            <div className="class-title">
              {proximaClase.clave_materia} - {proximaClase.nombre_materia}
            </div>
            <div className="next-class-details">
              <span><ClockIcon size={14} /> {proximaClase.hora_inicio} - {proximaClase.hora_fin} hrs</span>
              <span><MapPinIcon size={14} /> {proximaClase.nombre_espacio}</span>
              <span><UserIcon size={14} /> Prof. {proximaClase.nombre_docente}</span>
              <span style={{ textTransform: 'capitalize' }}>
                Estado: <strong>{proximaClase.estado}</strong>
              </span>
            </div>
            {proximaClase.observaciones && (
              <div style={{ marginTop: '8px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px' }}>
                Nota del docente: {proximaClase.observaciones}
              </div>
            )}
          </div>

          {proximaClase.estado === 'virtual' && proximaClase.enlace_virtual && (
            <div>
              <a
                href={proximaClase.enlace_virtual}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ background: 'white', color: '#1D4ED8', fontWeight: '700', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <VideoIcon size={16} /> Unirse a videollamada
              </a>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: PARRILLA SEMANAL (LUNES A SABADO) */}
      {activeTab === 'horario' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Parrilla Semanal de Clases</h2>
            <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22C55E', borderRadius: '50%' }}></span>
              Sincronizacion en vivo (cada 3s)
            </div>
          </div>

          {/* FILTRO POR CLASE / MATERIA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: '#F8FAFC', padding: '10px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.88rem', fontWeight: '600' }}>
              <FilterIcon size={16} />
              <span>Filtrar por clase:</span>
            </div>
            <select
              className="form-control"
              style={{ maxWidth: '320px', padding: '6px 12px', fontSize: '0.85rem' }}
              value={filtroMateria}
              onChange={(e) => setFiltroMateria(e.target.value)}
            >
              <option value="">-- Todas las clases asignadas ({asignaturasUnicas.length}) --</option>
              {asignaturasUnicas.map((m) => (
                <option key={m.id_materia} value={m.id_materia}>
                  {m.clave_materia} - {m.nombre_materia}
                </option>
              ))}
            </select>
            {filtroMateria && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFiltroMateria('')}
              >
                Mostrar todas las clases
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: 'auto' }}>
              {clasesFiltradas.length} bloque(s) de clase visible(s)
            </span>
          </div>

          <div className="weekly-grid">
            {DIAS_SEMANA.map((dia) => {
              const clasesDelDia = clasesPorDia[dia] || [];
              return (
                <div key={dia} className="day-column">
                  <div className="day-header">
                    <span>{dia}</span>
                    <span className="count">{clasesDelDia.length}</span>
                  </div>

                  {clasesDelDia.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', marginTop: '40px' }}>
                      Sin clases
                    </div>
                  ) : (
                    clasesDelDia.map((c) => {
                      const isVirtual = c.estado === 'virtual';
                      const isCancelada = c.estado === 'cancelada';
                      const isReprogramada = c.estado === 'reprogramada';

                      let cardModifier = '';
                      if (isVirtual) cardModifier = 'virtual-card';
                      else if (isCancelada) cardModifier = 'cancelada-card';
                      else if (isReprogramada) cardModifier = 'reprogramada-card';

                      return (
                        <div key={c.id_clase} className={`class-card ${cardModifier}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="class-time">
                              {c.hora_inicio} - {c.hora_fin}
                            </div>
                            {renderBadgeEstado(c.estado)}
                          </div>

                          <div className="class-code">{c.clave_materia}</div>
                          <div className="class-name">{c.nombre_materia}</div>

                          <div className="class-meta">
                            <span><MapPinIcon size={13} /> {c.nombre_espacio}</span>
                            <span><UserIcon size={13} /> {c.nombre_docente}</span>
                          </div>

                          {/* Si hay observaciones de cancelacion o reprogramacion */}
                          {c.observaciones && (
                            <div className="class-notes" style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                              <AlertTriangleIcon size={14} />
                              <span>{c.observaciones}</span>
                            </div>
                          )}

                          {/* Si es virtual y tiene enlace: Boton Unirse a videollamada */}
                          {isVirtual && c.enlace_virtual && (
                            <a
                              href={c.enlace_virtual}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="join-meet-btn"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <VideoIcon size={14} /> Unirse a videollamada
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MIS SOLICITUDES DE EVENTOS Y EVENTOS COMUNITARIOS */}
      {activeTab === 'solicitudes' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Eventos Comunitarios y Solicitudes</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                Consulta tus solicitudes enviadas y los eventos aprobados para la comunidad universitaria.
              </p>
            </div>

            {/* Filtros rapidos */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventos === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventos('todos')}
              >
                Todos ({solicitudes.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventos === 'mis_solicitudes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventos('mis_solicitudes')}
              >
                Mis Solicitudes ({solicitudes.filter((e) => e.id_proponente === user.id_usuario).length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventos === 'comunidad' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventos('comunidad')}
              >
                Aprobados Comunidad ({solicitudes.filter((e) => e.estado_evento === 'aprobado').length})
              </button>
            </div>
          </div>

          {solicitudes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              No hay eventos para mostrar todavia. Haz clic en <strong>+ Proponer evento</strong> en la barra superior.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Titulo y Proponente</th>
                    <th>Espacio Solicitado</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Estado</th>
                    <th>Descripcion</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes
                    .filter((ev) => {
                      if (filtroEventos === 'mis_solicitudes') return ev.id_proponente === user.id_usuario;
                      if (filtroEventos === 'comunidad') return ev.estado_evento === 'aprobado';
                      return true;
                    })
                    .map((ev) => {
                      const esMio = ev.id_proponente === user.id_usuario;
                      const puedeCancelar = esMio && ev.estado_evento !== 'cancelado' && ev.estado_evento !== 'rechazado';
                      return (
                        <tr key={ev.id_evento} style={esMio && ev.estado_evento === 'pendiente' ? { background: '#EFF6FF' } : {}}>
                          <td>
                            <div style={{ fontWeight: '700' }}>{ev.titulo}</div>
                            <div style={{ fontSize: '0.78rem', color: esMio ? '#2563EB' : '#64748B', fontWeight: esMio ? '600' : 'normal' }}>
                              {esMio ? 'Mi propuesta' : `Por: ${ev.nombre_proponente} (${ev.rol_proponente})`}
                            </div>
                          </td>
                          <td>{ev.nombre_espacio} ({ev.tipo_espacio})</td>
                          <td>{ev.fecha_evento}</td>
                          <td>{ev.hora_inicio} - {ev.hora_fin}</td>
                          <td>{renderBadgeSolicitud(ev.estado_evento)}</td>
                          <td style={{ color: '#64748B', maxWidth: '300px' }}>
                            {ev.descripcion || 'Sin descripcion'}
                          </td>
                          <td>
                            {puedeCancelar ? (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => handleCancelarEvento(ev.id_evento)}
                                title="Cancelar esta propuesta de evento"
                              >
                                Cancelar
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                {ev.estado_evento === 'cancelado' ? 'Cancelado' : '-'}
                              </span>
                            )}
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

      {/* TAB 3: ASIGNATURAS INSCRITAS */}
      {activeTab === 'asignaturas' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>
            Materias Inscritas - Ciclo Activo
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {asignaturasUnicas.map((m) => (
              <div key={m.id_materia} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', background: '#F8FAFC' }}>
                <span className="badge badge-normal" style={{ marginBottom: '8px' }}>{m.clave_materia}</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', margin: '4px 0' }}>
                  {m.nombre_materia}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '6px' }}>
                  Docente titular: <strong>{m.nombre_docente}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  Aula asignada: <strong>{m.nombre_espacio} ({m.tipo_espacio})</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
