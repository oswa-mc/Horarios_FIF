import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ModalEvento({ isOpen, onClose, onEventoCreado }) {
  const [espacios, setEspacios] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [idEspacio, setIdEspacio] = useState('');

  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Cargar lista de espacios disponibles
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
      setTouched({});
      setServerError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

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
  } else if (horaInicio && horaFin <= horaInicio) {
    errors.horaFin = "La hora de fin debe ser posterior a la de inicio";
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

      setSuccessMsg("¡Solicitud de evento enviada exitosamente!");
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Proponer Evento Comunitario</h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            &times;
          </button>
        </div>

        {serverError && <div className="error-banner">{serverError}</div>}
        {successMsg && (
          <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Titulo */}
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

          {/* Espacio Academico */}
          <div className="form-group">
            <label htmlFor="idEspacio">Espacio Academico Requerido *</label>
            <select
              id="idEspacio"
              className="form-control"
              value={idEspacio}
              onChange={(e) => setIdEspacio(e.target.value)}
              onBlur={() => handleBlur('idEspacio')}
            >
              <option value="">-- Seleccionar Espacio --</option>
              {espacios.map((esp) => (
                <option key={esp.id_espacio} value={esp.id_espacio}>
                  {esp.nombre_espacio} ({esp.tipo} - Capacidad: {esp.capacidad} pers.)
                </option>
              ))}
            </select>
            {touched.idEspacio && errors.idEspacio && (
              <div className="field-error">{errors.idEspacio}</div>
            )}
          </div>

          {/* Fecha */}
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

          {/* Horas */}
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
              <label htmlFor="horaFin">Hora de Fin *</label>
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

          {/* Descripcion */}
          <div className="form-group">
            <label htmlFor="descripcion">Descripcion y Objetivo del Evento</label>
            <textarea
              id="descripcion"
              rows="3"
              className="form-control"
              placeholder="Detalla los propositos de la actividad, publico objetivo y requerimientos especiales..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
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
              {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
