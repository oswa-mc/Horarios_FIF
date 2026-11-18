import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ModalEspaciosDisponibles({ isOpen, onClose, evento }) {
  const [espaciosDisponibles, setEspaciosDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && evento) {
      setLoading(true);
      setError('');
      api.getEspaciosDisponibles(evento.fecha_evento, evento.hora_inicio, evento.hora_fin)
        .then((data) => {
          setEspaciosDisponibles(data);
        })
        .catch((err) => {
          setError(err.detail || 'Error al consultar disponibilidad');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, evento]);

  if (!isOpen || !evento) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div>
            <h3>Espacios Disponibles Alternativos</h3>
            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
              Para el <strong>{evento.fecha_evento}</strong> de <strong>{evento.hora_inicio}</strong> a <strong>{evento.hora_fin}</strong>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
            Consultando agenda de espacios academicos...
          </div>
        ) : espaciosDisponibles.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#FEF2F2', borderRadius: '8px', color: '#991B1B' }}>
            No hay ningun espacio libre en este horario y fecha.
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '14px' }}>
              Los siguientes {espaciosDisponibles.length} espacios no presentan ningun cruce de clase ni eventos comunitarios aprobados:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              {espaciosDisponibles.map((esp) => (
                <div key={esp.id_espacio} style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px', background: '#F8FAFC' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#1E293B' }}>{esp.nombre_espacio}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                    Tipo: <strong>{esp.tipo}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Capacidad: <strong>{esp.capacidad} personas</strong>
                  </div>
                  <span className="badge badge-normal" style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                    Disponible
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

