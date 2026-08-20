import { API_BASE_URL } from './config';

const DEFAULT_TIMEOUT_MS = 15000;

function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE_URL || window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const body = await response.json();
        message = body.detail || body.message || message;
      } catch {
        // ignorar fallo al parsear error
      }
      throw new Error(message);
    }

    return response.status === 204 ? null : await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Inténtalo de nuevo.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function listProperties(filters = {}) {
  return fetchWithTimeout(buildUrl('/api/properties', filters));
}

export async function getProperty(id) {
  return fetchWithTimeout(buildUrl(`/api/properties/${id}`));
}

export async function updateProperty(id, patch) {
  return fetchWithTimeout(buildUrl(`/api/properties/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}
