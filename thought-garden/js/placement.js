const MIN_X = 0.08;
const MAX_X = 0.92;
const DEFAULT_WIDTH = 0.08;
const GAP = 0.025;
const RELATED_THRESHOLD = 0.2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tokenSimilarity(a, b) {
  const left = new Set(a ?? []);
  const right = new Set(b ?? []);
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

export function hasCollision(x, width = DEFAULT_WIDTH, entries = []) {
  return entries.some(entry => {
    const entryWidth = Number(entry?.style?.width) || DEFAULT_WIDTH;
    const minimumDistance = (width + entryWidth) / 2 + GAP;
    return Math.abs(x - Number(entry.x)) < minimumDistance;
  });
}

function minimumDistanceToEntries(x, entries) {
  if (!entries.length) return Infinity;
  return Math.min(...entries.map(entry => Math.abs(x - Number(entry.x))));
}

function bestRelatedEntry(topicTokens, entries) {
  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const score = tokenSimilarity(topicTokens, entry.topicTokens ?? []);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return bestScore >= RELATED_THRESHOLD ? best : null;
}

function relatedCandidates(anchorX, random) {
  const candidates = [];
  for (let i = 0; i < 24; i += 1) {
    const ring = Math.floor(i / 2) + 1;
    const direction = i % 2 === 0 ? 1 : -1;
    const jitter = (random() - 0.5) * 0.025;
    const offset = direction * (0.085 + ring * 0.022 + jitter);
    candidates.push(clamp(anchorX + offset, MIN_X, MAX_X));
  }
  return candidates;
}

function openCandidates(random) {
  const candidates = [];
  for (let i = 0; i < 24; i += 1) {
    const stratified = (i + random()) / 24;
    candidates.push(MIN_X + stratified * (MAX_X - MIN_X));
  }
  return candidates;
}

export function choosePlantPosition({ topicTokens = [], entries = [], seed = 1 }) {
  if (!entries.length) {
    const random = mulberry32(seed);
    return MIN_X + random() * (MAX_X - MIN_X);
  }

  const random = mulberry32(seed);
  const related = bestRelatedEntry(topicTokens, entries);
  const candidates = related
    ? relatedCandidates(Number(related.x), random)
    : openCandidates(random);

  for (const candidate of candidates) {
    if (!hasCollision(candidate, DEFAULT_WIDTH, entries)) return candidate;
  }

  return candidates.reduce((best, candidate) => {
    const distance = minimumDistanceToEntries(candidate, entries);
    return distance > best.distance ? { x: candidate, distance } : best;
  }, { x: clamp(candidates[0] ?? 0.5, MIN_X, MAX_X), distance: -1 }).x;
}
