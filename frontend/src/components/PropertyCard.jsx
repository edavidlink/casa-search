import { STATUS_MAP } from '../constants';

function formatCOP(value) {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value, suffix = '') {
  if (value === undefined || value === null) return 'N/A';
  return `${Number(value).toLocaleString('es-CO')}${suffix}`;
}

export default function PropertyCard({ property, onEdit, onQuickAction }) {
  const status = STATUS_MAP[property.status] || STATUS_MAP.pendiente;

  const handleFavorite = (e) => {
    e.stopPropagation();
    onQuickAction(property.id, 'favorita');
  };

  const handleDiscard = (e) => {
    e.stopPropagation();
    onQuickAction(property.id, 'descartada');
  };

  return (
    <article
      className="property-card"
      style={{ borderLeft: `5px solid ${status.color}` }}
    >
      <header className="property-card__header">
        <span
          className="property-card__badge"
          style={{ backgroundColor: status.color }}
        >
          {status.icon} {status.label}
        </span>
        <div className="property-card__actions">
          <button
            type="button"
            className="btn-icon"
            title="Marcar favorita"
            onClick={handleFavorite}
            aria-label="Marcar favorita"
          >
            ⭐
          </button>
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            title="Descartar"
            onClick={handleDiscard}
            aria-label="Descartar"
          >
            ✖️
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => onEdit(property)}
          >
            Editar
          </button>
        </div>
      </header>

      <h3 className="property-card__title">{property.titulo}</h3>
      <p className="property-card__zona">📍 {property.zona || 'Zona no indicada'}</p>

      <div className="property-card__stats">
        <div className="stat">
          <span className="stat__label">Canon</span>
          <span className="stat__value stat__value--price">
            {formatCOP(property.precio_canon)}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Área</span>
          <span className="stat__value">{formatNumber(property.area_m2, ' m²')}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Cuartos</span>
          <span className="stat__value">{formatNumber(property.cuartos)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Baños</span>
          <span className="stat__value">{formatNumber(property.banos)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Distancia</span>
          <span className="stat__value">{formatNumber(property.distancia_trabajo_km, ' km')}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Año</span>
          <span className="stat__value">{property.anio_construccion || 'N/A'}</span>
        </div>
      </div>

      {property.descripcion && (
        <p className="property-card__desc">{property.descripcion}</p>
      )}

      <div className="property-card__meta">
        <span>Portal: {property.portal || 'N/A'}</span>
        {property.parqueadero && <span> · Parqueadero: {property.parqueadero}</span>}
      </div>

      {property.observaciones && (
        <div className="property-card__obs">
          <strong>Observaciones:</strong> {property.observaciones}
        </div>
      )}

      <footer className="property-card__footer">
        <a
          href={property.link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--link"
          onClick={(e) => e.stopPropagation()}
        >
          Ver publicación ↗
        </a>
      </footer>
    </article>
  );
}
