import { useEffect, useMemo, useState } from 'react';
import { STATUS_OPTIONS, SORT_OPTIONS } from '../constants';

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
    filters.status || filters.zona || filters.precio_min || filters.precio_max || filters.q;

  return (
    <section className="filters-bar" aria-label="Filtros de propiedades">
      <div className="filters-bar__row">
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

        <div className="filter-group filter-group--price">
          <label>Precio (COP)</label>
          <div className="price-inputs">
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
