import test from 'node:test';
import assert from 'node:assert/strict';
import * as plantModule from '../js/plant.js';

const { derivePlantStyle, seedFromString } = plantModule;

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

test('assigns flower, mushroom, and sprout forms deterministically from the seed', () => {
  assert.equal(typeof plantModule.plantFormFromSeed, 'function');
  const forms = [0, 1, 2].map(seed => plantModule.plantFormFromSeed(seed));
  assert.deepEqual(forms, ['flower', 'mushroom', 'sprout']);
  assert.equal(plantModule.plantFormFromSeed(42), plantModule.plantFormFromSeed(42));
});

test('hashes the same string to the same unsigned seed', () => {
  assert.equal(seedFromString('same thought'), seedFromString('same thought'));
  assert.ok(seedFromString('same thought') >= 0);
  assert.ok(seedFromString('same thought') <= 0xffffffff);
});

test('Plant instances use the seed-selected garden form', async () => {
  const { Plant } = plantModule;
  const style = derivePlantStyle(features, 1234);
  assert.equal(new Plant({ id: 'f', text: 'f', x: 0.2, seed: 0, style }).form, 'flower');
  assert.equal(new Plant({ id: 'm', text: 'm', x: 0.5, seed: 1, style }).form, 'mushroom');
  assert.equal(new Plant({ id: 's', text: 's', x: 0.8, seed: 2, style }).form, 'sprout');
});

test('draws a mature flower with the native Canvas 2D API', async () => {
  const { Plant } = await import('../js/plant.js');
  const style = derivePlantStyle(features, 1234);
  const entry = { id: 'plant-1', text: 'A thought', x: 0.5, seed: 0, style };
  const calls = [];
  const ctx = new Proxy({
    canvas: { width: 800, height: 600 },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText() { return { width: 0 }; }
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return target[prop];
      return (...args) => calls.push([prop, ...args]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });

  const plant = new Plant(entry, { mature: true });
  assert.doesNotThrow(() => plant.draw(ctx, {
    width: 800,
    height: 600,
    groundY: 468,
    now: 1000,
    reducedMotion: true
  }));
  assert.ok(calls.some(([name]) => name === 'bezierCurveTo'));
  assert.ok(calls.some(([name]) => name === 'ellipse'));
});

test('draws mushrooms and sprouts with distinct silhouettes', () => {
  const { Plant } = plantModule;
  const style = derivePlantStyle(features, 1234);

  function drawCalls(seed) {
    const calls = [];
    const ctx = new Proxy({
      canvas: { width: 800, height: 600 }
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return target[prop];
        return (...args) => calls.push([prop, ...args]);
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });
    new Plant({ id: `p-${seed}`, text: 'A thought', x: 0.5, seed, style }, { mature: true }).draw(ctx, {
      width: 800,
      height: 600,
      groundY: 468,
      now: 1000,
      reducedMotion: true
    });
    return calls.map(([name]) => name);
  }

  const mushroomCalls = drawCalls(1);
  const sproutCalls = drawCalls(2);

  assert.ok(mushroomCalls.includes('quadraticCurveTo'));
  assert.ok(sproutCalls.includes('ellipse'));
  assert.ok(!sproutCalls.includes('quadraticCurveTo'));
});
