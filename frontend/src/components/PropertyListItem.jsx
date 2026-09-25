import { STATUS_MAP, TIPO_NEGOCIO_MAP } from '../constants';

const PropertyListItem = ({ property, onEdit }) => {
  const {
    id,
    titulo,
    zona,
    area_m2,
    precio_canon,
    tipo_negocio,
    estrato,
    parqueadero_num,
    cuartos,
    banos,
    status,
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
    <div className="property-list-item">
      <span
        className="status-dot"
        style={{ backgroundColor: statusInfo.color }}
        title={statusInfo.label}
      />
      <div className="list-item__main">
        <span className="list-item__title" title={titulo}>
          {titulo || 'Sin título'}
        </span>
        <span className="list-item__zona">{zona}</span>
      </div>
      <div className="list-item__attrs">
        {precio_canon != null && (
          <span className="list-item__price">{formatPrice(precio_canon)}</span>
        )}
        {area_m2 != null && <span className="list-item__attr">📐 {area_m2} m²</span>}
        {cuartos != null && <span className="list-item__attr">🛏️ {cuartos}</span>}
        {banos != null && <span className="list-item__attr">🚿 {banos}</span>}
        {parqueadero_num != null && (
          <span className="list-item__attr">🅿️ {parqueadero_num}</span>
        )}
        {estrato != null && <span className="list-item__attr">E{estrato}</span>}
      </div>
      <div className="list-item__actions">
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
  );
};

export default PropertyListItem;