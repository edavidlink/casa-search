import { useEffect, useMemo, useState } from 'react';
import {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  TIPO_NEGOCIO_OPTIONS,
  BALCON_OPTIONS,
  PARQUEADERO_OPTIONS,
  ESTRATO_OPTIONS,
} from '../constants';

export default function FiltersBar({ filters, zones, counts, onChange, onClear }) {
  const [localText, setLocalText] = useState(filters.q || '');

  const debouncedChange = useMemo(
    () => debounce((value) => onChange({ q: value }), 300),
    [onChange]
  );

  useEffect(() => {
    return () => debouncedChange.cancel?.();
  }, [debouncedChange]);

  const handleTextChange = (e) => {
    const value = e.target.value;
    setLocalText(value);
    debouncedChange(value);
  };

  const handleChange = (key, value) => {
    onChange({ [key]: value });
  };

  const hasFilters =
    filters.status ||
    filters.zona ||
    filters.tipo_negocio ||
    filters.precio_min ||
    filters.precio_max ||
    filters.area_min ||
    filters.area_max ||
    filters.cuartos_min ||
    filters.cuartos_max ||
    filters.parqueadero_min ||
    filters.parqueadero_max ||
    filters.estrato_min ||
    filters.estrato_max ||
    filters.q;

  // Etiqueta del precio segun el tipo de negocio elegido.
  const precioLabel =
    filters.tipo_negocio === 'compra' ? 'Precio de venta (COP)' : 'Precio / canon (COP)';

  return (
    <section className="filters-bar" aria-label="Filtros de propiedades">
      <div className="filters-bar__row">
        <div className="filter-group filter-group--tipo">
          <label id="filter-tipo-label">Tipo de negocio</label>
          <div
            className="segmented"
            role="group"
            aria-labelledby="filter-tipo-label"
          >
            <button
              type="button"
              className={`segmented__btn ${!filters.tipo_negocio ? 'active' : ''}`}
              onClick={() => handleChange('tipo_negocio', '')}
              aria-pressed={!filters.tipo_negocio}
            >
              Todos
            </button>
            {TIPO_NEGOCIO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented__btn ${
                  filters.tipo_negocio === opt.value ? 'active' : ''
                }`}
                onClick={() => handleChange('tipo_negocio', opt.value)}
                aria-pressed={filters.tipo_negocio === opt.value}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-status">Estado</label>
          <select
            id="filter-status"
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="">Todos ({counts.total ?? 0})</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label} ({counts[opt.value] ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-zona">Zona</label>
          <select
            id="filter-zona"
            value={filters.zona || ''}
            onChange={(e) => handleChange('zona', e.target.value)}
          >
            <option value="">Todas</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-ordenar">Ordenar</label>
          <select
            id="filter-ordenar"
            value={filters.ordenar || 'fecha'}
            onChange={(e) => handleChange('ordenar', e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filters-bar__row filters-bar__row--ranges">
        <div className="filter-group filter-group--price">
          <label>{precioLabel}</label>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Mín"
              value={filters.precio_min || ''}
              onChange={(e) => handleChange('precio_min', e.target.value)}
            />
            <span>—</span>
            <input
              type="number"
              placeholder="Máx"
              value={filters.precio_max || ''}
              onChange={(e) => handleChange('precio_max', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group filter-group--area">
          <label>Área (m²)</label>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Mín"
              min="0"
              step="1"
              value={filters.area_min || ''}
              onChange={(e) => handleChange('area_min', e.target.value)}
            />
            <span>—</span>
            <input
              type="number"
              placeholder="Máx"
              min="0"
              step="1"
              value={filters.area_max || ''}
              onChange={(e) => handleChange('area_max', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group filter-group--short">
          <label htmlFor="filter-cuartos-min">Habitaciones</label>
          <div className="range-inputs">
            <select
              id="filter-cuartos-min"
              aria-label="Habitaciones desde"
              value={filters.cuartos_min ?? ''}
              onChange={(e) => handleChange('cuartos_min', e.target.value)}
            >
              <option value="">Desde</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>—</span>
            <select
              aria-label="Habitaciones hasta"
              value={filters.cuartos_max ?? ''}
              onChange={(e) => handleChange('cuartos_max', e.target.value)}
            >
              <option value="">Hasta</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-group filter-group--short">
          <label htmlFor="filter-estrato-min">Estrato</label>
          <div className="range-inputs">
            <select
              id="filter-estrato-min"
              aria-label="Estrato desde"
              value={filters.estrato_min ?? ''}
              onChange={(e) => handleChange('estrato_min', e.target.value)}
            >
              <option value="">Desde</option>
              {ESTRATO_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>—</span>
            <select
              aria-label="Estrato hasta"
              value={filters.estrato_max ?? ''}
              onChange={(e) => handleChange('estrato_max', e.target.value)}
            >
              <option value="">Hasta</option>
              {ESTRATO_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-group filter-group--short">
          <label htmlFor="filter-parqueadero-min">Parqueaderos</label>
          <div className="range-inputs">
            <select
              id="filter-parqueadero-min"
              aria-label="Parqueaderos desde"
              value={filters.parqueadero_min ?? ''}
              onChange={(e) => handleChange('parqueadero_min', e.target.value)}
            >
              <option value="">Desde</option>
              {PARQUEADERO_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>—</span>
            <select
              aria-label="Parqueaderos hasta"
              value={filters.parqueadero_max ?? ''}
              onChange={(e) => handleChange('parqueadero_max', e.target.value)}
            >
              <option value="">Hasta</option>
              {PARQUEADERO_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="filters-bar__row filters-bar__row--search">
        <div className="filter-group filter-group--grow">
          <label htmlFor="filter-q">Buscar</label>
          <input
            id="filter-q"
            type="text"
            placeholder="Título, zona, descripción, portal..."
            value={localText}
            onChange={handleTextChange}
          />
        </div>
        {hasFilters && (
          <button type="button" className="btn btn--ghost" onClick={onClear}>
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}

function debounce(fn, ms) {
  let timeoutId;
  const wrapped = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(timeoutId);
  return wrapped;
}
