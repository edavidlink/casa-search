import { useEffect, useState } from 'react';
import { STATUS_OPTIONS } from '../constants';

export default function EditPanel({ property, onSave, onClose, loading, error }) {
  const [status, setStatus] = useState(property?.status || 'pendiente');
  const [observaciones, setObservaciones] = useState(property?.observaciones || '');
  const [comentarios, setComentarios] = useState(property?.comentarios || '');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!property) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ status, observaciones, comentarios });
  };

  return (
    <div className="edit-panel__overlay" onClick={onClose}>
      <div className="edit-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <h2 id="edit-title">Editar propiedad</h2>
        <p className="edit-panel__subtitle">{property.titulo}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-status">Estado</label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-observaciones">Observaciones</label>
            <textarea
              id="edit-observaciones"
              rows={6}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escribe tus notas sobre esta propiedad..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-comentarios">Comentarios</label>
            <textarea
              id="edit-comentarios"
              rows={4}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Comentarios adicionales sobre esta propiedad..."
            />
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="edit-panel__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}