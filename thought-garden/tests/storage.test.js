import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  loadEntries,
  saveEntries,
  serializeGarden,
  parseGardenImport,
  validateEntry
} from '../js/storage.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
}

const validEntry = {
  id: 'entry-1',
  createdAt: '2026-09-15T12:00:00.000Z',
  text: 'Today felt calm.',
  features: { wordCount: 3, sentenceCount: 1, exclamationCount: 0, questionCount: 0, positiveScore: 0, negativeScore: 0, calmScore: 1, energeticScore: 0 },
  topicTokens: ['today', 'felt', 'calm'],
  seed: 123,
  x: 0.5,
  style: { height: 0.3, width: 0.08, branchCount: 2, leafRoundness: 0.8, sway: 0.2, asymmetry: 0, bloomOpenness: 0.6, bloomTilt: 0, paletteIndex: 0, petalCount: 6 }
};

test('round-trips valid entries through storage', () => {
  const storage = memoryStorage();
  assert.equal(saveEntries(storage, [validEntry]).ok, true);
  assert.deepEqual(loadEntries(storage).entries, [validEntry]);
  assert.ok(storage.getItem(STORAGE_KEY));
});

test('ignores malformed saved data without throwing', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{bad json' });
  const result = loadEntries(storage);
  assert.deepEqual(result.entries, []);
  assert.ok(result.warning);
});

test('rejects an incompatible import without returning partial entries', () => {
  assert.throws(() => parseGardenImport(JSON.stringify({ version: 99, entries: [validEntry] })), /version/i);
});

test('exports a schema-versioned payload', () => {
  const parsed = JSON.parse(serializeGarden([validEntry]));
  assert.equal(parsed.version, 1);
  assert.equal(parsed.entries.length, 1);
  assert.equal(validateEntry(parsed.entries[0]), true);
});

test('rejects invalid entries before saving', () => {
  const storage = memoryStorage();
  const invalid = { ...validEntry, text: 'x'.repeat(501) };
  const result = saveEntries(storage, [invalid]);
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
