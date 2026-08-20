import { STATUS_MAP } from '../constants';

const PropertyCard = ({ property, onEdit, collapsed, onToggleCollapse }) => {
  const {
    id,
    titulo,
    zona,
    area_m2,
    precio_canon,
    cuartos,
    banos,
    distancia_trabajo_km,
    anio_construccion,
    status,
    observaciones,
    comentarios,
    link,
  } = property;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const statusInfo = STATUS_MAP[status] || STATUS_MAP['pendiente'];

  return (
    <div className={`property-card ${collapsed ? 'property-card--collapsed' : ''}`}>
      {/* Header con título y acciones */}
      <div className="property-card__header">
        <h3 className="property-card__title" title={titulo}>{titulo}</h3>
        <div className="property-card__actions">
          <button
            type="button"
            className="property-card__action-btn"
            onClick={() => onToggleCollapse(id)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '\u25bc' : '\u25b2'}
          </button>
          <button
            type="button"
            className="property-card__action-btn"
            onClick={() => onEdit(property)}
            title="Editar"
          >
            \u270f\ufe0f
          </button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="property-card__action-btn"
              title="Ver en portal"
            >
              \ud83d\udd17
            </a>
          )}
        </div>
      </div>

      {/* Badge de status */}
      <div className="property-card__status">
        <span
          className="status-badge"
          style={{ backgroundColor: statusInfo.color }}
        >
          {statusInfo.icon} {statusInfo.label}
        </span>
      </div>

      {/* Información principal */}
      <div className="property-card__main">
        <div className="property-card__price">
          {formatPrice(precio_canon)}/mes
        </div>
        <div className="property-card__details">
          {area_m2 !== null && area_m2 !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">\ud83d\udcd0</span>
              <span>{area_m2} m\u00b2</span>
            </div>
          )}
          {cuartos !== null && cuartos !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">\ud83d\udecf\ufe0f</span>
              <span>{cuartos} cuartos</span>
            </div>
          )}
          {banos !== null && banos !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">\ud83d\udebf</span>
              <span>{banos} ba\u00f1os</span>
            </div>
          )}
          {distancia_trabajo_km !== null && distancia_trabajo_km !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">\ud83d\udccd</span>
              <span>{distancia_trabajo_km.toFixed(1)} km</span>
            </div>
          )}
          {anio_construccion !== null && anio_construccion !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">\ud83c\udfd7\ufe0f</span>
              <span>{anio_construccion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional (solo cuando no está colapsado) */}
      {!collapsed && (
        <div className="property-card__extra">
          <div className="extra-section">
            <div className="extra-label">Zona</div>
            <div className="extra-value">{zona}</div>
          </div>

          {observaciones && (
            <div className="extra-section">
              <div className="extra-label">Observaciones</div>
              <div className="extra-value">{observaciones}</div>
            </div>
          )}

          {comentarios && (
            <div className="extra-section property-card__comments">
              <div className="extra-label">Comentarios</div>
              <div className="extra-value">{comentarios}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyCard;