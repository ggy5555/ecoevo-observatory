# EcoEvo Observatory — Design System

Version: 1.0 (proposed implementation branch). This file documents **interface only** decisions. The original Observatory MVP 0.2 and LAB 2.0 P1 remain separate experimental engines; no simulation constants, random generators, numerical models, worker protocol or storage schema may be modified for visual polish.

## Visual identity

Scientific Dashboard × Interactive Research Laboratory. A quiet, light research workspace: pale neutral background, white surfaces, Deep Green branding, teal active actions, blue prey, red predators, green food. Do not add decorative gradients, giant shadows or game-like ornamental motion.

### Single source of tokens

Shared CSS: `dist/css/design-tokens.css`. Import it from both `dist/css/style.css` and `dist/lab2/css/lab2.css` before their component styles. Semantic variables start with `--eco-`; preserve existing Canvas model-color logic and data calculations.

| Token | Value | Role |
| --- | --- | --- |
| `--eco-bg` | `#f4f7f6` | Page backdrop |
| `--eco-surface` | `#ffffff` | Panels |
| `--eco-ink` | `#172d28` | Text |
| `--eco-muted` | `#59726b` | Secondary text |
| `--eco-border` | `#d8e3df` | Dividers |
| `--eco-brand` | `#0f5d52` | Primary interaction |
| `--eco-teal` | `#0f766e` | Selection and condition |
| `--eco-focus` | `#2363bd` | Focus-visible outline |
| `--eco-condition-1..4` | teal / blue / orange / purple | Condition comparison |

## Typography

UI: Pretendard → Noto Sans KR → OS system. Numbers and seed: system mono when useful; `font-variant-numeric: tabular-nums` for all KPIs, tables and chart data. Body text ~14–16px, line height 1.5–1.7. Document content up to ~82 characters wide; support horizontal scroll on dense tables.

## Layout

Desktop: controls / dominant 800×600 world Canvas / inspector or live metrics, followed by results. Tablet: world plus controls, inspector below. Mobile: world first, controls next, then metrics and charts. Keep Canvas intrinsic pixel dimensions and preserve correct click-coordinate mapping. Never tie CSS transitions to simulation update ticks.

## Components

- **Top navigation**: both products share branding and consistent tab active markers; a persistent link connects the two without merging their URLs or engine state.
- **Panels**: thin border, 10–12px corners, minimal shadow. Prefer section dividers over nested card-on-card layouts.
- **Controls**: minimum 44px target, label and unit visible, explicit disabled/hover/focus states; validate at existing input constraints.
- **Status**: identify ready / recording / running / paused / completed / cancelled / unavailable with text as well as color.
- **Charts**: conditions have a stable palette and textual legend; distinguish missing data (N/A) from zero; do not imply percentile bands are confidence intervals.
- **Results**: summary first, plots second, detailed tables last, export labels explicit. Seed/model version must remain accessible.
- **Methods**: readable document layout, model limitations and differences clearly signposted.
- **Motion**: 120–180ms UI-only feedback; honour `prefers-reduced-motion`; never delay or slow an engine tick.

## State and input semantics

Legacy Observatory food-spawn slider **applies immediately**. LAB 2.0 Observation mode parameters apply **on Reset**. Preserve these differences and label them in the interface. Lab Experiment Builder locks settings while running and retains its existing validation and cancellation semantics.

## Implementation phases

1. Shared tokens and documentation.
2. Legacy Observatory layout and controls; preserve nine-step tutorial and A/B recorder.
3. LAB 2.0 overview, builder, observation and methods.
4. Result legends/labels, tables, export UX.
5. Responsive refinement, interaction/accessibility QA and regression checks.

## Non-negotiable test gates

`npm test`; invariant seed/data snapshots for LAB 2.0; pause/step/resume; worker progress and cancellation; IndexedDB save/open/delete; CSV/JSON exports; mobile layout; both GitHub Pages routes. No model file changes allowed without separate scientific review.
