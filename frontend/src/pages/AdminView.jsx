import React, { useState, useEffect } from 'react';
import { api } from '../api';
import ModalEspaciosDisponibles from '../components/ModalEspaciosDisponibles';
import {
  ClipboardCheckIcon,
  CalendarIcon,
  InboxIcon,
  BuildingIcon,
  BellIcon,
  AlertTriangleIcon,
  UsersIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon,
  ClockIcon,
  BookOpenIcon,
  GraduationCapIcon
} from '../components/Icons';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves'];
const BLOQUES_HORARIO_OFICIALES = [
  { ini: '07:00', fin: '09:00', label: '07:00 - 09:00 hrs (Bloque 1)' },
  { ini: '09:00', fin: '11:00', label: '09:00 - 11:00 hrs (Bloque 2)' },
  { ini: '11:00', fin: '13:00', label: '11:00 - 13:00 hrs (Bloque 3)' },
  { ini: '13:00', fin: '15:00', label: '13:00 - 15:00 hrs (Bloque 4)' },
  { ini: '15:00', fin: '17:00', label: '15:00 - 17:00 hrs (Bloque 5)' },
  { ini: '17:00', fin: '19:00', label: '17:00 - 19:00 hrs (Bloque 6)' },
];

export default function AdminView({ user, targetTabTrigger }) {
  const [activeTab, setActiveTab] = useState('programacion'); // 'programacion' | 'planificador' | 'eventos' | 'espacios'
  const [filtroEventosAdmin, setFiltroEventosAdmin] = useState('todos'); // 'todos' | 'pendientes' | 'aprobados' | 'otros'

  // Datos para Programacion General
  const [clases, setClases] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [espacios, setEspacios] = useState([]);

  // Filtros de clases
  const [filtroCarreraAdmin, setFiltroCarreraAdmin] = useState('');
  const [filtroSemestreAdmin, setFiltroSemestreAdmin] = useState('');
  const [filtroMateriaAdmin, setFiltroMateriaAdmin] = useState('');
  const [busquedaClaseAdmin, setBusquedaClaseAdmin] = useState('');

  // Filtros para el selector de materias en el formulario de nueva clase
  const [formCarrera, setFormCarrera] = useState('');
  const [formSemestre, setFormSemestre] = useState('');

  // Formulario nueva clase individual
  const [nuevaClase, setNuevaClase] = useState({
    id_materia: '',
    id_docente: '',
    id_espacio: '',
    dia_semana: 'lunes',
    hora_inicio: '07:00',
    hora_fin: '09:00',
    periodo_lectivo: '2026-2',
  });
  const [claseError, setClaseError] = useState('');
  const [claseSuccess, setClaseSuccess] = useState('');
  const [creandoClase, setCreandoClase] = useState(false);

  // Estados para el Planificador de Horarios por Semestre
  const [planCarrera, setPlanCarrera] = useState('INF18');
  const [planSemestre, setPlanSemestre] = useState('1');
  const [planTurno, setPlanTurno] = useState('matutino');
  const [planClasesGeneradas, setPlanClasesGeneradas] = useState([]);
  const [generandoPlan, setGenerandoPlan] = useState(false);
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [planMensaje, setPlanMensaje] = useState({ tipo: '', texto: '' });

  // Datos para Solicitudes de Eventos
  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionadoConflicto, setEventoSeleccionadoConflicto] = useState(null);
  const [modalDisponiblesAbierto, setModalDisponiblesAbierto] = useState(false);
  const [eventoActionError, setEventoActionError] = useState('');

  // Filtros para catalogo de espacios academicos
  const [filtroCategoriaEspacio, setFiltroCategoriaEspacio] = useState('todos');
  const [busquedaEspacio, setBusquedaEspacio] = useState('');

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

  const carrerasDisponibles = Array.from(new Set(materias.map((m) => m.carrera).filter(Boolean))).sort();

  const materiasFormulario = materias.filter((m) => {
    if (formCarrera && m.carrera !== formCarrera) return false;
    if (formSemestre && String(m.semestre) !== String(formSemestre)) return false;
    return true;
  });

  // Materias filtradas por carrera y semestre seleccionados en el filtro de la tabla de clases
  const materiasFiltroAdmin = React.useMemo(() => {
    return materias.filter((m) => {
      if (filtroCarreraAdmin && m.carrera !== filtroCarreraAdmin) return false;
      if (filtroSemestreAdmin && String(m.semestre) !== String(filtroSemestreAdmin)) return false;
      return true;
    });
  }, [materias, filtroCarreraAdmin, filtroSemestreAdmin]);

  // Si cambia carrera o semestre en el filtro, reiniciar filtro de materia si ya no coincide
  useEffect(() => {
    if (filtroMateriaAdmin) {
      const existe = materiasFiltroAdmin.some((m) => String(m.id_materia) === String(filtroMateriaAdmin));
      if (!existe) {
        setFiltroMateriaAdmin('');
      }
    }
  }, [filtroCarreraAdmin, filtroSemestreAdmin, materiasFiltroAdmin, filtroMateriaAdmin]);

  // Planificador por Semestre: Generar propuesta
  const handleGenerarPlan = async (guardarDirecto = false) => {
    setPlanMensaje({ tipo: '', texto: '' });
    if (!planCarrera) {
      setPlanMensaje({ tipo: 'error', texto: 'Por favor selecciona una carrera o Todas las Carreras.' });
      return;
    }

    setGenerandoPlan(true);
    try {
      const res = await api.generarHorariosSemestre({
        carrera: planCarrera,
        semestre: planSemestre ? parseInt(planSemestre, 10) : null,
        periodo_lectivo: '2026-2',
        turno: planTurno,
        guardar: guardarDirecto,
      });

      setPlanClasesGeneradas(res.clases || []);
      if (guardarDirecto) {
        setPlanMensaje({
          tipo: 'exito',
          texto: `Se generaron y aplicaron exitosamente ${res.total_clases_generadas} clases en la base de datos sin ningun empalme.`,
        });
        const [nuevasClases, nuevosEspacios] = await Promise.all([
          api.getAdminClases(),
          api.getEspacios(),
        ]);
        setClases(nuevasClases);
        setEspacios(nuevosEspacios);
      } else {
        setPlanMensaje({
          tipo: 'info',
          texto: `Propuesta calculada: ${res.total_clases_generadas} clases distribuidas de lunes a jueves en bloques de 2 horas. Revisa la distribucion abajo y haz clic en "Guardar y Aplicar Horario".`,
        });
      }
    } catch (err) {
      setPlanMensaje({
        tipo: 'error',
        texto: err.detail || 'Error al generar la propuesta de horarios',
      });
    } finally {
      setGenerandoPlan(false);
    }
  };

  // Planificador por Semestre: Guardar propuesta en lote
  const handleGuardarPlanLote = async () => {
    if (planClasesGeneradas.length === 0) return;
    setGuardandoPlan(true);
    setPlanMensaje({ tipo: '', texto: '' });
    try {
      await api.guardarHorariosLote({
        clases: planClasesGeneradas.map((c) => ({
          id_materia: c.id_materia,
          id_docente: c.id_docente,
          id_espacio: c.id_espacio,
          dia_semana: c.dia_semana,
          hora_inicio: c.hora_inicio,
          hora_fin: c.hora_fin,
          periodo_lectivo: c.periodo_lectivo || '2026-2',
        })),
        limpiar_anteriores: true,
        carrera: planCarrera,
        semestre: planSemestre ? parseInt(planSemestre, 10) : null,
        periodo_lectivo: '2026-2',
      });

      setPlanMensaje({
        tipo: 'exito',
        texto: `Horario guardado exitosamente: ${planClasesGeneradas.length} clases sincronizadas en el sistema sin empalmes.`,
      });

      const [nuevasClases, nuevosEspacios] = await Promise.all([
        api.getAdminClases(),
        api.getEspacios(),
      ]);
      setClases(nuevasClases);
      setEspacios(nuevosEspacios);
    } catch (err) {
      setPlanMensaje({
        tipo: 'error',
        texto: err.detail || 'Error al guardar el horario en la base de datos',
      });
    } finally {
      setGuardandoPlan(false);
    }
  };

  // Planificador por Semestre: Limpiar horario
  const handleLimpiarSemestre = async () => {
    if (!planCarrera) return;
    const semTxt = planSemestre ? `Semestre ${planSemestre}` : 'todos los semestres';
    if (!window.confirm(`Estas seguro de que deseas eliminar todas las clases de ${planCarrera} (${semTxt}) registradas en el sistema?`)) return;

    try {
      if (planSemestre) {
        await api.limpiarHorariosSemestre(planCarrera, parseInt(planSemestre, 10));
      } else {
        for (let s = 1; s <= 8; s++) {
          await api.limpiarHorariosSemestre(planCarrera, s);
        }
      }
      setPlanClasesGeneradas([]);
      setPlanMensaje({ tipo: 'info', texto: `Horario eliminado para ${planCarrera} (${semTxt}).` });

      const [nuevasClases, nuevosEspacios] = await Promise.all([
        api.getAdminClases(),
        api.getEspacios(),
      ]);
      setClases(nuevasClases);
      setEspacios(nuevosEspacios);
    } catch (err) {
      alert(err.detail || 'Error al limpiar horarios del semestre');
    }
  };

  // Filtrado de clases con soporte de Carrera, Semestre, Materia y Busqueda
  const clasesFiltradas = clases.filter((c) => {
    if (filtroCarreraAdmin && c.carrera !== filtroCarreraAdmin) {
      return false;
    }
    if (filtroSemestreAdmin && String(c.semestre) !== String(filtroSemestreAdmin)) {
      return false;
    }
    if (filtroMateriaAdmin && String(c.id_materia) !== String(filtroMateriaAdmin)) {
      return false;
    }
    if (busquedaClaseAdmin.trim()) {
      const q = busquedaClaseAdmin.toLowerCase();
      const matchMateria = c.nombre_materia?.toLowerCase().includes(q);
      const matchClave = c.clave_materia?.toLowerCase().includes(q);
      const matchDocente = c.nombre_docente?.toLowerCase().includes(q);
      const matchEspacio = c.nombre_espacio?.toLowerCase().includes(q);
      const matchCarrera = c.carrera?.toLowerCase().includes(q);
      if (!matchMateria && !matchClave && !matchDocente && !matchEspacio && !matchCarrera) {
        return false;
      }
    }
    return true;
  });

  // Agrupacion organizada de los 51 espacios para el selector de clases
  const gruposEspacios = React.useMemo(() => {
    return [
      {
        grupo: 'Aulas Normales (A01 - A26)',
        items: espacios.filter((e) => e.nombre_espacio.startsWith('Aula A')),
      },
      {
        grupo: 'Aulas de Innovacion (I01 - I05)',
        items: espacios.filter((e) => e.nombre_espacio.startsWith('Aula de Innovacion')),
      },
      {
        grupo: 'Laboratorios de Computo (D01 - D09)',
        items: espacios.filter((e) => e.nombre_espacio.startsWith('Laboratorio de Computo')),
      },
      {
        grupo: 'Laboratorios de Usos Multiples (B01 - B03)',
        items: espacios.filter((e) => e.nombre_espacio.startsWith('Laboratorio de Usos Multiples')),
      },
      {
        grupo: 'Laboratorios de Redes y Electronica (LR1, LR2, LE)',
        items: espacios.filter((e) => e.nombre_espacio.startsWith('Laboratorio de Redes') || e.nombre_espacio.startsWith('Laboratorio de Electronica')),
      },
      {
        grupo: 'Instalaciones Deportivas (Caballo de Troya, Arco Techo, Coliseo, Auditorio)',
        items: espacios.filter((e) => (e.categoria || '').includes('deportes')),
      },
      {
        grupo: 'Espacios para Eventos y Reuniones (Aula de Usos Multiples, etc.)',
        items: espacios.filter((e) => (e.categoria || '').includes('eventos') && !e.nombre_espacio.startsWith('Aula A') && !e.nombre_espacio.startsWith('Laboratorio') && !(e.categoria || '').includes('deportes')),
      },
      {
        grupo: 'Otros Espacios',
        items: espacios.filter((e) =>
          !e.nombre_espacio.startsWith('Aula A') &&
          !e.nombre_espacio.startsWith('Aula de Innovacion') &&
          !e.nombre_espacio.startsWith('Laboratorio') &&
          !(e.categoria || '').includes('deportes') &&
          !(e.categoria || '').includes('eventos')
        ),
      },
    ].filter((g) => g.items.length > 0);
  }, [espacios]);

  // Espacios filtrados para la pestana de Espacios Academicos
  const espaciosFiltrados = espacios.filter((esp) => {
    if (filtroCategoriaEspacio === 'clases') {
      if (!(esp.categoria || '').includes('clases')) return false;
    } else if (filtroCategoriaEspacio === 'deportes') {
      if (!(esp.categoria || '').includes('deportes')) return false;
    } else if (filtroCategoriaEspacio === 'eventos') {
      if (!(esp.categoria || '').includes('eventos')) return false;
    } else if (filtroCategoriaEspacio === 'aulas') {
      if (esp.tipo !== 'aula') return false;
    } else if (filtroCategoriaEspacio === 'laboratorios') {
      if (esp.tipo !== 'laboratorio') return false;
    }

    if (busquedaEspacio.trim()) {
      const q = busquedaEspacio.toLowerCase();
      const matchNom = (esp.nombre_espacio || '').toLowerCase().includes(q);
      const matchTipo = (esp.tipo || '').toLowerCase().includes(q);
      const matchCat = (esp.categoria || '').toLowerCase().includes(q);
      if (!matchNom && !matchTipo && !matchCat) return false;
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
          <span>Programacion Individual</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'planificador' ? 'active' : ''}`}
          onClick={() => setActiveTab('planificador')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <CalendarIcon size={16} />
          <span>Planificador por Semestre</span>
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
                {/* Filtro previo de Carrera */}
                <div className="form-group">
                  <label>Filtrar por Carrera</label>
                  <select
                    className="form-control"
                    value={formCarrera}
                    onChange={(e) => {
                      setFormCarrera(e.target.value);
                      setNuevaClase((prev) => ({ ...prev, id_materia: '' }));
                    }}
                  >
                    <option value="">-- Todas las Carreras ({carrerasDisponibles.length}) --</option>
                    {carrerasDisponibles.map((car) => (
                      <option key={car} value={car}>{car}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro previo de Semestre */}
                <div className="form-group">
                  <label>Filtrar por Semestre</label>
                  <select
                    className="form-control"
                    value={formSemestre}
                    onChange={(e) => {
                      setFormSemestre(e.target.value);
                      setNuevaClase((prev) => ({ ...prev, id_materia: '' }));
                    }}
                  >
                    <option value="">-- Todos los Semestres (1-8) --</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semestre {s}</option>
                    ))}
                  </select>
                </div>

                {/* Materia */}
                <div className="form-group">
                  <label>Materia ({materiasFormulario.length} disponibles) *</label>
                  <select
                    className="form-control"
                    value={nuevaClase.id_materia}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, id_materia: e.target.value })}
                  >
                    <option value="">-- Seleccionar Materia ({materiasFormulario.length}) --</option>
                    {materiasFormulario.map((m) => (
                      <option key={m.id_materia} value={m.id_materia}>
                        {m.clave_materia} - {m.nombre_materia} [{m.carrera} S{m.semestre}]
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
                  <label>Espacio Academico ({espacios.length} disponibles) *</label>
                  <select
                    className="form-control"
                    value={nuevaClase.id_espacio}
                    onChange={(e) => setNuevaClase({ ...nuevaClase, id_espacio: e.target.value })}
                  >
                    <option value="">-- Seleccionar Espacio ({espacios.length}) --</option>
                    {gruposEspacios.map((g) => (
                      <optgroup key={g.grupo} label={g.grupo}>
                        {g.items.map((esp) => (
                          <option key={esp.id_espacio} value={esp.id_espacio}>
                            {esp.nombre_espacio} (Cap: {esp.capacidad})
                          </option>
                        ))}
                      </optgroup>
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FilterIcon size={16} />
                  <select
                    className="form-control"
                    style={{ width: 'auto', minWidth: '120px', padding: '6px 10px', fontSize: '0.85rem' }}
                    value={filtroCarreraAdmin}
                    onChange={(e) => setFiltroCarreraAdmin(e.target.value)}
                  >
                    <option value="">Carrera (Todas)</option>
                    {carrerasDisponibles.map((car) => (
                      <option key={car} value={car}>{car}</option>
                    ))}
                  </select>
                </div>

                <select
                  className="form-control"
                  style={{ width: 'auto', minWidth: '110px', padding: '6px 10px', fontSize: '0.85rem' }}
                  value={filtroSemestreAdmin}
                  onChange={(e) => setFiltroSemestreAdmin(e.target.value)}
                >
                  <option value="">Semestre (Todos)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semestre {s}</option>
                  ))}
                </select>

                <select
                  className="form-control"
                  style={{ width: 'auto', minWidth: '220px', padding: '6px 10px', fontSize: '0.85rem' }}
                  value={filtroMateriaAdmin}
                  onChange={(e) => setFiltroMateriaAdmin(e.target.value)}
                >
                  <option value="">
                    {filtroCarreraAdmin || filtroSemestreAdmin ? `Materias filtradas (${materiasFiltroAdmin.length})` : `Todas las Materias (${materias.length})`}
                  </option>
                  {materiasFiltroAdmin.map((m) => (
                    <option key={m.id_materia} value={m.id_materia}>
                      {m.clave_materia} - {m.nombre_materia} [{m.carrera} S{m.semestre}]
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SearchIcon size={16} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
                    placeholder="Buscar materia, clave..."
                    value={busquedaClaseAdmin}
                    onChange={(e) => setBusquedaClaseAdmin(e.target.value)}
                  />
                </div>

                {(filtroCarreraAdmin || filtroSemestreAdmin || filtroMateriaAdmin || busquedaClaseAdmin) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setFiltroCarreraAdmin('');
                      setFiltroSemestreAdmin('');
                      setFiltroMateriaAdmin('');
                      setBusquedaClaseAdmin('');
                    }}
                  >
                    Limpiar Filtros
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
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.nombre_materia}</div>
                          {c.carrera && (
                            <div style={{ fontSize: '0.72rem', color: '#2563EB', marginTop: '2px', fontWeight: '600' }}>
                              <span>{c.carrera} - Semestre {c.semestre}</span>
                            </div>
                          )}
                        </td>
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

      {/* TAB 2: PLANIFICADOR DE HORARIOS POR SEMESTRE */}
      {activeTab === 'planificador' && (
        <div>
          {/* Tarjeta de configuracion y ejecucion del generador */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={20} />
                  <span>Planificador Automatico de Horarios por Semestre</span>
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '4px', maxWidth: '850px' }}>
                  Genera la distribucion horaria completa para las cohortes de estudiantes de <strong>lunes a jueves</strong> (iniciando a las <strong>07:00</strong> y concluyendo hacia las <strong>19:00 hrs</strong>). Cada clase dura <strong>2 horas continuas</strong> y cada grupo tiene un maximo de <strong>4 clases por dia</strong>. Los laboratorios de computo, redes y electronica se asignan unicamente a las materias tecnicas que verdaderamente los necesitan.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLimpiarSemestre}
                  style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                >
                  Limpiar Horario de este Semestre
                </button>
              </div>
            </div>

            {/* Mensaje de estado */}
            {planMensaje.texto && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '18px',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: planMensaje.tipo === 'exito' ? '#DCFCE7' : planMensaje.tipo === 'error' ? '#FEE2E2' : '#EFF6FF',
                  color: planMensaje.tipo === 'exito' ? '#166534' : planMensaje.tipo === 'error' ? '#991B1B' : '#1E40AF',
                  border: `1px solid ${planMensaje.tipo === 'exito' ? '#86EFAC' : planMensaje.tipo === 'error' ? '#FCA5A5' : '#BFDBFE'}`,
                }}
              >
                {planMensaje.tipo === 'exito' ? <CheckCircleIcon size={18} /> : planMensaje.tipo === 'error' ? <AlertTriangleIcon size={18} /> : <CalendarIcon size={18} />}
                <span>{planMensaje.texto}</span>
              </div>
            )}

            {/* Selectores de Carrera, Semestre y Turno */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Carrera *</label>
                <select
                  className="form-control"
                  value={planCarrera}
                  onChange={(e) => {
                    setPlanCarrera(e.target.value);
                    setPlanClasesGeneradas([]);
                  }}
                >
                  <option value="todas">-- Todas las Carreras (Global) --</option>
                  {carrerasDisponibles.map((car) => (
                    <option key={car} value={car}>{car}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Semestre *</label>
                <select
                  className="form-control"
                  value={planSemestre}
                  onChange={(e) => {
                    setPlanSemestre(e.target.value);
                    setPlanClasesGeneradas([]);
                  }}
                >
                  <option value="">-- Todos los Semestres (1 al 8) --</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semestre {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Turno Preferente</label>
                <select
                  className="form-control"
                  value={planTurno}
                  onChange={(e) => setPlanTurno(e.target.value)}
                >
                  <option value="matutino">Matutino (07:00 a 15:00 hrs)</option>
                  <option value="vespertino">Vespertino (13:00 a 19:00 hrs)</option>
                  <option value="mixto">Jornada Completa (07:00 a 19:00 hrs)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Periodo Lectivo</label>
                <input
                  type="text"
                  className="form-control"
                  value="2026-2"
                  disabled
                  style={{ background: '#F1F5F9' }}
                />
              </div>
            </div>

            {/* Botones de generacion */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={generandoPlan || guardandoPlan}
                onClick={() => handleGenerarPlan(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <CalendarIcon size={16} />
                <span>{generandoPlan ? 'Calculando horarios sin empalmes...' : 'Generar Propuesta de Horario'}</span>
              </button>

              <button
                type="button"
                className="btn btn-success"
                disabled={generandoPlan || guardandoPlan}
                onClick={() => handleGenerarPlan(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircleIcon size={16} />
                <span>{generandoPlan ? 'Procesando...' : 'Generar y Aplicar a BD Directo'}</span>
              </button>

              {planClasesGeneradas.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={guardandoPlan}
                  onClick={handleGuardarPlanLote}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0284C7' }}
                >
                  <ClipboardCheckIcon size={16} />
                  <span>{guardandoPlan ? 'Guardando en BD...' : `Guardar ${planClasesGeneradas.length} Clases en Base de Datos`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Estadisticas de asignacion inteligente de espacios */}
          {planClasesGeneradas.length > 0 && (
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#1E293B', marginBottom: '10px' }}>
                Criterios de Asignacion Inteligente de Espacios ({planClasesGeneradas.length} clases):
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', fontWeight: '600' }}>
                  Aulas Normales e Innovacion: {planClasesGeneradas.filter(c => c.tipo_espacio_requerido === 'aula').length} materias (teoria, matematicas, gestion)
                </span>
                <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: '600' }}>
                  Laboratorios de Computo: {planClasesGeneradas.filter(c => c.tipo_espacio_requerido === 'lab_computo').length} materias (programacion, BD, software)
                </span>
                <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF', fontWeight: '600' }}>
                  Laboratorios de Redes: {planClasesGeneradas.filter(c => c.tipo_espacio_requerido === 'lab_redes').length} materias (redes, telecomunicaciones)
                </span>
                <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', background: '#FFF7ED', color: '#C2410C', border: '1px solid #FFEDD5', fontWeight: '600' }}>
                  Laboratorio de Electronica: {planClasesGeneradas.filter(c => c.tipo_espacio_requerido === 'lab_electronica').length} materias (circuitos, hardware)
                </span>
                <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1', fontWeight: '600' }}>
                  Instalaciones Deportivas: {planClasesGeneradas.filter(c => c.tipo_espacio_requerido === 'deportes').length} materias
                </span>
              </div>
            </div>
          )}

          {/* Parrilla Semanal Visual (Lunes a Jueves) */}
          {planClasesGeneradas.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                    Parrilla Visual del Horario Semanal (Lunes a Jueves)
                  </h4>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>
                    Bloques de 2 horas continuas entre 07:00 y 19:00 hrs. Maximo 4 clases por dia por cohorte.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  disabled={guardandoPlan}
                  onClick={handleGuardarPlanLote}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircleIcon size={14} />
                  <span>Aplicar Horario al Sistema</span>
                </button>
              </div>

              <div className="weekly-grid">
                {['lunes', 'martes', 'miercoles', 'jueves'].map((dia) => {
                  const clasesDia = planClasesGeneradas.filter((c) => c.dia_semana === dia).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                  return (
                    <div key={dia} className="day-column">
                      <div className="day-header" style={{ textTransform: 'capitalize' }}>
                        <span>{dia}</span>
                        <span className="count">{clasesDia.length} clases</span>
                      </div>

                      {clasesDia.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', marginTop: '30px' }}>
                          Sin clases programadas
                        </div>
                      ) : (
                        clasesDia.map((c, idx) => {
                          let badgeBg = '#F0FDF4';
                          let badgeColor = '#15803D';
                          let badgeText = 'Aula';
                          if (c.tipo_espacio_requerido === 'lab_computo') {
                            badgeBg = '#EFF6FF';
                            badgeColor = '#1D4ED8';
                            badgeText = 'Lab Computo';
                          } else if (c.tipo_espacio_requerido === 'lab_redes') {
                            badgeBg = '#FAF5FF';
                            badgeColor = '#7E22CE';
                            badgeText = 'Lab Redes';
                          } else if (c.tipo_espacio_requerido === 'lab_electronica') {
                            badgeBg = '#FFF7ED';
                            badgeColor = '#C2410C';
                            badgeText = 'Lab Electronica';
                          } else if (c.tipo_espacio_requerido === 'deportes') {
                            badgeBg = '#F0FDFA';
                            badgeColor = '#0F766E';
                            badgeText = 'Deportes';
                          }

                          return (
                            <div key={idx} className="class-card" style={{ borderLeft: `4px solid ${badgeColor}`, marginBottom: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div className="class-time">{c.hora_inicio} - {c.hora_fin} hrs</div>
                                <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', background: badgeBg, color: badgeColor }}>
                                  {badgeText}
                                </span>
                              </div>

                              <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0F172A', marginTop: '2px' }}>
                                {c.nombre_materia}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                Clave: <strong>{c.clave_materia}</strong>
                              </div>

                              <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <BuildingIcon size={12} />
                                <span>{c.nombre_espacio}</span>
                              </div>

                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <UsersIcon size={12} />
                                <span>Prof. {c.nombre_docente}</span>
                              </div>
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

          {/* Tabla de clases del planificador con edicion previa */}
          {planClasesGeneradas.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                  Detalle de Asignaciones ({planClasesGeneradas.length} materias)
                </h4>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={guardandoPlan}
                  onClick={handleGuardarPlanLote}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircleIcon size={16} />
                  <span>Confirmar y Guardar Todo en BD</span>
                </button>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Horario (2h)</th>
                      <th>Clave</th>
                      <th>Materia</th>
                      <th>Tipo Espacio</th>
                      <th>Espacio Asignado</th>
                      <th>Docente Titular</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planClasesGeneradas.map((c, i) => (
                      <tr key={i}>
                        <td style={{ textTransform: 'capitalize', fontWeight: '700' }}>
                          <select
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.8rem', width: 'auto' }}
                            value={c.dia_semana}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPlanClasesGeneradas((prev) =>
                                prev.map((item, idx) => (idx === i ? { ...item, dia_semana: val } : item))
                              );
                            }}
                          >
                            {['lunes', 'martes', 'miercoles', 'jueves'].map((d) => (
                              <option key={d} value={d}>{d.toUpperCase()}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.8rem', width: 'auto' }}
                            value={`${c.hora_inicio}-${c.hora_fin}`}
                            onChange={(e) => {
                              const [ini, fin] = e.target.value.split('-');
                              setPlanClasesGeneradas((prev) =>
                                prev.map((item, idx) => (idx === i ? { ...item, hora_inicio: ini, hora_fin: fin } : item))
                              );
                            }}
                          >
                            {BLOQUES_HORARIO_OFICIALES.map((b) => (
                              <option key={b.ini} value={`${b.ini}-${b.fin}`}>{b.ini} - {b.fin}</option>
                            ))}
                          </select>
                        </td>
                        <td><span className="badge badge-normal">{c.clave_materia}</span></td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.nombre_materia}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {c.carrera} - Semestre {c.semestre}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge badge-normal"
                            style={{
                              fontSize: '0.68rem',
                              textTransform: 'capitalize',
                              background: c.tipo_espacio_requerido === 'lab_computo' ? '#EFF6FF' : c.tipo_espacio_requerido === 'lab_redes' ? '#FAF5FF' : c.tipo_espacio_requerido === 'lab_electronica' ? '#FFF7ED' : '#F0FDF4',
                              color: c.tipo_espacio_requerido === 'lab_computo' ? '#1D4ED8' : c.tipo_espacio_requerido === 'lab_redes' ? '#7E22CE' : c.tipo_espacio_requerido === 'lab_electronica' ? '#C2410C' : '#15803D',
                            }}
                          >
                            {c.tipo_espacio_requerido}
                          </span>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.8rem', minWidth: '180px' }}
                            value={c.id_espacio}
                            onChange={(e) => {
                              const espId = parseInt(e.target.value, 10);
                              const espObj = espacios.find((esp) => esp.id_espacio === espId);
                              setPlanClasesGeneradas((prev) =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? {
                                        ...item,
                                        id_espacio: espId,
                                        nombre_espacio: espObj ? espObj.nombre_espacio : item.nombre_espacio,
                                        tipo_espacio: espObj ? espObj.tipo : item.tipo_espacio,
                                      }
                                    : item
                                )
                              );
                            }}
                          >
                            {espacios.map((esp) => (
                              <option key={esp.id_espacio} value={esp.id_espacio}>
                                {esp.nombre_espacio} (Cap: {esp.capacidad})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.8rem', minWidth: '180px' }}
                            value={c.id_docente}
                            onChange={(e) => {
                              const docId = parseInt(e.target.value, 10);
                              const docObj = docentes.find((d) => d.id_usuario === docId);
                              setPlanClasesGeneradas((prev) =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? {
                                        ...item,
                                        id_docente: docId,
                                        nombre_docente: docObj ? docObj.nombre : item.nombre_docente,
                                      }
                                    : item
                                )
                              );
                            }}
                          >
                            {docentes.map((d) => (
                              <option key={d.id_usuario} value={d.id_usuario}>
                                {d.nombre} ({d.expediente})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SOLICITUDES DE EVENTOS Y EVALUACION PREVENTIVA DE EMPALMES */}
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
              Monitoreo visual de capacidad y uso de las 51 instalaciones de la Facultad de Informatica.
            </p>
          </div>

          {/* Barra de Filtros y Busqueda de Espacios */}
          <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginRight: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FilterIcon size={14} /> Categoria:
              </span>
              {[
                { key: 'todos', label: `Todos (${espacios.length})` },
                { key: 'clases', label: `Clases Normales (${espacios.filter(e => (e.categoria || '').includes('clases')).length})` },
                { key: 'aulas', label: `Aulas (${espacios.filter(e => e.tipo === 'aula').length})` },
                { key: 'laboratorios', label: `Laboratorios (${espacios.filter(e => e.tipo === 'laboratorio').length})` },
                { key: 'deportes', label: `Deportes (${espacios.filter(e => (e.categoria || '').includes('deportes')).length})` },
                { key: 'eventos', label: `Eventos (${espacios.filter(e => (e.categoria || '').includes('eventos')).length})` },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setFiltroCategoriaEspacio(pill.key)}
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid',
                    cursor: 'pointer',
                    fontWeight: filtroCategoriaEspacio === pill.key ? '700' : '500',
                    background: filtroCategoriaEspacio === pill.key ? '#0284C7' : '#F8FAFC',
                    color: filtroCategoriaEspacio === pill.key ? '#FFFFFF' : '#334155',
                    borderColor: filtroCategoriaEspacio === pill.key ? '#0284C7' : '#CBD5E1',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
              <SearchIcon size={16} />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar espacio (ej. A01, D04, LR1, Coliseo...)"
                value={busquedaEspacio}
                onChange={(e) => setBusquedaEspacio(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              />
              {busquedaEspacio && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBusquedaEspacio('')}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="occupancy-grid">
            {espaciosFiltrados.map((esp) => {
              const pct = esp.porcentaje_ocupacion || 0;
              let barColor = '#16A34A'; // Verde
              if (pct > 75) barColor = '#DC2626'; // Rojo
              else if (pct > 40) barColor = '#D97706'; // Ambar

              const cats = (esp.categoria || 'clases').split(',').map((c) => c.trim());

              return (
                <div key={esp.id_espacio} className="space-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ fontWeight: '800', fontSize: '1.02rem', color: '#0F172A' }}>
                      {esp.nombre_espacio}
                    </div>
                    <span className="badge badge-normal" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                      {esp.tipo}
                    </span>
                  </div>

                  {/* Badges de categoria */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {cats.map((c) => (
                      <span
                        key={c}
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: c === 'deportes' ? '#DCFCE7' : c === 'eventos' ? '#FEF3C7' : '#E0F2FE',
                          color: c === 'deportes' ? '#15803D' : c === 'eventos' ? '#B45309' : '#0369A1',
                        }}
                      >
                        {c === 'deportes' ? 'Deportes' : c === 'eventos' ? 'Eventos y Platicas' : 'Clases Normales'}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748B', margin: '8px 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
