// Configuración de la API del backend
export const API_BASE_URL = "https://casa-api.169.58.88.103.nip.io";

export const API_CONFIG = {
    health: `${API_BASE_URL}/api/health`,
    properties: `${API_BASE_URL}/api/properties`,
    property: (id) => `${API_BASE_URL}/api/properties/${id}`
};

export const API_TIMEOUT = 10000; // 10 segundos

export const STATUS_LABELS = {
    'pendiente': 'Pendiente',
    'por_revisar': 'Por revisar',
    'favorita': 'Favorita',
    'descartada': 'Descartada',
    'aprobada': 'Aprobada',
    'por_verificar': 'Por verificar',
    'en_negociacion': 'En negociación',
    'visitada': 'Visitada'
};

export const STATUS_COLORS = {
    'pendiente': '#94a3b8',
    'por_revisar': '#eab308',
    'favorita': '#22c55e',
    'descartada': '#ef4444',
    'aprobada': '#3b82f6',
    'por_verificar': '#f59e0b',
    'en_negociacion': '#8b5cf6',
    'visitada': '#06b6d4'
};

export const STATUS_ICONS = {
    'pendiente': '⚪',
    'por_revisar': '🟡',
    'favorita': '⭐',
    'descartada': '❌',
    'aprobada': '✅',
    'por_verificar': '🔍',
    'en_negociacion': '💰',
    'visitada': '📍'
};