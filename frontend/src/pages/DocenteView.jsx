import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  ClipboardCheckIcon,
  CalendarIcon,
  InboxIcon,
  BookOpenIcon,
  UsersIcon,
  VideoIcon,
  ClockIcon,
  MapPinIcon,
  AlertTriangleIcon,
  FilterIcon,
  CheckCircleIcon
} from '../components/Icons';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export default function DocenteView({ user, targetTabTrigger }) {
  const [activeTab, setActiveTab] = useState('clases'); // 'clases' | 'horario' | 'eventos'
  const [clases, setClases] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [filtroEventos, setFiltroEventos] = useState('todos'); // 'todos' | 'mis_propuestas' | 'aprobados'
  const [filtroClase, setFiltroClase] = useState(''); // Filtrar por materia
  const [filtroEstadoClase, setFiltroEstadoClase] = useState('todos'); // 'todos' | 'programadas' | 'canceladas' | 'virtuales'
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

      setFormStates((prev) => {
        const next = { ...prev };
        data.forEach((c) => {
          if (!next[c.id_clase]) {
            next[c.id_clase] = {
              estado: c.estado || 'normal',
              enlace_virtual: c.enlace_virtual || '',
              observaciones: c.observaciones || '',
              fecha: new Date().toISOString().split('T')[0],
              saving: false,
              successMsg: '',
              errorMsg: '',
            };
          } else {
            // Preservar valores ingresados por el docente para que nunca desaparezcan
            next[c.id_clase] = {
              ...next[c.id_clase],
              estado: next[c.id_clase].saving ? next[c.id_clase].estado : (next[c.id_clase].estado || c.estado),
              enlace_virtual: next[c.id_clase].enlace_virtual || c.enlace_virtual || '',
              observaciones: next[c.id_clase].observaciones || c.observaciones || '',
            };
          }
        });
        return next;
      });
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

  // Guardar cambio de estado de clase (preserva y almacena enlaces)
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
        enlace_virtual: form.enlace_virtual ? form.enlace_virtual.trim() : null,
        observaciones: form.observaciones ? form.observaciones.trim() : null,
      });

      setFormStates((prev) => ({
        ...prev,
        [idClase]: {
          ...prev[idClase],
          saving: false,
          successMsg: 'Estado actualizado correctamente',
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

  // Cancelar evento propuesto por el docente
  const handleCancelarEvento = async (idEvento) => {
    if (!window.confirm("Estas seguro de que deseas cancelar este evento?")) return;
    try {
      await api.cancelarEvento(idEvento);
      setEventos((prev) =>
        prev.map((e) => (e.id_evento === idEvento ? { ...e, estado_evento: 'cancelado' } : e))
      );
    } catch (err) {
      alert(err.detail || "Error al cancelar el evento");
    }
  };

  // Metricas para las tarjetas de resumen
  const totalClases = clases.length;
  const clasesProgramadas = clases.filter((c) => c.estado === 'normal' || !c.estado).length;
  const clasesCanceladas = clases.filter((c) => c.estado === 'cancelada').length;
  const sesionesVirtuales = clases.filter((c) => c.estado === 'virtual').length;
  const totalAlumnos = clases.reduce((acc, c) => acc + (parseInt(c.total_alumnos, 10) || 0), 0);

  // Filtrado de clases por materia y por estado (programada, cancelada, virtual)
  const clasesFiltradas = clases.filter((c) => {
    if (filtroClase && String(c.id_materia) !== String(filtroClase)) {
      return false;
    }
    if (filtroEstadoClase === 'programadas' && (c.estado !== 'normal' && c.estado !== undefined)) {
      return false;
    }
    if (filtroEstadoClase === 'canceladas' && c.estado !== 'cancelada') {
      return false;
    }
    if (filtroEstadoClase === 'virtuales' && c.estado !== 'virtual') {
      return false;
    }
    return true;
  });

  // Extraer lista de materias unicas impartidas por el docente para el selector
  const materiasUnicasDocente = Array.from(new Set(clases.map((c) => c.id_materia))).map((id) =>
    clases.find((c) => c.id_materia === id)
  );

  return (
    <div className="main-content">
      {/* Subnav / Tabs */}
      <div className="tab-list">
        <button
          className={`tab-btn ${activeTab === 'clases' ? 'active' : ''}`}
          onClick={() => setActiveTab('clases')}
        >
          <ClipboardCheckIcon size={16} /> Mis Clases Asignadas
        </button>
        <button
          className={`tab-btn ${activeTab === 'horario' ? 'active' : ''}`}
          onClick={() => setActiveTab('horario')}
        >
          <CalendarIcon size={16} /> Mi Horario Docente
        </button>
        <button
          className={`tab-btn ${activeTab === 'eventos' ? 'active' : ''}`}
          onClick={() => setActiveTab('eventos')}
        >
          <InboxIcon size={16} /> Eventos Comunitarios ({eventos.length})
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* TARJETAS RESUMEN CON ESTADO DE CLASES */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <BookOpenIcon size={22} />
          </div>
          <div>
            <div className="stat-number">{totalClases}</div>
            <div className="stat-label">Total Clases Asignadas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <CheckCircleIcon size={22} />
          </div>
          <div>
            <div className="stat-number">{clasesProgramadas}</div>
            <div className="stat-label">Clases Programadas (Activas)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            <AlertTriangleIcon size={22} />
          </div>
          <div>
            <div className="stat-number">{clasesCanceladas}</div>
            <div className="stat-label">Clases Canceladas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <VideoIcon size={22} />
          </div>
          <div>
            <div className="stat-number">{sesionesVirtuales}</div>
            <div className="stat-label">Sesiones Virtuales</div>
          </div>
        </div>
      </div>

      {/* VISTA 1: LISTA DETALLADA DE CLASES CON ESTADOS CLAROS */}
      {activeTab === 'clases' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Gestion y Estado de Clases</h2>
              <p style={{ color: '#64748B', fontSize: '0.88rem' }}>
                Monitorea el estado de cada clase (Programada o Cancelada) y actualiza sesiones virtuales. Los enlaces guardados se conservan permanentemente.
              </p>
            </div>
          </div>

          {/* FILTROS POR MATERIA Y POR ESTADO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
            {/* Filtro por Materia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FilterIcon size={16} />
              <select
                className="form-control"
                style={{ maxWidth: '280px', padding: '6px 12px', fontSize: '0.85rem' }}
                value={filtroClase}
                onChange={(e) => setFiltroClase(e.target.value)}
              >
                <option value="">Todas las materias ({clases.length})</option>
                {materiasUnicasDocente.map((m) => (
                  <option key={m.id_materia} value={m.id_materia}>
                    {m.clave_materia} - {m.nombre_materia}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado: Todos, Programadas, Canceladas, Virtuales */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${filtroEstadoClase === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                onClick={() => setFiltroEstadoClase('todos')}
              >
                Todas ({clases.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEstadoClase === 'programadas' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                onClick={() => setFiltroEstadoClase('programadas')}
              >
                Programadas ({clasesProgramadas})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEstadoClase === 'canceladas' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '5px 10px', color: filtroEstadoClase === 'canceladas' ? '#FFF' : '#DC2626' }}
                onClick={() => setFiltroEstadoClase('canceladas')}
              >
                Canceladas ({clasesCanceladas})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroEstadoClase === 'virtuales' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                onClick={() => setFiltroEstadoClase('virtuales')}
              >
                Virtuales ({sesionesVirtuales})
              </button>
            </div>

            {(filtroClase || filtroEstadoClase !== 'todos') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
                onClick={() => {
                  setFiltroClase('');
                  setFiltroEstadoClase('todos');
                }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          {clasesFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
              No se encontraron clases con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
              {clasesFiltradas.map((clase) => {
                const form = formStates[clase.id_clase] || {
                  estado: clase.estado || 'normal',
                  enlace_virtual: clase.enlace_virtual || '',
                  observaciones: clase.observaciones || '',
                  saving: false,
                  successMsg: '',
                  errorMsg: '',
                };

                const isVirtual = form.estado === 'virtual';
                const isCancelada = clase.estado === 'cancelada';

                return (
                  <div
                    key={clase.id_clase}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: isCancelada ? '5px solid #DC2626' : isVirtual ? '5px solid #2563EB' : '5px solid #16A34A',
                      background: isCancelada ? '#FFFBFB' : '#FFFFFF'
                    }}
                  >
                    <div>
                      {/* Header de la tarjeta con estado de clase visible */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
                            {clase.dia_semana.toUpperCase()} {clase.hora_inicio} - {clase.hora_fin}
                          </span>

                          {/* Indicador visual claro del estado: Programada o Cancelada */}
                          {clase.estado === 'cancelada' ? (
                            <span className="badge badge-cancelada" style={{ fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangleIcon size={12} /> Cancelada
                            </span>
                          ) : clase.estado === 'virtual' ? (
                            <span className="badge badge-virtual" style={{ fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <VideoIcon size={12} /> Virtual
                            </span>
                          ) : (
                            <span className="badge badge-aprobado" style={{ fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircleIcon size={12} /> Programada
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UsersIcon size={13} /> {clase.total_alumnos} alumnos
                        </span>
                      </div>

                      {/* Notificacion si esta cancelada */}
                      {isCancelada && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECDD3', padding: '6px 10px', borderRadius: '6px', color: '#B91C1C', fontSize: '0.8rem', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangleIcon size={14} /> Estado actual: Esta clase se encuentra CANCELADA.
                        </div>
                      )}

                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                        {clase.clave_materia} - {clase.nombre_materia}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPinIcon size={14} /> Espacio: <strong>{clase.nombre_espacio}</strong> ({clase.tipo_espacio})
                      </div>

                      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', marginBottom: '16px' }} />

                      {/* Selector de Estado */}
                      <div className="form-group">
                        <label style={{ fontSize: '0.82rem', fontWeight: '700' }}>Actualizar Estado de la Clase:</label>
                        <select
                          className="form-control"
                          value={form.estado}
                          onChange={(e) => handleInputChange(clase.id_clase, 'estado', e.target.value)}
                        >
                          <option value="normal">Programada (Presencial normal)</option>
                          <option value="virtual">Sesion Virtual (Videollamada)</option>
                          <option value="cancelada">Clase Cancelada</option>
                          <option value="reprogramada">Clase Reprogramada</option>
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
                        />
                      </div>

                      {/* Observaciones */}
                      <div className="form-group">
                        <label style={{ fontSize: '0.82rem' }}>Aviso / Observaciones para los Alumnos:</label>
                        <textarea
                          rows="2"
                          className="form-control"
                          placeholder="Ej. Llevar material didactico / Sesion virtual por mantenimiento / Cancelada por..."
                          value={form.observaciones}
                          onChange={(e) => handleInputChange(clase.id_clase, 'observaciones', e.target.value)}
                        />
                      </div>

                      {form.errorMsg && (
                        <div className="field-error" style={{ marginBottom: '10px' }}>
                          <AlertTriangleIcon size={14} /> {form.errorMsg}
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
          )}
        </div>
      )}

      {/* VISTA 2: HORARIO DOCENTE CON ESTADOS VISIBLES */}
      {activeTab === 'horario' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Mi Cronograma Semanal</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                Visualiza el estado de programada o cancelada en cada sesion del calendario.
              </p>
            </div>

            {/* FILTRO POR CLASE EN HORARIO DOCENTE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilterIcon size={16} />
              <select
                className="form-control"
                style={{ minWidth: '240px', padding: '6px 12px', fontSize: '0.85rem' }}
                value={filtroClase}
                onChange={(e) => setFiltroClase(e.target.value)}
              >
                <option value="">Todas mis materias</option>
                {materiasUnicasDocente.map((m) => (
                  <option key={m.id_materia} value={m.id_materia}>
                    {m.clave_materia} - {m.nombre_materia}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="weekly-grid">
            {DIAS_SEMANA.map((dia) => {
              const clasesDia = clasesFiltradas.filter((c) => c.dia_semana === dia);
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
                      <div
                        key={c.id_clase}
                        className="class-card"
                        style={
                          c.estado === 'cancelada'
                            ? { borderLeft: '4px solid #DC2626', background: '#FEF2F2', opacity: 0.85 }
                            : c.estado === 'virtual'
                            ? { borderLeft: '4px solid #2563EB', background: '#F0F7FF' }
                            : { borderLeft: '4px solid #16A34A' }
                        }
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div className="class-time">{c.hora_inicio} - {c.hora_fin}</div>
                          {c.estado === 'cancelada' ? (
                            <span className="badge badge-cancelada" style={{ fontSize: '0.62rem', padding: '2px 5px' }}>Cancelada</span>
                          ) : c.estado === 'virtual' ? (
                            <span className="badge badge-virtual" style={{ fontSize: '0.62rem', padding: '2px 5px' }}>Virtual</span>
                          ) : (
                            <span className="badge badge-aprobado" style={{ fontSize: '0.62rem', padding: '2px 5px' }}>Programada</span>
                          )}
                        </div>

                        <div className="class-code">{c.clave_materia}</div>
                        <div className="class-name">{c.nombre_materia}</div>
                        <div className="class-meta">
                          <span><MapPinIcon size={12} /> {c.nombre_espacio}</span>
                          <span><UsersIcon size={12} /> {c.total_alumnos} inscritos</span>
                        </div>
                        {c.estado === 'cancelada' && c.observaciones && (
                          <div style={{ fontSize: '0.72rem', color: '#B91C1C', marginTop: '4px', fontStyle: 'italic' }}>
                            {c.observaciones}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: EVENTOS COMUNITARIOS DE LA FACULTAD CON OPCION DE CANCELAR */}
      {activeTab === 'eventos' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Eventos Comunitarios de la Facultad</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                Consulta los eventos programados en los espacios academicos y gestiona tus propuestas (puedes cancelarlas si es necesario).
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
                    <th>Acciones</th>
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
                      const puedeCancelar = esMio && ev.estado_evento !== 'cancelado' && ev.estado_evento !== 'rechazado';

                      return (
                        <tr key={ev.id_evento} style={esMio && ev.estado_evento === 'pendiente' ? { background: '#EFF6FF' } : {}}>
                          <td>
                            <div style={{ fontWeight: '700' }}>{ev.titulo}</div>
                            <div style={{ fontSize: '0.78rem', color: esMio ? '#2563EB' : '#64748B', fontWeight: esMio ? '600' : 'normal' }}>
                              {esMio ? 'Mi propuesta' : `Por: ${ev.nombre_proponente} (${ev.rol_proponente})`}
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
                          <td style={{ color: '#64748B', maxWidth: '280px' }}>
                            {ev.descripcion || 'Sin descripcion'}
                          </td>
                          <td>
                            {puedeCancelar ? (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => handleCancelarEvento(ev.id_evento)}
                                title="Cancelar evento propuesto"
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
    </div>
  );
}
