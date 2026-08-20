import { useState } from 'react';

const PropertyCard = ({ property, onEdit, statusLabels, statusColors, statusIcons, collapsed, onToggleCollapse }) => {
  const {
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

  const getStatusColor = (status) => statusColors[status] || statusColors['pendiente'];
  const getStatusIcon = (status) => statusIcons[status] || statusIcons['pendiente'];

  return (
    <div className={`property-card ${collapsed ? 'property-card--collapsed' : ''}`}>
      {/* Header con título y acciones */}
      <div className="property-card__header">
        <h3 className="property-card__title" title={titulo}>{titulo}</h3>
        <div className="property-card__actions">
          <button 
            className="property-card__action-btn"
            onClick={() => onToggleCollapse(property.id)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
          <button 
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

      {/* Badge de status */}
      <div className="property-card__status">
        <span 
          className="status-badge" 
          style={{ backgroundColor: getStatusColor(status) }}
        >
          {getStatusIcon(status)} {statusLabels[status]}
        </span>
      </div>

      {/* Información principal */}
      <div className="property-card__main">
        <div className="property-card__price">
          {formatPrice(precio_canon)}/mes
        </div>
        <div className="property-card__details">
          {area_m2 && (
            <div className="detail-item">
              <span className="detail-icon">📐</span>
              <span>{area_m2} m²</span>
            </div>
          )}
          {cuartos && (
            <div className="detail-item">
              <span className="detail-icon">🛏️</span>
              <span>{cuartos} cuartos</span>
            </div>
          )}
          {banos && (
            <div className="detail-item">
              <span className="detail-icon">🚿</span>
              <span>{banos} baños</span>
            </div>
          )}
          {distancia_trabajo_km && (
            <div className="detail-item">
              <span className="detail-icon">📍</span>
              <span>{distancia_trabajo_km.toFixed(1)} km</span>
            </div>
          )}
          {anio_construccion && (
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