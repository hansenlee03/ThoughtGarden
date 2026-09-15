import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeThought, normalizeTopicTokens } from '../js/emotion.js';

test('extracts bounded structural and lexical features', () => {
  const result = analyzeThought('I feel calm and proud today! What comes next?');
  assert.equal(result.wordCount, 9);
  assert.equal(result.sentenceCount, 2);
  assert.equal(result.exclamationCount, 1);
  assert.equal(result.questionCount, 1);
  assert.ok(result.positiveScore > 0);
  assert.ok(result.calmScore > 0);
  assert.ok(result.topicTokens.includes('calm'));
  assert.ok(result.topicTokens.includes('proud'));
});

test('normalizes topic tokens and removes common stop words', () => {
  assert.deepEqual(
    normalizeTopicTokens('The paper and the research paper are moving forward.'),
    ['paper', 'research', 'moving', 'forward']
  );
});

test('returns finite clamped lexical scores for repeated vocabulary', () => {
  const result = analyzeThought('great great great great great great great great great great');
  assert.ok(result.positiveScore >= 0 && result.positiveScore <= 1);
  assert.ok(result.negativeScore >= 0 && result.negativeScore <= 1);
  assert.ok(result.calmScore >= 0 && result.calmScore <= 1);
  assert.ok(result.energeticScore >= 0 && result.energeticScore <= 1);
});
