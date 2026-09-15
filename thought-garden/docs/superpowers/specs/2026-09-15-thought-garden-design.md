# Thought Garden Design

Date: 2026-09-15
Status: Proposed

## 1. Product concept

Thought Garden is a small, atmospheric, browser-based journaling experience. A user writes a short thought and plants it. The thought becomes a unique animated plant whose visual characteristics are derived from lightweight local text analysis. Over time, the page becomes a persistent personal garden.

The project is designed to run entirely as a static site on GitHub Pages. No backend, account, API key, or external AI service is required.

Core line: **Your thoughts do not disappear. They grow.**

## 2. Goals

- Create an immediately understandable and visually memorable interaction.
- Keep the first version small enough to understand, maintain, and host on GitHub Pages.
- Keep journal text private by processing and storing it locally in the browser.
- Make each planted thought feel meaningfully different without claiming psychological or clinical inference.
- Support revisiting prior thoughts through the garden itself rather than through a conventional list-first UI.

## 3. Non-goals for v1

- No login or cloud sync.
- No server-side database.
- No generative AI or remote sentiment API.
- No medical, therapeutic, or diagnostic interpretation.
- No social feed, sharing network, comments, or multiplayer garden.
- No complex semantic embeddings.

## 4. User experience

### Empty garden

The first visit opens to a dark, calm garden canvas with subtle ambient particles and a compact composer near the bottom center. The primary prompt is "What is on your mind?" with a multiline text field and a "Plant it" button.

### Planting interaction

When the user submits a valid thought:

1. The input gently collapses or fades back.
2. A glowing seed appears at the selected planting location.
3. The seed settles into the soil.
4. A stem grows upward over roughly 2–3 seconds.
5. Branches and leaves unfold.
6. The final flower or crown blooms.
7. The plant begins its idle wind animation.
8. The thought is persisted to local storage after the plant model is successfully created.

The complete animation should feel responsive and take roughly 4–6 seconds without blocking the rest of the interface.

### Revisiting thoughts

- Hovering or focusing a mature plant shows the planting date and a short excerpt.
- Clicking or activating the plant opens a small detail card containing the full thought and date.
- The detail card can be closed with the close control, Escape, or clicking outside it.

### Returning visits

Stored entries are reconstructed deterministically from their saved seeds and metadata. Plants appear mature on initial load rather than replaying every historical growth animation.

## 5. Visual language

The default look is calm, organic, and slightly magical rather than cartoonish.

- Full-screen garden with a deep dusk background.
- Ground line or low rolling terrain across the lower portion of the viewport.
- Very subtle floating particles for atmosphere.
- Plants use restrained, harmonious palettes.
- Gentle idle sway simulates wind.
- Glow is used sparingly for seeds, bloom moments, and hover/focus feedback.
- UI panels use translucent surfaces so the garden remains visually dominant.

The layout must remain usable on desktop and mobile.

## 6. Thought-to-plant mapping

The mapping is deterministic once an entry seed is generated. The system does not claim to infer a person's true emotional state. It derives broad visual cues from lexical and structural text features.

### Input features

Each thought is normalized locally and evaluated for:

- Character count
- Word count
- Sentence count
- Exclamation marks
- Question marks
- Positive-leaning vocabulary matches
- Negative-leaning vocabulary matches
- Calm/reflective vocabulary matches
- Energetic vocabulary matches
- Repeated content words for lightweight topic grouping

Stop words are excluded from topic tokens.

### Visual mappings

- Word count influences height.
- Sentence count influences branch count.
- Exclamation marks increase bloom openness and movement energy.
- Question marks increase branching asymmetry.
- Positive-leaning matches bias toward open blossoms.
- Calm/reflective matches bias toward slower sway and rounder leaf geometry.
- Energetic matches bias toward taller stems and stronger movement.
- Negative-leaning matches may produce more closed or downward-facing blooms, but never use negative labels in the UI.
- A per-entry pseudo-random seed controls fine-grained geometry so similar thoughts still produce distinct plants.

All dimensions are clamped to keep plants readable and attractive.

## 7. Lightweight clustering

Each saved thought stores a small set of normalized content tokens. When choosing a planting location, the app computes token overlap with existing entries.

- If overlap is above a modest threshold, the new plant is placed near the most related plant or cluster.
- If no meaningful overlap is found, the app chooses an open region of the garden.
- Spatial placement includes collision avoidance so mature plants do not heavily overlap.

This is intentionally lightweight and local. It provides a sense of related ideas growing together without semantic embedding infrastructure.

## 8. Persistence and privacy

Use `localStorage` under one namespaced key, e.g. `thoughtGarden.entries.v1`.

Each entry stores:

- id
- createdAt
- raw thought text
- derived feature summary
- topic tokens
- deterministic geometry seed
- normalized x-position / cluster anchor
- plant style parameters required for reconstruction

No text leaves the browser. A small privacy note in the UI states this clearly.

If stored data is malformed or unavailable, the app should fail safely by starting with an empty garden and showing a non-blocking notice.

## 9. Export and import

V1 includes simple data portability:

- Export downloads a JSON file containing the garden schema version and all entries.
- Import accepts only compatible JSON, validates the schema, and asks for confirmation before replacing the current garden.
- Import errors are shown in plain language and never partially overwrite existing data.

A "Clear garden" action is available in settings and requires confirmation.

## 10. Accessibility

- Composer, buttons, settings, and detail cards are keyboard accessible.
- Plants are focusable interactive elements with accessible labels such as "Thought planted September 15, 2026: Today I...".
- Hover-only information is also available on keyboard focus.
- Respect `prefers-reduced-motion`: skip growth animation and minimize wind/particle movement.
- Ensure sufficient text contrast in controls and detail panels.
- Canvas-only interactions must have a parallel DOM representation if needed for focus and accessible labels.

## 11. Architecture

V1 uses plain HTML, CSS, JavaScript modules, and p5.js loaded from a pinned CDN version.

Proposed structure:

```text
thought-garden/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── garden.js
│   ├── plant.js
│   ├── emotion.js
│   ├── placement.js
│   └── storage.js
├── tests/
│   ├── emotion.test.js
│   ├── placement.test.js
│   └── storage.test.js
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-09-15-thought-garden-design.md
├── README.md
├── LICENSE
└── .gitignore
```

### Module responsibilities

`app.js`
- Initializes UI and p5 sketch.
- Coordinates composer, modal/detail panel, settings, import/export, and garden events.

`garden.js`
- Owns the collection of plant instances.
- Coordinates rendering, ambient effects, hit-testing, focus metadata, resize behavior, and growth lifecycle.

`plant.js`
- Converts saved plant parameters into geometry.
- Draws growth states and mature idle animation.
- Exposes bounding/hit information without knowing about storage or UI panels.

`emotion.js`
- Pure text-processing functions.
- Produces a bounded feature object and topic tokens.
- Contains vocabulary dictionaries and no rendering logic.

`placement.js`
- Chooses normalized positions using token overlap, cluster proximity, and collision avoidance.
- Pure enough to unit test independently.

`storage.js`
- Versioned localStorage reads/writes.
- Validation for import/export.
- Never performs rendering.

## 12. Data flow

```text
User text
  -> validate/normalize
  -> emotion.js derives features + topic tokens
  -> placement.js chooses location
  -> app generates deterministic entry seed
  -> plant parameters derived from features + seed
  -> garden.js begins growth animation
  -> storage.js persists entry
  -> plant becomes interactive mature garden element
```

On page load:

```text
storage.js loads + validates entries
  -> garden.js reconstructs mature plants
  -> accessible plant controls are synchronized
```

## 13. Error handling

- Empty or whitespace-only thoughts are rejected inline.
- Text length is capped at a reasonable v1 maximum of 500 characters.
- localStorage quota/write failures show a non-blocking warning; the current rendered plant remains visible for the session.
- Malformed saved data is ignored rather than crashing startup.
- Invalid imports never mutate existing saved data.
- Missing p5.js should display a graceful static error message rather than a blank page.

## 14. Testing

Automated unit tests should cover pure logic:

- Feature extraction and clamping
- Deterministic plant parameter generation
- Topic token normalization
- Similarity scoring
- Placement bounds and collision fallback
- Storage schema validation
- Import compatibility and rejection

Manual browser checks should cover:

- First thought growth sequence
- Multiple clustered and unrelated thoughts
- Reload persistence
- Plant hover/focus/click behavior
- Mobile layout
- Reduced-motion behavior
- Export/import round trip
- Clear-garden confirmation
- GitHub Pages deployment from repository root

## 15. GitHub Pages deployment

The app uses only relative asset paths so it works from a project-site URL such as:

`https://hansenlee03.github.io/thought-garden/`

No build step is required. GitHub Pages can publish directly from the repository's `main` branch root.

The README will include:

- Live demo link
- Screenshot/GIF placeholder
- Short explanation of the thought-to-plant system
- Privacy note
- Local development instructions
- GitHub Pages deployment steps

## 16. v1 acceptance criteria

V1 is complete when a visitor can:

1. Open the site from GitHub Pages with no setup.
2. Enter a thought and watch a plant grow.
3. See plant characteristics vary according to local text features.
4. Add several thoughts and observe lightweight topic-based spatial grouping.
5. Reload the browser and recover the garden.
6. Hover/focus/click plants to revisit stored thoughts.
7. Export and re-import the garden successfully.
8. Use the main interaction with a keyboard and reduced-motion preference.
9. Keep all thought text entirely local to the browser.
