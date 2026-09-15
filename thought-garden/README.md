# Thought Garden

Thought Garden is a small, atmospheric journaling experiment that turns each thought into a unique animated plant. The app runs entirely in the browser and is designed to be hosted as a static site on GitHub Pages.

> **Your thoughts do not disappear. They grow.**

## What it does

- Type a short thought and click **Plant it**.
- The thought becomes a deterministic plant whose height, branching, movement, and bloom are derived from lightweight local text features.
- Related thoughts tend to grow near one another using simple keyword overlap.
- Your garden persists in browser `localStorage`.
- Click or keyboard-focus a plant to revisit the original thought.
- Export and import the complete garden as JSON.
- Respect `prefers-reduced-motion` for a quieter experience.

## Privacy

Thought Garden does not use an API, backend, account, remote database, or generative AI service. Thought text is analyzed and stored only in the user's browser. Nothing is sent to a server by the application.

The local text analysis is purely a visual mapping mechanism. It is not intended to infer mental health, diagnose emotion, or provide therapeutic or clinical interpretation.

## Live demo

Once GitHub Pages is enabled for this repository, the site will be available at:

`https://chriswil.github.io/ThoughtGarden/`

## Run locally

Because the project uses ES modules, serve the directory instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Tests

The project has no build step and no npm runtime dependencies. Node is used only for unit tests.

```bash
npm test
```

The tests cover:

- local thought feature extraction
- topic token normalization
- related-thought similarity and placement
- deterministic plant generation
- storage validation
- safe import/export behavior

## How a thought becomes a plant

Thought Garden evaluates a few structural and lexical properties locally:

- word count influences plant height
- sentence count influences branching
- question marks influence asymmetry
- exclamation marks influence bloom openness
- calm/reflective vocabulary influences rounder leaves and slower movement
- energetic vocabulary influences height and sway
- a deterministic per-entry seed supplies the fine visual variation

The result is saved with the thought so the same garden can be reconstructed consistently on later visits.

## Project structure

```text
ThoughtGarden/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── emotion.js
│   ├── garden.js
│   ├── placement.js
│   ├── plant.js
│   └── storage.js
├── tests/
│   ├── emotion.test.js
│   ├── placement.test.js
│   ├── plant.test.js
│   └── storage.test.js
├── docs/
│   └── superpowers/
├── package.json
└── LICENSE
```

## Deploy with GitHub Pages

1. Push the project to the `main` branch of `chriswil/ThoughtGarden`.
2. Open the repository on GitHub.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose `main` and `/ (root)`.
6. Save.

No build command, environment variable, API key, or deployment workflow is required.

## Technology

- HTML
- CSS
- JavaScript ES modules
- [p5.js 1.11.1](https://p5js.org/) loaded from jsDelivr
- browser `localStorage`
- Node's built-in test runner

## License

MIT
