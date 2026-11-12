# EcoEvo Observatory — Scientific Laboratory Design System

> Version 1.0 · implemented on `feature/scientific-ui-redesign` · 2026-11-12
>
> **Scope:** presentation and usability only. Legacy Observatory MVP 0.2 and LAB 2.0 P1 (model `lab2-ecology-2.1.0`) remain **independent products with independent engines**.

## Design goal

**Scientific Dashboard × Interactive Research Laboratory**. Use a quiet laboratory interface rather than a game or promotional landing page. Each active view should answer: **what is running → what conditions are applied → what the data shows → how to inspect/export it**.

## Shared tokens

Implementation: `dist/css/design-tokens.css`, imported by both apps. Tokens are prefixed `--eco-` to avoid changing existing engine-agnostic CSS rules inadvertently.

| Role | Token | Value |
| --- | --- | --- |
| Application background | `--eco-bg` | `#F4F7F6` |
| Primary surface | `--eco-surface` | `#FFFFFF` |
| Muted surface | `--eco-surface-muted` | `#F8FAF9` |
| Main text | `--eco-ink` | `#172D28` |
| Secondary text | `--eco-muted` | `#59726B` |
| Borders | `--eco-border` | `#D8E3DF` |
| Brand / primary action | `--eco-brand` | `#0F5D52` |
| Focus ring | `--eco-focus` | `#2363BD` |
| Food / Prey / Predator | `--eco-food / --eco-prey / --eco-predator` | `#39A96F / #366CC2 / #C94D53` |
| Conditions 1–4 | `--eco-condition-1` … `-4` | teal, blue, ochre, purple |

Spacing uses a 4px base scale (4, 8, 12, 16, 24, 32); panel radius at most 12px; inputs and click targets 44px or larger; borders and quiet surfaces replace decorative gradients.

UI font: Pretendard, Noto Sans KR, then system sans-serif. This does not install or redistribute font binaries. Numeric data and seed/code use tabular numerals or monospace for clean comparisons.

## Layout and interaction

- Desktop ≥1280px: narrow environment controls / dominant 4:3 Canvas / metrics-inspector. Charts below.
- Medium 800–1279px: two columns, with metrics below where necessary.
- Mobile <800px: Canvas before controls; controls and metrics remain accessible. Tables may scroll horizontally within their own panel, never clip values.
- Keep Canvas internal world `800×600` and pointer mapping unchanged.
- Primary green action for Start, Run and Save. Neutral outline for secondary action. Labels communicate disabled, paused, ready, recording, failed and complete states in text rather than by color alone.
- Keep tooltips, hover, panel disclosure and transitions visual-only; never call `updateTick()`, `runExperiment()` or consume random state.
- Limit transitions to 120–180ms. Respect `prefers-reduced-motion`.
- Accessible focus outlines; links remain visibly identifiable; contrast must be verified in browser before merging.

## Component map

| Legacy Observatory | LAB 2.0 |
| --- | --- |
| Header, environment control, live 4:3 Canvas, 6 KPI figures, model notes, A/B recording and charts | Shared header, Overview modules, Experiment Builder, Observation/Inspector, Results, Methods |
| Food spawn slider changes simulation parameter **immediately** | Observation settings apply after **Reset**, Builder locks form while Worker runs |
| A/B data is manual recording with 10-tick sampling | Seeded multiple repeats, progress/cancel, IndexedDB, CSV and JSON |

Different mechanics are *intentional*. UI must distinguish draft settings from applied settings without making them behave alike.

## Charts, tables, and scientific integrity

- Legacy A/B series: blue/orange; live: slate dashed. LAB series: stable colors across plots, always with text legend.
- Full condition labels must remain legible on mobile. Predation plots say `predators=` (not resource `p=`).
- Align numeric table cells right, preserve exact data and schema. Never convert missing mean speedGene after extinction into zero.
- Percentile shading is a range, not a confidence interval. Same initial seed does not eliminate all later random variation.
- CSV/JSON formats, model metadata, IndexedDB data, Web Worker cancellation semantics and original IDs must not change.

## File boundaries — immutable scientific computation

Do not edit:
- `dist/js/{simulation,agent,food,genetics,statistics,utils,experiment}.js`
- `dist/lab2/js/core/{ecology-engine,rng}.js`
- `dist/lab2/js/experiments/{runner,validation,aggregation,export}.js`
- `dist/lab2/js/workers/experiment.worker.js`
- `dist/lab2/js/ui/storage.js`

UI-only modifications are allowed in HTML, CSS, display handlers in `main.js` and `js/pages/`, and plot renderer `js/ui/charts.js`. Retain all input IDs, bounds, defaults, event payloads and URLs.

## Implementation gates

1. Shared tokens, documentation and compatible navigation.
2. Legacy screen and A/B readability.
3. LAB Overview, Builder, Observation and Methods.
4. Results charts, accurate labels, exports visible; plot geometry only.
5. Responsive behavior, focus, reduce-motion, UI checks, all `npm test` suites and same-seed output tests.

**Never merge on appearance alone.** Compare seed/result output against unmodified base and validate production GitHub Pages paths.

## Visual inspiration

- https://getdesign.md/ — component documentation
- https://21st.dev/community/components — dashboard, form, table interaction patterns
- https://dribbble.com/shots/26946516-Protera-BioTech-Data-Visualization-Dashboard — data hierarchy
- https://noonnu.cc/ — font licensing reference
- https://recent.design/ — visual reference only

## Implementation and verification record (2026-11-12)

- **Phases implemented in order:** (1) shared tokens, (2) Legacy Observatory, (3) LAB Overview/Builder/Observation/Methods, (4) Results and presentation-only chart renderer changes, (5) responsive/accessibility feedback and regression checks.
- **GitHub branch:** [feature/scientific-ui-redesign](https://github.com/ggy5555/ecoevo-observatory/tree/feature/scientific-ui-redesign). `main` was not modified or deployed.
- **Scientific source integrity:** `tests/ui-design.test.mjs` asserts the original Git blob SHA for **15 protected files** (both engine models, RNG, experiment calculators, Worker, IndexedDB storage). The comparison is anchored to main commit `5dbbe03bda84441f8cb681a348a90ad7ce240e8e`.
- **Automated tests:** `npm test` passed in [Verify Legacy + LAB 2.0](https://github.com/ggy5555/ecoevo-observatory/actions/runs/43184022356), including seeded reproducibility, default input and algorithm tests, Worker progress/cancellation and export tests.
- **Real-browser UI smoke:** [Chromium/Playwright success](https://github.com/ggy5555/ecoevo-observatory/actions/runs/43184021004) covered Legacy start/pause/single tick/A-B recording/CSV; LAB Observation start/pause/single tick and applied/reset status; Builder Worker experiment; Results CSV/JSON and tooltip; IndexedDB save and restore; viewport widths 320, 390, 768, and 1440px with no horizontal page overflow in the tested views.
- **Screenshot artifact:** [ecoevo-ui-screenshots](https://github.com/ggy5555/ecoevo-observatory/actions/runs/43184021004/artifacts/13927327596). These are after-redesign captures, not fabricated before/after screenshots.
- **Browser-test dependency:** Playwright and Chromium are installed only in CI, not bundled with the production site.
- **Review limitations:** Desktop/mobile browser smoke does not constitute comprehensive WCAG color-contrast auditing, real tablet/S-Pen testing, or human visual acceptance. Inspect screenshots and the draft PR before merging.

## Non-goals verified

No modification to `dist/js/simulation.js`, original agent/genetics/statistics, LAB 2.0 core ecology and RNG, worker experiment runner and validators, aggregate/export algorithms, or IndexedDB persistence. No seed, timestep, population, energy, reproduction, mutation or predator parameters were changed. The two programs continue to produce separate scientific models.
