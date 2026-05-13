# Agent guidance for this workspace

This is a minimal static web project composed of:

- `index.html` — loads p5.js from a CDN and includes `sketch.js`
- `sketch.js` — contains the project logic using global p5.js functions like `setup()` and `draw()`

## Key facts for AI agents

- There is no build system, package manager, or backend code in this workspace.
- Changes should be limited to the web assets in this folder unless the user requests additional files or structure.
- The project uses p5.js 1.7.0 via CDN, so dependency updates should focus on the HTML `<script>` tag if needed.

## When editing

- Preserve the static HTML structure unless adding new assets or scripts is explicitly required.
- Keep canvas and drawing logic in `sketch.js` and avoid introducing unrelated frameworks.
- If adding new features, ensure they work in a plain browser environment without additional tooling.

## Useful notes

- This workspace currently has no dedicated docs or tests.
- The primary entry point is `index.html`.
