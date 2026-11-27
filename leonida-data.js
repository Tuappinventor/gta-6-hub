import { alienLaboratory, paranormalLocations } from './leonida-paranormal.js';

export const LEONIDA_BASE = 'https://fbritoferreira.github.io/gta6';

export async function fetchLeonidaJson(path) {
  const response = await fetch(LEONIDA_BASE + path);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

export async function loadLeonidaLocations() {
  const data = await fetchLeonidaJson('/data/locations.json');
  if (!Array.isArray(data)) throw new Error('Formato de datos incompatible');

  const ids = new Set();
  return [...data, alienLaboratory].filter(point => {
    if (!point?.id || ids.has(point.id) ||
        !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        point.x < 0 || point.x > 1024 || point.y < 0 || point.y > 1024) {
      return false;
    }

    ids.add(point.id);
    return true;
  }).map(point => {
    const details = paranormalLocations[point.id];
    if (!details) return point;

    return {
      ...point,
      ...details,
      originalName: point.name,
      paranormal: true,
    };
  });
}
