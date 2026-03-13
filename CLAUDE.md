# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start WXT dev server with hot reload (Chrome)
- `pnpm build` — production build to `.output/chrome-mv3/`
- `pnpm zip` — build + zip for Chrome Web Store
- `pnpm typecheck` — run `tsc --noEmit`

No test runner or linter is configured. Prettier is the only formatting tool.

## Architecture

WXT-based Chrome extension (Manifest V3) using React, TypeScript, and Tailwind v4.

### Hint mode lifecycle

The core feature is a Vimium-style keyboard hint system. The flow across modules:

1. **content.ts** — entrypoint injected into all pages (`allFrames: true`). Registers a `keydown` listener and delegates to `hint-mode`.
2. **hint-mode.ts** — state machine with two states: `inactive` and `active`. On activation hotkey press:
   - Calls `scanner.scanViewport()` to find interactive elements
   - Calls `labels.generateLabels()` to create prefix-free label codes
   - Calls `hint-renderer.renderHints()` to display overlays in a Shadow DOM
   - Tracks typed characters and filters hints via `hint-renderer.updateHintFiltering()`
   - On exact match, clicks the target element and deactivates
3. **scanner.ts** — 3-pass element discovery: (1) `tabbable/focusable()` for focusable elements, (2) `querySelectorAll` for clickable roles/attributes, (3) recursive shadow root traversal. All filtered to viewport-visible elements.
4. **labels.ts** — generates prefix-free labels by expanding a k-ary tree (shortest-first BFS). The hotkey character is excluded from the charset.
5. **hint-renderer.ts** — renders hint overlays inside a Shadow DOM container (`position: fixed`). Handles overlap avoidance by shifting labels rightward. Repositions all overlays on scroll.

### Settings persistence

`settings.ts` uses `browser.storage.sync` with a change listener (`watchSettings`) so content scripts receive live updates when the options page saves.

### Entrypoints

- **background.ts** — relays `ACTIVATE` messages from popup to the active tab's content script
- **popup/** — minimal React UI showing usage instructions
- **options/** — React settings form with debounced auto-save

### Path alias

`@/*` maps to `src/*` (configured in tsconfig.json and resolved by WXT/Vite).

## Formatting

Prettier config: 4-space indent, single quotes, no semicolons, trailing commas, 120 char width.
