export const STORAGE_KEY = 'thoughtGarden.entries.v1';
export const SCHEMA_VERSION = 1;

const FEATURE_KEYS = [
  'wordCount',
  'sentenceCount',
  'exclamationCount',
  'questionCount',
  'positiveScore',
  'negativeScore',
  'calmScore',
  'energeticScore'
];

const STYLE_KEYS = [
  'height',
  'width',
  'branchCount',
  'leafRoundness',
  'sway',
  'asymmetry',
  'bloomOpenness',
  'bloomTilt',
  'paletteIndex',
  'petalCount'
];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasNumericKeys(object, keys) {
  return object && typeof object === 'object' && keys.every(key => isFiniteNumber(object[key]));
}

export function validateEntry(value) {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.id !== 'string' || !value.id.trim()) return false;
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) return false;
  if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 500) return false;
  if (!hasNumericKeys(value.features, FEATURE_KEYS)) return false;
  if (!Array.isArray(value.topicTokens) || !value.topicTokens.every(token => typeof token === 'string')) return false;
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff) return false;
  if (!isFiniteNumber(value.x) || value.x < 0 || value.x > 1) return false;
  if (!hasNumericKeys(value.style, STYLE_KEYS)) return false;
  if (!Number.isInteger(value.style.branchCount) || value.style.branchCount < 1 || value.style.branchCount > 6) return false;
  if (!Number.isInteger(value.style.paletteIndex) || value.style.paletteIndex < 0) return false;
  if (!Number.isInteger(value.style.petalCount) || value.style.petalCount < 1) return false;
  return true;
}

export function validateGardenPayload(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Garden data must be a JSON object.');
  }
  if (value.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported garden version. Expected version ${SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(value.entries)) {
    throw new Error('Garden data is missing its entries list.');
  }
  if (!value.entries.every(validateEntry)) {
    throw new Error('One or more garden entries are invalid.');
  }
  return { version: SCHEMA_VERSION, entries: value.entries };
}

export function loadEntries(storage) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
    if (!raw) return { entries: [], warning: null };
    const payload = validateGardenPayload(JSON.parse(raw));
    return { entries: payload.entries, warning: null };
  } catch (error) {
    return {
      entries: [],
      warning: 'Your saved garden could not be read, so a fresh garden was opened instead.'
    };
  }
}

export function saveEntries(storage, entries) {
  try {
    const payload = validateGardenPayload({ version: SCHEMA_VERSION, entries });
    storage?.setItem?.(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true, warning: null };
  } catch (error) {
    return {
      ok: false,
      warning: 'This garden could not be saved in your browser. Your current session is still visible.'
    };
  }
}

export function serializeGarden(entries) {
  const payload = validateGardenPayload({ version: SCHEMA_VERSION, entries });
  return JSON.stringify(
    {
      version: payload.version,
      exportedAt: new Date().toISOString(),
      entries: payload.entries
    },
    null,
    2
  );
}

export function parseGardenImport(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(String(jsonText));
  } catch (error) {
    throw new Error('The selected file is not valid JSON.');
  }

  return validateGardenPayload(parsed).entries;
}
