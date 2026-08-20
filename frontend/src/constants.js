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
  { value: 'distancia', label: 'Distancia: más cerca' },
];
