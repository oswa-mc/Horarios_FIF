import React, { useState, useEffect } from 'react';
import { api } from '../api';
import ModalEspaciosDisponibles from '../components/ModalEspaciosDisponibles';
import {
  ClipboardCheckIcon,
  InboxIcon,
  BuildingIcon,
  BellIcon,
  AlertTriangleIcon,
  UsersIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon
} from '../components/Icons';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export default function AdminView({ user, targetTabTrigger }) {
  const [activeTab, setActiveTab] = useState('programacion'); // 'programacion' | 'eventos' | 'espacios'
  const [filtroEventosAdmin, setFiltroEventosAdmin] = useState('todos'); // 'todos' | 'pendientes' | 'aprobados' | 'otros'

  // Datos para Programacion General
  const [clases, setClases] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [espacios, setEspacios] = useState([]);

  // Filtros de clases
  const [filtroMateriaAdmin, setFiltroMateriaAdmin] = useState('');
  const [busquedaClaseAdmin, setBusquedaClaseAdmin] = useState('');

  // Formulario nueva clase
  const [nuevaClase, setNuevaClase] = useState({
    id_materia: '',
    id_docente: '',
    id_espacio: '',
    dia_semana: 'lunes',
    hora_inicio: '08:00',
    hora_fin: '10:00',
    periodo_lectivo: '2026-2',
  });
  const [claseError, setClaseError] = useState('');
  const [claseSuccess, setClaseSuccess] = useState('');
  const [creandoClase, setCreandoClase] = useState(false);

  // Datos para Solicitudes de Eventos
  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionadoConflicto, setEventoSeleccionadoConflicto] = useState(null);
  const [modalDisponiblesAbierto, setModalDisponiblesAbierto] = useState(false);
  const [eventoActionError, setEventoActionError] = useState('');

  const [loading, setLoading] = useState(true);

  // Si se emitio un trigger para ir a eventos, cambiar de pestana directamente
  useEffect(() => {
    if (targetTabTrigger) {
      setActiveTab('eventos');
      api.getEventos().then(setEventos).catch(console.error);
    }
  }, [targetTabTrigger]);

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [clasesRes, matRes, docRes, espRes, evRes] = await Promise.all([
        api.getAdminClases(),
        api.getMaterias(),
        api.getDocentes(),
        api.getEspacios(),
        api.getEventos(),
      ]);
      setClases(clasesRes);
      setMaterias(matRes);
      setDocentes(docRes);
      setEspacios(espRes);
      setEventos(evRes);
    } catch (err) {
      console.error("Error al cargar datos administrativos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Sincronizacion periodica en vivo cada 3s para reflejar nuevos eventos inmediatamente
    const interval = setInterval(() => {
      api.getEventos().then(setEventos).catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Crear nueva clase
  const handleCrearClase = async (e) => {
    e.preventDefault();
    setClaseError('');
    setClaseSuccess('');

    if (!nuevaClase.id_materia || !nuevaClase.id_docente || !nuevaClase.id_espacio) {
      setClaseError('Por favor selecciona la materia, el docente y el espacio.');
      return;
    }

    setCreandoClase(true);
    try {
      await api.crearClase({
        id_materia: parseInt(nuevaClase.id_materia, 10),
        id_docente: parseInt(nuevaClase.id_docente, 10),
        id_espacio: parseInt(nuevaClase.id_espacio, 10),
        dia_semana: nuevaClase.dia_semana,
        hora_inicio: nuevaClase.hora_inicio,
        hora_fin: nuevaClase.hora_fin,
        periodo_lectivo: nuevaClase.periodo_lectivo,
      });

      setClaseSuccess('Clase programada con exito sin empalmes.');
      // Recargar clases y espacios
      const [nuevasClases, nuevosEspacios] = await Promise.all([
        api.getAdminClases(),
        api.getEspacios(),
      ]);
      setClases(nuevasClases);
      setEspacios(nuevosEspacios);

      // Resetear campos
      setNuevaClase((prev) => ({
        ...prev,
        id_materia: '',
      }));
    } catch (err) {
      // Alerta clara si hay error 409 o similar
      setClaseError(err.detail || 'Error al crear la clase');
    } finally {
      setCreandoClase(false);
    }
  };

  // Eliminar clase
  const handleEliminarClase = async (idClase) => {
    if (!window.confirm("Estas seguro de que deseas eliminar esta clase programada?")) return;
    try {
      await api.eliminarClase(idClase);
      setClases((prev) => prev.filter((c) => c.id_clase !== idClase));
    } catch (err) {
      alert(err.detail || "Error al eliminar la clase");
    }
  };

  // Aprobar / Rechazar evento
  const handleCambiarEstadoEvento = async (idEvento, nuevoEstado) => {
    setEventoActionError('');
    try {
      await api.actualizarEstadoEvento(idEvento, nuevoEstado);
      // Recargar lista de eventos
      const nuevosEventos = await api.getEventos();
      setEventos(nuevosEventos);
    } catch (err) {
      setEventoActionError(err.detail || `Error al ${nuevoEstado} el evento`);
    }
  };

  const abrirModalDisponibles = (evento) => {
    setEventoSeleccionadoConflicto(evento);
    setModalDisponiblesAbierto(true);
  };

  // Filtrado de clases
  const clasesFiltradas = clases.filter((c) => {
    if (filtroMateriaAdmin && String(c.id_materia) !== String(filtroMateriaAdmin)) {
      return false;
    }
    if (busquedaClaseAdmin.trim()) {
      const q = busquedaClaseAdmin.toLowerCase();
      const matchMateria = c.nombre_materia?.toLowerCase().includes(q);
      const matchClave = c.clave_materia?.toLowerCase().includes(q);
      const matchDocente = c.nombre_docente?.toLowerCase().includes(q);
      const matchEspacio = c.nombre_espacio?.toLowerCase().includes(q);
      if (!matchMateria && !matchClave && !matchDocente && !matchEspacio) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="main-content">
      {/* Tabs Principales de Administracion */}
      <div className="tab-list">
        <button
          className={`tab-btn ${activeTab === 'programacion' ? 'active' : ''}`}
          onClick={() => setActiveTab('programacion')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ClipboardCheckIcon size={16} />
          <span>Programacion General</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'eventos' ? 'active' : ''}`}
          onClick={() => setActiveTab('eventos')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <InboxIcon size={16} />
          <span>Solicitudes de Eventos ({eventos.filter(e => e.estado_evento === 'pendiente').length} pendientes)</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'espacios' ? 'active' : ''}`}
          onClick={() => setActiveTab('espacios')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <BuildingIcon size={16} />
          <span>Espacios Academicos ({espacios.length})</span>
        </button>
      </div>

      {/* TAB 1: PROGRAMACION GENERAL */}
      {activeTab === 'programacion' && (
        <div>
          {/* Banner de alerta si hay solicitudes de eventos pendientes */}
          {eventos.filter((e) => e.estado_evento === 'pendiente').length > 0 && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ color: '#1E40AF', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BellIcon size={18} />
                  <span>Solicitudes de Eventos Pendientes ({eventos.filter((e) => e.estado_evento === 'pendiente').length})</span>
                </strong>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                  Hay propuestas de alumnos y docentes esperando tu revision y aprobacion.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('eventos')}
              >
                Revisar Solicitudes de Eventos →
              </button>
            </div>
          )}

          {/* Formulario de asignacion de nueva clase con prevencion de empalmes */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>
              Asignar Nueva Clase Programada
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '18px' }}>
              El sistema evalua automaticamente que no existan empalmes de aula, docente ni colisiones con eventos comunitarios aprobados.
            </p>

            {claseError && (
              <div className="error-banner" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangleIcon size={20} />
                <div style={{ flex: 1 }}>
                  <strong>Empalme Rechazado (Codigo 409 Conflict):</strong>
                  <div>{claseError}</div>
                </div>
              </div>
            )}

            {claseSuccess && (
              <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleIcon size={18} />
                <span>{claseSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCrearClase}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {/* Materia */}
                <div className="form-group">
                  <label>Materia *</label>
                  <select
                    className="form-control"
                    value={nuevaClase.id_materia}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, id_materia: e.target.value })}
                  >
                    <option value="">-- Seleccionar Materia --</option>
                    {materias.map((m) => (
                      <option key={m.id_materia} value={m.id_materia}>
                        {m.clave_materia} - {m.nombre_materia}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Docente */}
                <div className="form-group">
                  <label>Docente Titular *</label>
                  <select
                    className="form-control"
                    value={nuevaClase.id_docente}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, id_docente: e.target.value })}
                  >
                    <option value="">-- Seleccionar Docente --</option>
                    {docentes.map((d) => (
                      <option key={d.id_usuario} value={d.id_usuario}>
                        {d.nombre} ({d.expediente})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Espacio */}
                <div className="form-group">
                  <label>Espacio Academico (Aula/Lab) *</label>
                  <select
                    className="form-control"
                    value={nuevaClase.id_espacio}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, id_espacio: e.target.value })}
                  >
                    <option value="">-- Seleccionar Espacio --</option>
                    {espacios.map((esp) => (
                      <option key={esp.id_espacio} value={esp.id_espacio}>
                        {esp.nombre_espacio} (Cap: {esp.capacidad})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dia */}
                <div className="form-group">
                  <label>Dia de la Semana *</label>
                  <select
                    className="form-control"
                    value={nuevaClase.dia_semana}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, dia_semana: e.target.value })}
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d} style={{ textTransform: 'capitalize' }}>
                        {d.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Horas */}
                <div className="form-group">
                  <label>Hora Inicio *</label>
                  <input
                    type="time"
                    className="form-control"
                    value={nuevaClase.hora_inicio}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, hora_inicio: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Hora Fin *</label>
                  <input
                    type="time"
                    className="form-control"
                    value={nuevaClase.hora_fin}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, hora_fin: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creandoClase}
                >
                  {creandoClase ? 'Validando empalmes...' : '+ Asignar y Guardar Clase'}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de clases programadas con filtro por materia y busqueda */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                  Clases Programadas en el Sistema ({clasesFiltradas.length}{clasesFiltradas.length !== clases.length ? ` de ${clases.length}` : ''})
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                  Filtra por materia o busca por docente, aula o clave.
                </p>
              </div>

              {/* Barra de filtros de clases */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FilterIcon size={16} />
                  <select
                    className="form-control"
                    style={{ width: 'auto', minWidth: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
                    value={filtroMateriaAdmin}
                    onChange={(e) => setFiltroMateriaAdmin(e.target.value)}
                  >
                    <option value="">Todas las Materias ({materias.length})</option>
                    {materias.map((m) => (
                      <option key={m.id_materia} value={m.id_materia}>
                        {m.clave_materia} - {m.nombre_materia}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SearchIcon size={16} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
                    placeholder="Buscar clase..."
                    value={busquedaClaseAdmin}
                    onChange={(e) => setBusquedaClaseAdmin(e.target.value)}
                  />
                </div>

                {(filtroMateriaAdmin || busquedaClaseAdmin) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setFiltroMateriaAdmin('');
                      setBusquedaClaseAdmin('');
                    }}
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>Horario</th>
                    <th>Clave</th>
                    <th>Materia</th>
                    <th>Docente</th>
                    <th>Espacio</th>
                    <th>Alumnos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clasesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                        No se encontraron clases con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    clasesFiltradas.map((c) => (
                      <tr key={c.id_clase}>
                        <td style={{ textTransform: 'capitalize', fontWeight: '700' }}>{c.dia_semana}</td>
                        <td>{c.hora_inicio} - {c.hora_fin}</td>
                        <td><span className="badge badge-normal">{c.clave_materia}</span></td>
                        <td style={{ fontWeight: '600' }}>{c.nombre_materia}</td>
                        <td>{c.nombre_docente}</td>
                        <td>{c.nombre_espacio}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <UsersIcon size={14} /> {c.total_alumnos}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleEliminarClase(c.id_clase)}
                            title="Eliminar clase"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOLICITUDES DE EVENTOS Y EVALUACION PREVENTIVA DE EMPALMES */}
      {activeTab === 'eventos' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                Solicitudes de Eventos Comunitarios
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                El sistema evalua preventivamente cada solicitud: si detecta choque de horario con clases u otros eventos, lo marca con la etiqueta "Empalme detectado" y permite consultar espacios disponibles alternativos.
              </p>
            </div>

            {/* Filtros para el administrador */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventosAdmin === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventosAdmin('todos')}
              >
                Todos ({eventos.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventosAdmin === 'pendientes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventosAdmin('pendientes')}
              >
                Pendientes ({eventos.filter((e) => e.estado_evento === 'pendiente').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventosAdmin === 'aprobados' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventosAdmin('aprobados')}
              >
                Aprobados ({eventos.filter((e) => e.estado_evento === 'aprobado').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEventosAdmin === 'otros' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroEventosAdmin('otros')}
              >
                Rechazados / Cancelados ({eventos.filter((e) => e.estado_evento === 'rechazado' || e.estado_evento === 'cancelado').length})
              </button>
            </div>
          </div>

          {eventoActionError && (
            <div className="error-banner" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangleIcon size={18} />
              <span>{eventoActionError}</span>
            </div>
          )}

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Titulo y Proponente</th>
                  <th>Espacio Solicitado</th>
                  <th>Fecha y Horario</th>
                  <th>Estado / Evaluacion Preventiva</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {eventos
                  .filter((ev) => {
                    if (filtroEventosAdmin === 'pendientes') return ev.estado_evento === 'pendiente';
                    if (filtroEventosAdmin === 'aprobados') return ev.estado_evento === 'aprobado';
                    if (filtroEventosAdmin === 'otros') return ev.estado_evento === 'rechazado' || ev.estado_evento === 'cancelado';
                    return true;
                  })
                  .map((ev) => {
                  const isPendiente = ev.estado_evento === 'pendiente';
                  const hayEmpalme = ev.empalme_detectado;

                  return (
                    <tr key={ev.id_evento} style={hayEmpalme && isPendiente ? { background: '#FFF1F2' } : {}}>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{ev.titulo}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          Por: {ev.nombre_proponente} ({ev.rol_proponente} - {ev.expediente_proponente})
                        </div>
                        {ev.descripcion && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                            {ev.descripcion}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{ev.nombre_espacio}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Cap: {ev.capacidad_espacio} pers.
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{ev.fecha_evento}</div>
                        <div style={{ fontSize: '0.82rem', color: '#2563EB' }}>
                          {ev.hora_inicio} - {ev.hora_fin} hrs
                        </div>
                      </td>
                      <td>
                        {/* Estado actual */}
                        <div style={{ marginBottom: '4px' }}>
                          {ev.estado_evento === 'aprobado' && <span className="badge badge-aprobado">Aprobado</span>}
                          {ev.estado_evento === 'rechazado' && <span className="badge badge-rechazado">Rechazado</span>}
                          {ev.estado_evento === 'cancelado' && <span className="badge badge-cancelada">Cancelado</span>}
                          {isPendiente && <span className="badge badge-pendiente">Pendiente</span>}
                        </div>

                        {/* Etiqueta completa y aviso de empalme preventivo */}
                        {isPendiente && hayEmpalme && (
                          <div style={{ marginTop: '6px' }}>
                            <span className="badge badge-cancelada" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangleIcon size={13} />
                              <span>Empalme detectado</span>
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#991B1B', marginTop: '4px', maxWidth: '280px' }}>
                              {ev.aviso_conflicto}
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: '6px', fontSize: '0.72rem', borderColor: '#F87171', color: '#B91C1C', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => abrirModalDisponibles(ev)}
                            >
                              <SearchIcon size={13} />
                              <span>Ver espacios disponibles</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        {isPendiente ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-success btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleCambiarEstadoEvento(ev.id_evento, 'aprobado')}
                            >
                              Aprobar
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleCambiarEstadoEvento(ev.id_evento, 'rechazado')}
                            >
                              Rechazar
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#B91C1C', borderColor: '#FCA5A5' }}
                              onClick={() => handleCambiarEstadoEvento(ev.id_evento, 'cancelado')}
                              title="Cancelar evento"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : ev.estado_evento === 'aprobado' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleCambiarEstadoEvento(ev.id_evento, 'cancelado')}
                              title="Cancelar evento aprobado"
                            >
                              Cancelar Evento
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                            {ev.estado_evento === 'cancelado' ? 'Cancelado' : (ev.nombre_aprobador ? `Por: ${ev.nombre_aprobador}` : 'Finalizado')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ESPACIOS ACADEMICOS Y BARRAS DE OCUPACION */}
      {activeTab === 'espacios' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
              Catalogo de Espacios Academicos y Niveles de Ocupacion
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
              Monitoreo visual de capacidad y uso de las 12 instalaciones de la Facultad de Informatica.
            </p>
          </div>

          <div className="occupancy-grid">
            {espacios.map((esp) => {
              const pct = esp.porcentaje_ocupacion || 0;
              let barColor = '#16A34A'; // Verde
              if (pct > 75) barColor = '#DC2626'; // Rojo
              else if (pct > 40) barColor = '#D97706'; // Ambar

              return (
                <div key={esp.id_espacio} className="space-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0F172A' }}>
                      {esp.nombre_espacio}
                    </div>
                    <span className="badge badge-normal" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                      {esp.tipo}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748B', margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UsersIcon size={15} />
                    <span>Capacidad maxima: <strong>{esp.capacidad} personas</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                    <span>Ocupacion semanal estimada:</span>
                    <strong>{pct}% ({esp.horas_ocupadas} hrs)</strong>
                  </div>

                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '6px' }}>
                    {esp.total_clases_asignadas} clases programadas registradas
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para ver espacios disponibles */}
      <ModalEspaciosDisponibles
        isOpen={modalDisponiblesAbierto}
        onClose={() => setModalDisponiblesAbierto(false)}
        evento={eventoSeleccionadoConflicto}
      />
    </div>
  );
}
