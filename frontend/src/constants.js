export const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: '#9ca3af', icon: '⚪' },
  { value: 'por_revisar', label: 'Por revisar', color: '#f59e0b', icon: '👁️' },
  { value: 'por_verificar', label: 'Por verificar', color: '#f97316', icon: '🔍' },
  { value: 'favorita', label: 'Favorita', color: '#22c55e', icon: '⭐' },
  { value: 'descartada', label: 'Descartada', color: '#ef4444', icon: '✖️' },
  { value: 'visitada', label: 'Visitada', color: '#3b82f6', icon: '👣' },
  { value: 'en_negociacion', label: 'En negociación', color: '#8b5cf6', icon: '🤝' },
  { value: 'aprobada', label: 'Aprobada', color: '#10b981', icon: '✅' },
];

export const STATUS_MAP = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s])
);

export const SORT_OPTIONS = [
  { value: 'fecha', label: 'Más recientes' },
  { value: 'precio', label: 'Precio: menor a mayor' },
  { value: '-precio', label: 'Precio: mayor a menor' },
  { value: 'area', label: 'Área: menor a mayor' },
  { value: '-area', label: 'Área: mayor a menor' },
  { value: 'distancia', label: 'Distancia: más cerca' },
];

// --- Filtros de búsqueda -------------------------------------------------

export const TIPO_NEGOCIO_OPTIONS = [
  { value: 'compra', label: 'Compra', icon: '🏷️' },
  { value: 'arriendo', label: 'Arriendo', icon: '🔑' },
];

export const TIPO_NEGOCIO_MAP = Object.fromEntries(
  TIPO_NEGOCIO_OPTIONS.map((t) => [t.value, t])
);

// Cantidad de balcones (0 = sin balcón).
export const BALCON_OPTIONS = [0, 1, 2, 3, 4];

// Cantidad de parqueaderos (0 = sin parqueadero).
export const PARQUEADERO_OPTIONS = [0, 1, 2, 3, 4];

// Estrato socioeconómico.
export const ESTRATO_OPTIONS = [1, 2, 3, 4, 5, 6];
