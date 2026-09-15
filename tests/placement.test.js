import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenSimilarity, choosePlantPosition, hasCollision } from '../js/placement.js';

test('scores token overlap with Jaccard similarity', () => {
  assert.equal(tokenSimilarity(['paper', 'research'], ['paper', 'writing']), 1 / 3);
  assert.equal(tokenSimilarity([], ['paper']), 0);
});

test('places a related thought near its closest match', () => {
  const entries = [
    { id: 'a', topicTokens: ['paper', 'research'], x: 0.25, style: { width: 0.08 } },
    { id: 'b', topicTokens: ['garden', 'plants'], x: 0.75, style: { width: 0.08 } }
  ];
  const x = choosePlantPosition({ topicTokens: ['paper', 'writing'], entries, seed: 42 });
  assert.ok(x >= 0.08 && x <= 0.92);
  assert.ok(Math.abs(x - 0.25) < Math.abs(x - 0.75));
});

test('avoids a direct mature-plant collision when alternatives exist', () => {
  const entries = [{ id: 'a', topicTokens: ['paper'], x: 0.5, style: { width: 0.12 } }];
  const x = choosePlantPosition({ topicTokens: ['unrelated'], entries, seed: 7 });
  assert.equal(hasCollision(x, 0.08, entries), false);
});
