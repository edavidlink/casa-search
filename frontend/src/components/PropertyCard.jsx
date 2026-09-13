import { STATUS_MAP, TIPO_NEGOCIO_MAP } from '../constants';

const PropertyCard = ({ property, onEdit, collapsed, onToggleCollapse }) => {
  const {
    id,
    titulo,
    zona,
    area_m2,
    area_min,
    area_max,
    precio_canon,
    tipo_negocio,
    estrato,
    balcon,
    parqueadero,
    parqueadero_num,
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
  const tipoInfo = TIPO_NEGOCIO_MAP[tipo_negocio];

  // Rango de area: usa area_min/area_max si el anuncio publica un rango,
  // si no el area puntual.
  const areaTexto = (() => {
    if (area_min != null && area_max != null) return `${area_min} - ${area_max} m²`;
    if (area_min != null) return `≥ ${area_min} m²`;
    if (area_max != null) return `≤ ${area_max} m²`;
    if (area_m2 != null) return `${area_m2} m²`;
    return null;
  })();

  // Parqueadero: cantidad numerica si está; si no, el texto libre del anuncio.
  const parqueaderoTexto =
    parqueadero_num != null
      ? parqueadero_num === 0
        ? 'Sin parqueadero'
        : `${parqueadero_num} parqueadero${parqueadero_num === 1 ? '' : 's'}`
      : parqueadero || null;

  // El canon es mensual; el precio de venta no lleva periodo.
  const precioTexto =
    precio_canon == null
      ? 'Precio sin definir'
      : `${formatPrice(precio_canon)}${tipo_negocio === 'compra' ? '' : '/mes'}`;

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
            {collapsed ? '▼' : '▲'}
          </button>
          <button
            type="button"
            className="property-card__action-btn"
            onClick={() => onEdit(property)}
            title="Editar"
          >
            ✏️
          </button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="property-card__action-btn"
              title="Ver en portal"
            >
              🔗
            </a>
          )}
        </div>
      </div>

      {/* Badges de status y tipo de negocio */}
      <div className="property-card__status">
        <span
          className="status-badge"
          style={{ backgroundColor: statusInfo.color }}
        >
          {statusInfo.icon} {statusInfo.label}
        </span>
        {tipoInfo && (
          <span className={`tipo-badge tipo-badge--${tipoInfo.value}`}>
            {tipoInfo.icon} {tipoInfo.label}
          </span>
        )}
      </div>

      {/* Información principal */}
      <div className="property-card__main">
        <div className="property-card__price">{precioTexto}</div>
        <div className="property-card__details">
          {areaTexto && (
            <div className="detail-item">
              <span className="detail-icon">📐</span>
              <span>{areaTexto}</span>
            </div>
          )}
          {cuartos !== null && cuartos !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">🛏️</span>
              <span>{cuartos} cuartos</span>
            </div>
          )}
          {banos !== null && banos !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">🚿</span>
              <span>{banos} baños</span>
            </div>
          )}
          {balcon !== null && balcon !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">🌿</span>
              <span>{balcon === 0 ? 'Sin balcón' : `${balcon} balcón${balcon === 1 ? '' : 'es'}`}</span>
            </div>
          )}
          {estrato !== null && estrato !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">🏘️</span>
              <span>Estrato {estrato}</span>
            </div>
          )}
          {parqueaderoTexto && (
            <div className="detail-item">
              <span className="detail-icon">🅿️</span>
              <span>{parqueaderoTexto}</span>
            </div>
          )}
          {distancia_trabajo_km !== null && distancia_trabajo_km !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">📍</span>
              <span>{distancia_trabajo_km.toFixed(1)} km</span>
            </div>
          )}
          {anio_construccion !== null && anio_construccion !== undefined && (
            <div className="detail-item">
              <span className="detail-icon">🏗️</span>
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