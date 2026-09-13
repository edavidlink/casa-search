import { useEffect, useMemo, useState } from 'react';
import { listProperties, updateProperty } from './api';
import { STATUS_MAP } from './constants';
import FiltersBar from './components/FiltersBar';
import PropertyCard from './components/PropertyCard';
import EditPanel from './components/EditPanel';
import './App.css';

const emptyFilters = {
  status: '',
  zona: '',
  tipo_negocio: '',
  precio_min: '',
  precio_max: '',
  area_min: '',
  area_max: '',
  balcon_min: '',
  balcon_max: '',
  parqueadero_min: '',
  parqueadero_max: '',
  estrato_min: '',
  estrato_max: '',
  q: '',
  ordenar: 'fecha',
};

export default function App() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [counts, setCounts] = useState({});

  const [editing, setEditing] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  const [refreshTick, setRefreshTick] = useState(0);

  // Estado para colapsado/expandido por ID
  const [collapsedCards, setCollapsedCards] = useState(() => {
    const saved = sessionStorage.getItem('collapsedCards');
    return saved ? JSON.parse(saved) : {};
  });

  const zones = useMemo(
    () => Array.from(new Set(items.map((p) => p.zona).filter(Boolean))).sort(),
    [items]
  );

  // Persistir estado de colapsado
  useEffect(() => {
    sessionStorage.setItem('collapsedCards', JSON.stringify(collapsedCards));
  }, [collapsedCards]);

  const toggleCollapse = (id) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProperties({ ...filters, limite: 200 })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Error al cargar las propiedades');
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    listProperties({ limite: 200 })
      .then(({ items: allItems, total: allTotal }) => {
        if (cancelled) return;
        const counts = { total: allTotal };
        allItems.forEach((p) => {
          counts[p.status] = (counts[p.status] || 0) + 1;
        });
        setCounts(counts);
      })
      .catch(() => {
        // contadores no bloquean
      });
    return () => { cancelled = true; };
  }, [refreshTick]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFilterChange = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ ...emptyFilters });
  };

  const handleQuickAction = async (id, newStatus) => {
    setSaveLoading(true);
    setSaveError(null);
    try {
      const updated = await updateProperty(id, { status: newStatus });
      setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast(`Marcada como ${STATUS_MAP[newStatus]?.label || newStatus}`);
      loadCounts();
    } catch (err) {
      showToast(err.message || 'Error al actualizar', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (property) => {
    setEditing(property);
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setEditing(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (patch) => {
    if (!editing) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const updated = await updateProperty(editing.id, patch);
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      handleCloseEdit();
      showToast('Cambios guardados');
      loadCounts();
    } catch (err) {
      setSaveError(err.message || 'Error al guardar');
    } finally {
      setSaveLoading(false);
    }
  };

  const loadCounts = () => {
    setRefreshTick((t) => t + 1);
  };

  // Ordenamiento: descartadas al final, resto por criterio seleccionado
  const sortedItems = useMemo(() => {
    const nonDiscarded = items.filter((p) => p.status !== 'descartada');
    const discarded = items.filter((p) => p.status === 'descartada');
    return [...nonDiscarded, ...discarded];
  }, [items]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>🏠 Casa Search</h1>
        <p>Gestor de opciones de mudanza</p>
      </header>

      <main className="app__main">
        <FiltersBar
          filters={filters}
          zones={zones}
          counts={counts}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        {error && (
          <div className="alert alert--error">
            <span>{error}</span>
            <button type="button" className="btn btn--secondary" onClick={() => setRefreshTick((t) => t + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {!error && (
          <div className="results-bar">
            <span>
              {loading
                ? 'Cargando...'
                : `${total} propiedad${total === 1 ? '' : 'es'} encontrada${total === 1 ? '' : 's'}`}
            </span>
            <div className="quick-filters">
              <button
                type="button"
                className={`quick-filter ${filters.status === 'favorita' ? 'active' : ''}`}
                onClick={() => handleFilterChange({ status: 'favorita' })}
              >
                ⭐ Favoritas ({counts.favorita || 0})
              </button>
              <button
                type="button"
                className={`quick-filter ${filters.status === 'descartada' ? 'active' : ''}`}
                onClick={() => handleFilterChange({ status: 'descartada' })}
              >
                ✖️ Descartadas ({counts.descartada || 0})
              </button>
              <button
                type="button"
                className={`quick-filter ${filters.status === '' ? 'active' : ''}`}
                onClick={() => handleFilterChange({ status: '' })}
              >
                Todas ({counts.total || 0})
              </button>
            </div>
          </div>
        )}

        {loading && sortedItems.length === 0 && (
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        )}

        {!loading && sortedItems.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <h2>Sin resultados</h2>
            <p>No hay propiedades que coincidan con los filtros.</p>
            <button type="button" className="btn btn--primary" onClick={handleClearFilters}>
              Limpiar filtros
            </button>
          </div>
        )}

        {sortedItems.length > 0 && (
          <section className="properties-grid" aria-label="Propiedades">
            {sortedItems.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                collapsed={collapsedCards[property.id]}
                onToggleCollapse={() => toggleCollapse(property.id)}
                onEdit={handleEdit}
                onQuickAction={handleQuickAction}
              />
            ))}
          </section>
        )}
      </main>

      <EditPanel
        key={editing?.id}
        property={editing}
        onSave={handleSaveEdit}
        onClose={handleCloseEdit}
        loading={saveLoading}
        error={saveError}
      />

      {toast && (
        <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <footer className="app__footer">
        <small>Casa Search MVP · {new Date().getFullYear()}</small>
      </footer>
    </div>
  );
}