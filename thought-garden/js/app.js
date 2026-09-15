import { analyzeThought } from './emotion.js';
import { choosePlantPosition } from './placement.js';
import { derivePlantStyle, seedFromString } from './plant.js';
import { loadEntries, saveEntries, serializeGarden, parseGardenImport } from './storage.js';
import { Garden } from './garden.js';

const MAX_LENGTH = 500;

const els = {
  canvas: document.querySelector('#garden-canvas'),
  form: document.querySelector('#thought-form'),
  input: document.querySelector('#thought-input'),
  error: document.querySelector('#input-error'),
  count: document.querySelector('#char-count'),
  plantButton: document.querySelector('#plant-button'),
  accessLayer: document.querySelector('#plant-accessibility-layer'),
  tooltip: document.querySelector('#tooltip'),
  notice: document.querySelector('#notice-region'),
  p5Error: document.querySelector('#p5-error'),
  dialog: document.querySelector('#thought-dialog'),
  dialogDate: document.querySelector('#dialog-date'),
  dialogText: document.querySelector('#dialog-text'),
  dialogClose: document.querySelector('#dialog-close'),
  exportButton: document.querySelector('#export-button'),
  importButton: document.querySelector('#import-button'),
  importFile: document.querySelector('#import-file'),
  clearButton: document.querySelector('#clear-button')
};

let entries = [];
let garden = null;
let noticeTimer = null;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function showNotice(message, { error = false } = {}) {
  clearTimeout(noticeTimer);
  els.notice.textContent = message;
  els.notice.classList.toggle('error', error);
  els.notice.hidden = false;
  noticeTimer = setTimeout(() => { els.notice.hidden = true; }, 5200);
}

function excerpt(text, max = 72) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso));
}

function createId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `thought-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openThought(entry) {
  els.dialogDate.textContent = formatDate(entry.createdAt);
  els.dialogText.textContent = entry.text;
  if (!els.dialog.open) els.dialog.showModal();
}

function positionTooltip(entry, bounds) {
  if (!entry || !bounds) {
    els.tooltip.hidden = true;
    return;
  }
  els.tooltip.innerHTML = `<strong>${formatDate(entry.createdAt)}</strong><span>${escapeHtml(excerpt(entry.text))}</span>`;
  els.tooltip.style.left = `${bounds.left + bounds.width / 2}px`;
  els.tooltip.style.top = `${Math.max(12, bounds.top - 8)}px`;
  els.tooltip.hidden = false;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[ch]);
}

function syncAccessibilityLayer() {
  if (!garden) return;
  const activeId = document.activeElement?.dataset?.entryId;
  els.accessLayer.replaceChildren();

  for (const plant of garden.getPlants()) {
    const bounds = garden.getPlantScreenBounds(plant);
    if (!bounds) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'plant-access-button';
    button.dataset.entryId = plant.entry.id;
    button.style.left = `${bounds.left}px`;
    button.style.top = `${bounds.top}px`;
    button.style.width = `${bounds.width}px`;
    button.style.height = `${bounds.height}px`;
    button.setAttribute('aria-label', `Thought planted ${formatDate(plant.entry.createdAt)}: ${excerpt(plant.entry.text, 96)}`);
    button.addEventListener('click', () => openThought(plant.entry));
    button.addEventListener('focus', () => positionTooltip(plant.entry, bounds));
    button.addEventListener('blur', () => { els.tooltip.hidden = true; });
    button.addEventListener('mouseenter', () => positionTooltip(plant.entry, bounds));
    button.addEventListener('mouseleave', () => { if (document.activeElement !== button) els.tooltip.hidden = true; });
    els.accessLayer.append(button);
    if (activeId === plant.entry.id) button.focus({ preventScroll: true });
  }

  const hovered = garden.hoveredPlant;
  if (hovered && !els.accessLayer.contains(document.activeElement)) {
    positionTooltip(hovered.entry, garden.getPlantScreenBounds(hovered));
  }
}

function updateCount() {
  els.count.textContent = `${els.input.value.length} / ${MAX_LENGTH}`;
}

function validateThought(text) {
  if (!text.trim()) return 'Write something before planting it.';
  if (text.length > MAX_LENGTH) return `Keep your thought under ${MAX_LENGTH} characters.`;
  return null;
}

function persist(nextEntries) {
  const result = saveEntries(window.localStorage, nextEntries);
  if (!result.ok) showNotice(result.warning, { error: true });
  return result.ok;
}

function handleSubmit(event) {
  event.preventDefault();
  const text = els.input.value.trim();
  const validation = validateThought(text);
  els.error.textContent = validation ?? '';
  if (validation) return;

  const features = analyzeThought(text);
  const id = createId();
  const seed = seedFromString(`${id}:${text}`);
  const style = derivePlantStyle(features, seed);
  const x = choosePlantPosition({ topicTokens: features.topicTokens, entries, seed });
  const entry = {
    id,
    createdAt: new Date().toISOString(),
    text,
    features: {
      wordCount: features.wordCount,
      sentenceCount: features.sentenceCount,
      exclamationCount: features.exclamationCount,
      questionCount: features.questionCount,
      positiveScore: features.positiveScore,
      negativeScore: features.negativeScore,
      calmScore: features.calmScore,
      energeticScore: features.energeticScore
    },
    topicTokens: features.topicTokens,
    seed,
    x,
    style
  };

  entries = [...entries, entry];
  garden.addEntry(entry, { animate: !reducedMotionQuery.matches });
  persist(entries);
  els.input.value = '';
  updateCount();
  els.input.focus();
  syncAccessibilityLayer();
}

function exportGarden() {
  try {
    const blob = new Blob([serializeGarden(entries)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `thought-garden-${date}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showNotice('Garden exported.');
  } catch (error) {
    showNotice('The garden could not be exported.', { error: true });
  }
}

async function importGarden(file) {
  if (!file) return;
  try {
    const imported = parseGardenImport(await file.text());
    if (!window.confirm('Replace your current garden with this imported garden?')) return;
    const result = saveEntries(window.localStorage, imported);
    if (!result.ok) {
      showNotice(result.warning, { error: true });
      return;
    }
    entries = imported;
    garden.setEntries(entries);
    syncAccessibilityLayer();
    showNotice('Garden imported.');
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'This garden file could not be imported.', { error: true });
  } finally {
    els.importFile.value = '';
  }
}

function clearGarden() {
  if (!entries.length) {
    showNotice('Your garden is already empty.');
    return;
  }
  if (!window.confirm('Clear every thought from this browser? This cannot be undone unless you exported a backup.')) return;
  const result = saveEntries(window.localStorage, []);
  if (!result.ok) {
    showNotice(result.warning, { error: true });
    return;
  }
  entries = [];
  garden.removeAll();
  syncAccessibilityLayer();
  showNotice('Garden cleared.');
}

function bindEvents() {
  els.form.addEventListener('submit', handleSubmit);
  els.input.addEventListener('input', () => {
    updateCount();
    if (els.error.textContent) els.error.textContent = '';
  });
  els.dialogClose.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', event => {
    if (event.target === els.dialog) els.dialog.close();
  });
  els.exportButton.addEventListener('click', exportGarden);
  els.importButton.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', () => importGarden(els.importFile.files?.[0]));
  els.clearButton.addEventListener('click', clearGarden);
  window.addEventListener('resize', () => requestAnimationFrame(syncAccessibilityLayer));
}

function bootstrap() {
  updateCount();
  bindEvents();

  if (typeof window.p5 !== 'function') {
    els.p5Error.hidden = false;
    els.input.disabled = true;
    els.plantButton.disabled = true;
    return;
  }

  const loaded = loadEntries(window.localStorage);
  entries = loaded.entries;
  if (loaded.warning) showNotice(loaded.warning, { error: true });

  garden = new Garden(els.canvas, {
    onPlantActivate: openThought,
    onPlantVisualChange: () => requestAnimationFrame(syncAccessibilityLayer)
  });
  garden.setReducedMotion(reducedMotionQuery.matches);
  garden.setEntries(entries);

  const motionListener = event => {
    garden.setReducedMotion(event.matches);
  };
  reducedMotionQuery.addEventListener?.('change', motionListener);
  reducedMotionQuery.addListener?.(motionListener);

  requestAnimationFrame(syncAccessibilityLayer);
}

bootstrap();
