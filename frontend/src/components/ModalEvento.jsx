import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CheckCircleIcon, AlertTriangleIcon, BuildingIcon, ClockIcon } from './Icons';

export default function ModalEvento({ isOpen, onClose, onEventoCreado }) {
  const [espacios, setEspacios] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [idEspacio, setIdEspacio] = useState('');

  // Estado para la validacion dinamica de disponibilidad
  const [disponibles, setDisponibles] = useState(null);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState('');

  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Cargar lista general de espacios
      api.getEspacios()
        .then((data) => setEspacios(data))
        .catch((err) => console.error("Error al cargar espacios:", err));
      
      // Limpiar formulario
      setTitulo('');
      setDescripcion('');
      setFechaEvento('');
      setHoraInicio('');
      setHoraFin('');
      setIdEspacio('');
      setDisponibles(null);
      setCargandoDisponibilidad(false);
      setErrorDisponibilidad('');
      setTouched({});
      setServerError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  // Validacion y consulta dinamica de disponibilidad al cambiar fecha u horarios
  useEffect(() => {
    if (!fechaEvento || !horaInicio || !horaFin) {
      setDisponibles(null);
      return;
    }

    if (horaInicio >= horaFin) {
      setDisponibles(null);
      return;
    }

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);
    const duracion = (hF * 60 + mF) - (hI * 60 + mI);
    if (duracion < 30) {
      setDisponibles(null);
      return;
    }

    setCargandoDisponibilidad(true);
    setErrorDisponibilidad('');

    api.getEspaciosDisponibles(fechaEvento, horaInicio, horaFin)
      .then((data) => {
        setDisponibles(data);
      })
      .catch((err) => {
        console.error("Error al consultar disponibilidad:", err);
        setErrorDisponibilidad("No se pudo verificar la disponibilidad de espacios");
      })
      .finally(() => {
        setCargandoDisponibilidad(false);
      });
  }, [fechaEvento, horaInicio, horaFin]);

  if (!isOpen) return null;

  // Validacion de campos en tiempo real
  const errors = {};
  if (!titulo.trim()) {
    errors.titulo = "El titulo del evento es obligatorio";
  }
  if (!fechaEvento) {
    errors.fechaEvento = "Debe seleccionar una fecha para el evento";
  }
  if (!horaInicio) {
    errors.horaInicio = "Debe indicar la hora de inicio";
  }
  if (!horaFin) {
    errors.horaFin = "Debe indicar la hora de finalizacion";
  } else if (horaInicio) {
    if (horaFin <= horaInicio) {
      errors.horaFin = "La hora de fin debe ser posterior a la de inicio";
    } else {
      const [hI, mI] = horaInicio.split(':').map(Number);
      const [hF, mF] = horaFin.split(':').map(Number);
      const duracion = (hF * 60 + mF) - (hI * 60 + mI);
      if (duracion < 30) {
        errors.horaFin = "Los eventos deben tener minimo 30 minutos de duracion (actual: " + duracion + " min)";
      }
    }
  }
  if (!idEspacio) {
    errors.idEspacio = "Debe seleccionar un espacio academico";
  }

  const isFormValid = Object.keys(errors).length === 0;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      titulo: true,
      fechaEvento: true,
      horaInicio: true,
      horaFin: true,
      idEspacio: true,
    });

    if (!isFormValid) return;

    setIsSubmitting(true);
    setServerError('');
    setSuccessMsg('');

    try {
      await api.crearEvento({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        fecha_evento: fechaEvento,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        id_espacio: parseInt(idEspacio, 10),
      });

      setSuccessMsg("Solicitud de evento enviada exitosamente.");
      setTimeout(() => {
        if (onEventoCreado) onEventoCreado();
        onClose();
      }, 1200);
    } catch (err) {
      setServerError(err.detail || "Error al enviar la propuesta de evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conjunto de IDs disponibles
  const idsDisponibles = disponibles ? new Set(disponibles.map((d) => d.id_espacio)) : null;
  const espacioSeleccionadoDisponible = idEspacio && idsDisponibles ? idsDisponibles.has(parseInt(idEspacio, 10)) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <h3>Proponer Evento Comunitario</h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            &times;
          </button>
        </div>

        {serverError && (
          <div className="error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangleIcon size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleIcon size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Titulo del Evento */}
          <div className="form-group">
            <label htmlFor="titulo">Titulo del Evento *</label>
            <input
              id="titulo"
              type="text"
              className="form-control"
              placeholder="Ej. Taller de Inteligencia Artificial para Estudiantes"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => handleBlur('titulo')}
            />
            {touched.titulo && errors.titulo && (
              <div className="field-error">{errors.titulo}</div>
            )}
          </div>

          {/* 2. Descripcion (opcional) */}
          <div className="form-group">
            <label htmlFor="descripcion">Descripcion y Objetivo del Evento</label>
            <textarea
              id="descripcion"
              rows="2"
              className="form-control"
              placeholder="Detalla los propositos de la actividad, publico objetivo o requerimientos..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {/* 3. Fecha del Evento (primero que el espacio) */}
          <div className="form-group">
            <label htmlFor="fechaEvento">Fecha del Evento *</label>
            <input
              id="fechaEvento"
              type="date"
              className="form-control"
              value={fechaEvento}
              onChange={(e) => setFechaEvento(e.target.value)}
              onBlur={() => handleBlur('fechaEvento')}
            />
            {touched.fechaEvento && errors.fechaEvento && (
              <div className="field-error">{errors.fechaEvento}</div>
            )}
          </div>

          {/* 4. Horas (Inicio y Fin - minimo 30 min) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="horaInicio">Hora de Inicio *</label>
              <input
                id="horaInicio"
                type="time"
                className="form-control"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                onBlur={() => handleBlur('horaInicio')}
              />
              {touched.horaInicio && errors.horaInicio && (
                <div className="field-error">{errors.horaInicio}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="horaFin">Hora de Fin * (Min. 30 min)</label>
              <input
                id="horaFin"
                type="time"
                className="form-control"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                onBlur={() => handleBlur('horaFin')}
              />
              {touched.horaFin && errors.horaFin && (
                <div className="field-error">{errors.horaFin}</div>
              )}
            </div>
          </div>

          {/* 5. Al final: Espacio Academico Requerido con estado de ocupado o disponible */}
          <div className="form-group" style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="idEspacio" style={{ fontWeight: '700', marginBottom: 0 }}>
                Espacio Academico Requerido *
              </label>
              {cargandoDisponibilidad && (
                <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: '600' }}>
                  Comprobando disponibilidad...
                </span>
              )}
            </div>

            {/* Aviso informativo de estado de disponibilidad */}
            {disponibles !== null && (
              <div style={{
                background: disponibles.length > 0 ? '#EFF6FF' : '#FFF1F2',
                border: `1px solid ${disponibles.length > 0 ? '#BFDBFE' : '#FECDD3'}`,
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                <span style={{ color: disponibles.length > 0 ? '#1E40AF' : '#991B1B', fontWeight: '600' }}>
                  {disponibles.length} de {espacios.length} espacios disponibles para la fecha y horario ingresados.
                </span>
              </div>
            )}

            {!fechaEvento || !horaInicio || !horaFin ? (
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '8px' }}>
                Ingresa primero la fecha y horarios arriba para validar automaticamente si cada espacio esta ocupado o disponible.
              </div>
            ) : null}

            <select
              id="idEspacio"
              className="form-control"
              value={idEspacio}
              onChange={(e) => setIdEspacio(e.target.value)}
              onBlur={() => handleBlur('idEspacio')}
            >
              <option value="">-- Seleccionar Espacio Academico --</option>
              {espacios.map((esp) => {
                const estaDisponible = idsDisponibles ? idsDisponibles.has(esp.id_espacio) : null;
                const etiquetaEstado = estaDisponible === true
                  ? '[DISPONIBLE] '
                  : estaDisponible === false
                  ? '[OCUPADO] '
                  : '';

                return (
                  <option
                    key={esp.id_espacio}
                    value={esp.id_espacio}
                    style={
                      estaDisponible === true
                        ? { color: '#16A34A', fontWeight: '600' }
                        : estaDisponible === false
                        ? { color: '#DC2626' }
                        : {}
                    }
                  >
                    {etiquetaEstado}{esp.nombre_espacio} ({esp.tipo} - Capacidad: {esp.capacidad} pers.)
                  </option>
                );
              })}
            </select>
            {touched.idEspacio && errors.idEspacio && (
              <div className="field-error">{errors.idEspacio}</div>
            )}

            {/* Aviso especifico sobre el espacio seleccionado */}
            {idEspacio && espacioSeleccionadoDisponible === true && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: '#DCFCE7',
                color: '#15803D',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircleIcon size={16} />
                <span>Espacio disponible: No presenta empalme en el horario seleccionado.</span>
              </div>
            )}

            {idEspacio && espacioSeleccionadoDisponible === false && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: '#FEF2F2',
                color: '#B91C1C',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangleIcon size={16} />
                <span>Atencion: Espacio ocupado en este horario. Si envias la solicitud, el administrador vera la advertencia de empalme preventivo.</span>
              </div>
            )}

            {/* Chips sugeridos de espacios disponibles */}
            {disponibles && disponibles.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>
                  Seleccion rapida de espacios disponibles:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {disponibles.map((esp) => (
                    <button
                      key={esp.id_espacio}
                      type="button"
                      className={`btn btn-sm ${parseInt(idEspacio, 10) === esp.id_espacio ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      onClick={() => setIdEspacio(String(esp.id_espacio))}
                    >
                      {esp.nombre_espacio} ({esp.capacidad} pers.)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botones de accion */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "Enviando propuesta..." : "Enviar Solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
