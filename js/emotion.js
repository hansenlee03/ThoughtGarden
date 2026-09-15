const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'hers', 'him', 'his',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or',
  'our', 'ours', 'she', 'so', 'that', 'the', 'their', 'theirs', 'them',
  'they', 'this', 'to', 'us', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'with', 'you', 'your', 'yours'
]);

const POSITIVE_WORDS = new Set([
  'amazing', 'better', 'bright', 'confident', 'excited', 'glad', 'good',
  'great', 'happy', 'hope', 'hopeful', 'joy', 'joyful', 'love', 'proud',
  'relieved', 'success', 'thankful', 'wonderful'
]);

const NEGATIVE_WORDS = new Set([
  'afraid', 'angry', 'anxious', 'bad', 'confused', 'disappointed', 'down',
  'frustrated', 'hard', 'hurt', 'lonely', 'lost', 'overwhelmed', 'sad',
  'scared', 'stressed', 'tired', 'uncertain', 'upset', 'worried'
]);

const CALM_WORDS = new Set([
  'calm', 'centered', 'gentle', 'grounded', 'peace', 'peaceful', 'quiet',
  'reflect', 'reflecting', 'reflective', 'rest', 'settled', 'slow', 'still'
]);

const ENERGETIC_WORDS = new Set([
  'active', 'alive', 'bold', 'busy', 'energized', 'energetic', 'excited',
  'fast', 'go', 'moving', 'ready', 'strong', 'thrilled', 'vibrant', 'wild'
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [])
    .map(token => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

function lexicalScore(words, vocabulary) {
  const matches = words.reduce((count, word) => count + (vocabulary.has(word) ? 1 : 0), 0);
  return Math.min(1, matches / Math.max(1, words.length * 0.25));
}

export function normalizeTopicTokens(text) {
  const seen = new Set();
  const tokens = [];

  for (const token of tokenize(text)) {
    if (token.length < 3 || STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

export function analyzeThought(text) {
  const normalizedText = String(text ?? '').trim().replace(/\s+/g, ' ');
  const words = tokenize(normalizedText);
  const terminalGroups = normalizedText.match(/[.!?]+/g) ?? [];

  return {
    normalizedText,
    characterCount: normalizedText.length,
    wordCount: words.length,
    sentenceCount: normalizedText ? Math.max(1, terminalGroups.length) : 0,
    exclamationCount: (normalizedText.match(/!/g) ?? []).length,
    questionCount: (normalizedText.match(/\?/g) ?? []).length,
    positiveScore: lexicalScore(words, POSITIVE_WORDS),
    negativeScore: lexicalScore(words, NEGATIVE_WORDS),
    calmScore: lexicalScore(words, CALM_WORDS),
    energeticScore: lexicalScore(words, ENERGETIC_WORDS),
    topicTokens: normalizeTopicTokens(normalizedText)
  };
}
