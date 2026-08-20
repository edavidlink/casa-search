// Base URL del API. En desarrollo Vite hace proxy de /api al backend local.
// En producción (GitHub Pages) se apunta al dominio real del backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
