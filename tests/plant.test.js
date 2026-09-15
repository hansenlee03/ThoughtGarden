import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePlantStyle, seedFromString } from '../js/plant.js';

const features = {
  wordCount: 18,
  sentenceCount: 2,
  exclamationCount: 1,
  questionCount: 1,
  positiveScore: 0.6,
  negativeScore: 0.1,
  calmScore: 0.4,
  energeticScore: 0.5
};

test('creates the same plant style from the same features and seed', () => {
  assert.deepEqual(derivePlantStyle(features, 1234), derivePlantStyle(features, 1234));
});

test('keeps all plant parameters inside attractive bounds', () => {
  const style = derivePlantStyle(features, 1234);
  assert.ok(style.height >= 0.22 && style.height <= 0.52);
  assert.ok(style.width >= 0.055 && style.width <= 0.14);
  assert.ok(style.branchCount >= 1 && style.branchCount <= 6);
  assert.ok(style.bloomOpenness >= 0.2 && style.bloomOpenness <= 1);
  assert.ok(style.sway >= 0.15 && style.sway <= 1);
  assert.ok(style.leafRoundness >= 0.35 && style.leafRoundness <= 1);
  assert.ok(Number.isInteger(style.paletteIndex));
  assert.ok(Number.isInteger(style.petalCount));
});

test('hashes the same string to the same unsigned seed', () => {
  assert.equal(seedFromString('same thought'), seedFromString('same thought'));
  assert.ok(seedFromString('same thought') >= 0);
  assert.ok(seedFromString('same thought') <= 0xffffffff);
});
