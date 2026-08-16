# Changelog

All notable changes to `js-queue` are documented here.

## 3.0.0 — 2026-08-16

### Added

- Native ESM default and named exports.
- Conditional CommonJS entry points for the queue and stack.
- `size` and `running` read-only state.
- Atomic task validation in `add()` and `contents` replacement.
- Recoverable idle state after a synchronous task error.
- A shared Node/browser suite powered by `vanilla-test` 2.1.1.
- Independent native V8 coverage gates for Node and Google Chrome.
- Cross-platform and historical-runtime CI, package smoke checks, and GitHub Pages deployment.
- A dependency-free local server with path-containment and malformed-request checks.
- A generated repository header and nine-page static documentation site.
- Migration, testing, browser, examples, patterns, stack, and API documentation.

### Changed

- `add()` now returns the queue for chaining.
- Queue methods are class prototype methods instead of enumerable instance properties.
- The minimum supported Node.js release is 12.22.0.
- The package homepage now points to the GitHub Pages documentation.
- The stack entry now pins the modernized `easy-stack` 2.0.0 contract, including native ESM/CommonJS support and observable state.

### Preserved

- First-in-first-out execution.
- Automatic start after `add()` by default.
- Explicit `this.next()` task hand-off.
- `autoRun`, `stop`, `contents`, and `clear()` behavior.
- CommonJS `require('js-queue')` usage.
- Classic browser `<script>` usage through `queue-vanilla.js`.
- LIFO access through `js-queue/stack` and `js-queue/stack.js`.

## 2.0.2 — 2020

- Updated `easy-stack` and exposed it through `stack.js`.
