import test from 'node:test';
import assert from 'node:assert/strict';
import { Garden } from '../js/garden.js';

function fakeContext() {
  return {
    setTransform() {},
    createLinearGradient() { return { addColorStop() {} }; },
    fillRect() {}, beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, closePath() {},
    save() {}, restore() {}, stroke() {}, translate() {}, rotate() {}, ellipse() {}
  };
}

test('initializes the native canvas renderer without an external library', () => {
  const originalDocument = globalThis.document;
  const originalRaf = globalThis.requestAnimationFrame;
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    className: '',
    setAttribute() {},
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    getContext() { return fakeContext(); }
  };
  const container = {
    prepend(node) { assert.equal(node, canvas); },
    getBoundingClientRect() { return { width: 800, height: 600 }; }
  };

  globalThis.document = { createElement: () => canvas };
  globalThis.requestAnimationFrame = () => 1;

  try {
    assert.doesNotThrow(() => new Garden(container));
  } finally {
    globalThis.document = originalDocument;
    globalThis.requestAnimationFrame = originalRaf;
  }
});
