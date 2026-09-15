# Thought Garden V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished static Thought Garden web app where locally entered thoughts become deterministic animated plants, cluster near related thoughts, persist in the browser, and can be revisited, exported, imported, and cleared.

**Architecture:** The site is a no-build static application using HTML, CSS, ES modules, and p5.js from a pinned CDN. Pure logic is isolated in `emotion.js`, `placement.js`, `plant.js`, and `storage.js` so it can be unit-tested with Node's built-in test runner, while `garden.js` and `app.js` coordinate rendering and DOM interaction.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, p5.js 1.11.1 via jsDelivr, Node.js built-in `node:test`, browser `localStorage`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-15-thought-garden-design.md`

## Global Constraints

- Static GitHub Pages app with no backend, account, API key, build step, or remote AI service.
- All thought processing and persistence stay in the browser.
- Maximum thought length is exactly 500 characters.
- Data is stored under `thoughtGarden.entries.v1` using schema version `1`.
- Stored plants reconstruct deterministically from saved features, seed, location, and style parameters.
- Related thoughts use lightweight topic-token overlap only, with collision avoidance.
- Historical plants load mature; only newly submitted thoughts replay growth.
- Main controls and plants must be keyboard accessible.
- `prefers-reduced-motion` skips growth and minimizes ambient motion.
- Malformed storage/import data must not crash the app or partially overwrite existing data.
- All asset paths must be relative so the root can publish directly to a project GitHub Pages URL.
- p5.js is pinned to `1.11.1` and loaded from `https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.min.js`.

---

## File Map

- `index.html`: semantic application shell, composer, settings, notices, detail dialog, hidden import input, accessible plant-controls layer, p5 loading.
- `css/style.css`: atmospheric full-screen visual design, responsive layout, focus states, dialogs, notices, reduced-motion adjustments.
- `js/emotion.js`: normalization, lexical feature extraction, topic tokens, feature clamping.
- `js/placement.js`: token-overlap similarity, cluster selection, deterministic candidate generation, collision avoidance.
- `js/plant.js`: deterministic plant-style derivation from features/seed plus `Plant` rendering and hit bounds.
- `js/storage.js`: versioned entry validation, safe localStorage reads/writes, export/import parsing.
- `js/garden.js`: p5 sketch, terrain, particles, plant collection, growth lifecycle, pointer hit-testing, resize handling.
- `js/app.js`: application orchestration, form handling, persistence, dialogs, import/export/clear, accessibility layer synchronization.
- `tests/emotion.test.js`: text-analysis and topic-token unit tests.
- `tests/placement.test.js`: similarity, bounds, clustering, and collision tests.
- `tests/plant.test.js`: deterministic plant-style parameter tests.
- `tests/storage.test.js`: schema, localStorage, import/export, and failure-mode tests.
- `package.json`: ES module declaration and test script only; no runtime/build dependencies.
- `.gitignore`: local editor/system artifacts and test output exclusions.
- `README.md`: project explanation, privacy, local run steps, GitHub Pages deployment, test instructions.
- `LICENSE`: MIT license.

---

### Task 1: Project Shell and Text Analysis

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `js/emotion.js`
- Create: `tests/emotion.test.js`

**Interfaces:**
- Produces: `analyzeThought(text: string) -> { normalizedText, characterCount, wordCount, sentenceCount, exclamationCount, questionCount, positiveScore, negativeScore, calmScore, energeticScore, topicTokens }`
- Produces: `normalizeTopicTokens(text: string) -> string[]`
- Later tasks consume the returned feature object directly.

- [ ] **Step 1: Create the Node test shell and write failing text-analysis tests**

```json
{
  "name": "thought-garden",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

```js
// tests/emotion.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeThought, normalizeTopicTokens } from '../js/emotion.js';

test('extracts bounded structural and lexical features', () => {
  const result = analyzeThought('I feel calm and proud today! What comes next?');
  assert.equal(result.wordCount, 10);
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
```

- [ ] **Step 2: Run tests and confirm the module is missing**

Run: `npm test -- --test-name-pattern="text-analysis|extracts|normalizes|finite"`
Expected: FAIL because `js/emotion.js` does not exist.

- [ ] **Step 3: Implement minimal deterministic local text analysis**

Implement `js/emotion.js` with:
- lowercase Unicode-safe word tokenization,
- sentence counting using terminal punctuation with a one-sentence fallback for non-empty input,
- exact punctuation counts,
- small internal positive/negative/calm/energetic vocabularies,
- lexical scores as `Math.min(1, matches / Math.max(1, words.length * 0.25))`,
- topic-token de-duplication preserving first occurrence,
- stop-word removal and tokens shorter than three characters filtered out,
- no labels such as "positive" or "negative" exposed to the UI.

- [ ] **Step 4: Run the complete Task 1 tests**

Run: `npm test -- tests/emotion.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add package.json .gitignore js/emotion.js tests/emotion.test.js
git commit -m "feat: add local thought analysis"
```

---

### Task 2: Related-Thought Placement

**Files:**
- Create: `js/placement.js`
- Create: `tests/placement.test.js`

**Interfaces:**
- Consumes existing entries shaped as `{ id, topicTokens, x, style: { width } }`.
- Produces: `tokenSimilarity(a: string[], b: string[]) -> number` using Jaccard overlap.
- Produces: `choosePlantPosition({ topicTokens, entries, seed }) -> number` returning normalized x in `[0.08, 0.92]`.
- Produces: `hasCollision(x, width, entries) -> boolean` for testable collision checks.

- [ ] **Step 1: Write failing placement tests**

```js
// tests/placement.test.js
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
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/placement.test.js`
Expected: FAIL because `js/placement.js` does not exist.

- [ ] **Step 3: Implement similarity and collision-aware placement**

Implement:
- Jaccard similarity on unique token sets,
- related threshold `>= 0.2`,
- related candidates centered around the best entry with deterministic offsets from seed,
- unrelated candidates sampled across `[0.08, 0.92]`,
- up to 24 deterministic candidates,
- collision test based on normalized half-width plus `0.025` spacing,
- final fallback choosing the candidate with greatest minimum distance when every candidate collides.

- [ ] **Step 4: Run placement tests**

Run: `npm test -- tests/placement.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add js/placement.js tests/placement.test.js
git commit -m "feat: cluster related thoughts in the garden"
```

---

### Task 3: Deterministic Plant Style Parameters

**Files:**
- Create: `js/plant.js`
- Create: `tests/plant.test.js`

**Interfaces:**
- Consumes the `analyzeThought()` feature object and integer seed.
- Produces: `derivePlantStyle(features, seed) -> { height, width, branchCount, leafRoundness, sway, asymmetry, bloomOpenness, bloomTilt, paletteIndex, petalCount }`.
- Produces: `seedFromString(value: string) -> number` for deterministic integer seeds.
- Produces browser-only `Plant` class used by `garden.js`, without importing storage or application UI modules.

- [ ] **Step 1: Write failing deterministic-style tests**

```js
// tests/plant.test.js
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
});

test('hashes the same string to the same unsigned seed', () => {
  assert.equal(seedFromString('same thought'), seedFromString('same thought'));
  assert.ok(seedFromString('same thought') >= 0);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/plant.test.js`
Expected: FAIL because style functions are not implemented.

- [ ] **Step 3: Implement plant-style derivation and the browser rendering class**

Implement pure helpers first:
- deterministic Mulberry32 PRNG seeded by unsigned integer,
- word count maps height within `[0.22, 0.52]`,
- sentence count maps branches `1..6`,
- question marks increase asymmetry,
- exclamation/positive scores increase bloom openness,
- calm lowers sway and raises leaf roundness,
- energetic raises height/sway,
- negative score can increase downward bloom tilt without any UI label,
- seeded noise chooses palette and petal count.

Then add `Plant` class methods:
- `constructor(entry, { mature = true } = {})`,
- `update(now, reducedMotion)`,
- `draw(p, groundY, now, reducedMotion)`,
- `contains(px, py, width, height, groundY)`,
- `getScreenBounds(width, height, groundY)`.

The class must not reference `window`, `localStorage`, dialogs, or application state at module initialization so Node can import the pure functions in tests.

- [ ] **Step 4: Run plant tests and the full suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add js/plant.js tests/plant.test.js
git commit -m "feat: derive deterministic plant designs"
```

---

### Task 4: Versioned Local Persistence and Data Portability

**Files:**
- Create: `js/storage.js`
- Create: `tests/storage.test.js`

**Interfaces:**
- Produces: `STORAGE_KEY = 'thoughtGarden.entries.v1'` and `SCHEMA_VERSION = 1`.
- Produces: `validateEntry(value) -> boolean`.
- Produces: `validateGardenPayload(value) -> { version: 1, entries: Entry[] }` or throws `Error`.
- Produces: `loadEntries(storage) -> { entries, warning }`.
- Produces: `saveEntries(storage, entries) -> { ok, warning }`.
- Produces: `serializeGarden(entries) -> string`.
- Produces: `parseGardenImport(jsonText) -> Entry[]` without mutating storage.

- [ ] **Step 1: Write failing storage tests with an in-memory storage double**

```js
// tests/storage.test.js
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
```

- [ ] **Step 2: Run storage tests and verify failure**

Run: `npm test -- tests/storage.test.js`
Expected: FAIL because `js/storage.js` does not exist.

- [ ] **Step 3: Implement strict schema validation and safe storage adapters**

Requirements:
- require every persisted field from the spec,
- require finite numeric style values and normalized `x` in `[0,1]`,
- reject thoughts above 500 characters,
- `loadEntries` catches JSON/storage errors and returns empty entries plus warning,
- `saveEntries` catches quota/security errors and returns `{ ok: false, warning }`,
- `parseGardenImport` parses and validates the entire payload before returning entries,
- `serializeGarden` emits `{ version: 1, exportedAt, entries }` with readable two-space JSON.

- [ ] **Step 4: Run all storage and regression tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: persist and transfer local gardens"
```

---

### Task 5: Garden Renderer and Growth Lifecycle

**Files:**
- Create: `js/garden.js`
- Modify: `js/plant.js`
- Create: `index.html`

**Interfaces:**
- Consumes persisted `Entry[]` and the `Plant` class.
- Produces: `Garden` class with `setEntries(entries)`, `addEntry(entry, { animate })`, `removeAll()`, `findPlantAt(x,y)`, `resize()`, `setReducedMotion(value)`, and `getPlants()`.
- Calls optional callbacks supplied by `app.js`: `onPlantActivate(entry)` and `onPlantVisualChange()`.

- [ ] **Step 1: Create semantic HTML shell and a renderer smoke fixture**

`index.html` must include:
- `<main id="app">`,
- `#garden-canvas` container,
- form `#thought-form` with `#thought-input`, live character counter, inline error, and `Plant it` button,
- settings/menu controls for Export, Import, Clear,
- `#privacy-note`,
- `#notice-region` with `aria-live="polite"`,
- `#plant-accessibility-layer`,
- native `<dialog id="thought-dialog">`,
- hidden file input accepting `.json,application/json`,
- p5 script pinned to `1.11.1`,
- `<script type="module" src="./js/app.js"></script>`.

Initially show a `<noscript>` explanation and a hidden `#p5-error` notice that `app.js` can reveal if `window.p5` is absent.

- [ ] **Step 2: Implement `garden.js` around an instance-mode p5 sketch**

Required renderer behavior:
- size canvas to the container and respond to resize,
- dusk vertical gradient and low curved terrain,
- subtle deterministic ambient particles,
- render mature loaded plants immediately,
- newly added plants use `Plant` growth progress across 4.8 seconds,
- reduced-motion newly added plants become mature immediately and particles remain nearly static,
- pointer movement updates hovered plant,
- pointer click calls `onPlantActivate(entry)` when a plant is hit,
- renderer never reads/writes localStorage or manipulates dialogs.

- [ ] **Step 3: Add runtime p5 failure handling**

In `app.js` bootstrap code, before constructing `Garden`, check `typeof window.p5 === 'function'`. If false, reveal `#p5-error`, keep the composer disabled, and do not throw.

- [ ] **Step 4: Run unit regressions and syntax checks**

Run: `npm test`
Expected: all tests PASS.

Run: `node --check js/garden.js && node --check js/plant.js && node --check js/app.js 2>/dev/null || true`
Expected at this task boundary: `garden.js` and `plant.js` parse; `app.js` may not exist until Task 6.

- [ ] **Step 5: Commit Task 5**

```bash
git add index.html js/garden.js js/plant.js
git commit -m "feat: render animated thought garden"
```

---

### Task 6: Application Orchestration, Accessibility, Import/Export, and Clear

**Files:**
- Create: `js/app.js`
- Modify: `index.html`
- Modify: `js/garden.js`

**Interfaces:**
- Consumes all pure modules plus `Garden`.
- No new public module interface required beyond browser bootstrap.

- [ ] **Step 1: Implement thought submission end-to-end**

Flow must be exactly:
1. trim input,
2. reject empty text inline,
3. reject >500 characters inline,
4. `analyzeThought(text)`,
5. generate id from `crypto.randomUUID()` with timestamp/random fallback,
6. generate deterministic unsigned seed from id + text,
7. derive style,
8. choose normalized x from current entries,
9. construct entry with ISO `createdAt`,
10. add the plant with animation unless reduced motion,
11. persist the complete new entries array,
12. if persistence fails, keep the session plant and show a non-blocking warning,
13. clear/fade the composer input and restore usability immediately.

- [ ] **Step 2: Synchronize a parallel accessible plant layer**

For every plant create/update an absolutely positioned transparent `<button>` in `#plant-accessibility-layer` using current screen bounds from `Garden`.

Each button must:
- use an `aria-label` beginning `Thought planted <localized date>:` plus a short excerpt,
- show the same hover/focus tooltip as pointer hover,
- open the thought dialog on click/Enter/Space,
- retain visible keyboard focus styling via a high-contrast outline/glow.

- [ ] **Step 3: Implement thought dialog behavior**

Use native `dialog.showModal()` with:
- full text,
- formatted planting date/time,
- close button,
- Escape behavior provided by dialog,
- backdrop click closing only when the pointer target is the dialog itself.

- [ ] **Step 4: Implement export/import without partial overwrite**

Export:
- call `serializeGarden(entries)`,
- create a JSON `Blob`,
- download filename `thought-garden-YYYY-MM-DD.json`,
- revoke object URL after click.

Import:
- read selected file as text,
- call `parseGardenImport(text)` before any mutation,
- ask `window.confirm('Replace your current garden with this imported garden?')`,
- only after confirmation call `saveEntries`, replace session entries, and call `garden.setEntries`,
- if validation or save fails, show a plain-language notice and leave existing garden untouched.

- [ ] **Step 5: Implement clear and startup recovery**

On startup:
- call `loadEntries(window.localStorage)`,
- show warning if returned,
- reconstruct loaded entries mature,
- watch `matchMedia('(prefers-reduced-motion: reduce)')` and update Garden on changes.

Clear:
- require `window.confirm('Clear every thought from this browser? This cannot be undone unless you exported a backup.')`,
- save empty entries first,
- only clear the visible garden after successful save,
- show warning and retain current session state if the save fails.

- [ ] **Step 6: Run syntax and unit verification**

Run: `node --check js/app.js && node --check js/garden.js && npm test`
Expected: syntax checks succeed and all unit tests PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add index.html js/app.js js/garden.js
git commit -m "feat: connect journaling interactions and accessibility"
```

---

### Task 7: Visual Design, Responsive Polish, Documentation, and Deployment Readiness

**Files:**
- Create: `css/style.css`
- Modify: `index.html`
- Create: `README.md`
- Create: `LICENSE`

**Interfaces:**
- No new JavaScript interfaces.

- [ ] **Step 1: Implement the atmospheric visual system**

`css/style.css` requirements:
- full-viewport app with deep dusk backdrop and translucent controls,
- composer centered near the lower portion without obscuring mature plants,
- serif/display treatment for the title and clean system font for controls,
- subtle borders, shadows, and backdrop blur,
- responsive composer width using `min(92vw, 680px)`,
- `:focus-visible` states for every interactive control,
- dialog and tooltip readable at narrow viewport widths,
- mobile settings actions remain reachable without horizontal overflow,
- reduced-motion media query disables CSS transitions/animations that are nonessential.

- [ ] **Step 2: Add empty-state copy and privacy messaging**

Visible copy should include:
- product title `Thought Garden`,
- primary prompt `What is on your mind?`,
- core line `Your thoughts do not disappear. They grow.`,
- privacy note `Your thoughts are analyzed and stored only in this browser. Nothing is sent to a server.`

Do not describe lexical cues as psychological, diagnostic, or therapeutic analysis.

- [ ] **Step 3: Write README and MIT license**

README sections:
- title + one-paragraph concept,
- live demo placeholder `https://hansenlee03.github.io/thought-garden/`,
- screenshot/GIF placeholder,
- how thoughts become plants,
- privacy explanation,
- local run: `python3 -m http.server 8000` then open `http://localhost:8000`,
- tests: `npm test`,
- GitHub Pages steps: Settings -> Pages -> Deploy from branch -> `main` / root,
- project structure,
- limitations/no clinical inference statement.

- [ ] **Step 4: Run full automated verification**

Run: `npm test`
Expected: all tests PASS.

Run: `node --check js/emotion.js && node --check js/placement.js && node --check js/plant.js && node --check js/storage.js && node --check js/garden.js && node --check js/app.js`
Expected: no syntax errors.

- [ ] **Step 5: Run a local HTTP smoke check**

Run:
```bash
python3 -m http.server 8000 >/tmp/thought-garden-http.log 2>&1 &
SERVER_PID=$!
sleep 1
curl -fsS http://127.0.0.1:8000/ | grep -q 'Thought Garden'
curl -fsS http://127.0.0.1:8000/js/app.js | grep -q 'Garden'
kill $SERVER_PID
```
Expected: both curl checks succeed.

- [ ] **Step 6: Confirm GitHub Pages relative-path safety**

Run:
```bash
! grep -RInE '(src|href)="/' index.html css js README.md
```
Expected: exit status `0`, confirming no root-relative static paths are present.

- [ ] **Step 7: Commit Task 7**

```bash
git add css/style.css index.html README.md LICENSE
git commit -m "docs: polish Thought Garden for GitHub Pages"
```

---

## Final Manual Acceptance Checklist

- [ ] First load shows an empty atmospheric garden and enabled composer when p5 loads.
- [ ] Empty and >500-character submissions show inline errors.
- [ ] New thought visibly grows in approximately 4–6 seconds in normal-motion mode.
- [ ] Reload reconstructs previously stored plants mature.
- [ ] Related topic tokens visibly bias new plants toward related plants without heavy overlap.
- [ ] Pointer and keyboard activation both open the full thought detail dialog.
- [ ] Export then import restores the same entry data.
- [ ] Invalid import leaves the current garden unchanged.
- [ ] Clear garden requires confirmation.
- [ ] Reduced-motion mode skips growth and minimizes ambient motion.
- [ ] Mobile layout remains usable at 390 CSS pixels wide.
- [ ] Thought text is never sent to a remote API; only the pinned p5 library is loaded remotely.
- [ ] Site loads correctly from a project path such as `/thought-garden/` because all project assets use relative URLs.

## Plan Self-Review

- Spec coverage: all sixteen design sections map to Tasks 1–7 or the final acceptance checklist.
- Placeholder scan: no implementation TODO/TBD instructions remain; README intentionally contains only the future public demo URL specified by the project design.
- Interface consistency: `analyzeThought`, `choosePlantPosition`, `derivePlantStyle`, `Garden`, and storage function names are stable across all consuming tasks.
- Scope: remains one static client-side application with no independent backend or cloud subsystem.
