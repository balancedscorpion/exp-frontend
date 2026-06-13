# ExpConfig — Specification & Front-End Redesign

## Context

ExpConfig ("AI Optimiser — Configuration") is a React/TS/Vite control panel for
configuring and operating online experiments. It works against a real backend or a
first-class in-browser mock. The app functions, but its look is the generic
"clean SaaS dashboard" (light slate + teal + amber, Sora/Plus Jakarta) — it has no
point of view, and in places it isn't honest about its own data (the list page draws
a hardcoded 50/50 split because the list contract carries no variants).

The user asked for two things together:
1. **A clear, thorough specification** of the product — its purpose, per-page intent,
   and the design system — written into the repo as the source of truth.
2. **An implemented redesign** that gives the app a distinctive visual identity
   grounded in its actual subject (deterministic, weighted randomisation), applied to
   all four pages and the design system.

**Hard constraint:** the API contracts are frozen. `src/api/client.ts` (types +
`api`/`debugApi` helpers), `src/api/mockApi.ts` (routes, shapes, status codes), and
`src/api/config.ts` must not change shape. Pages keep every existing `api`/`debugApi`
call and their state logic. This is a skin-and-structure change plus a written spec —
not a contract change.

## Design direction — "Split": the console as a precision allocation instrument

The defining act of this product is dividing a whole into weighted parts and assigning
each user to one deterministically from a seed. The design keys off that act. The hero
of the experience is the **allocation bar**, treated as a measured instrument (a ruler
with gradations), not decoration — and the deterministic randomise check is staged as a
**marker dropping onto the bar** at the user's assigned segment.

Distinctiveness budget is spent in two grounded places — the instrument-grade allocation
bar, and **monospace as a first-class content face** (ids, seeds, weights, variant
indices, eyebrows, tab labels are the real subject matter) — so everything else stays
quiet. This deliberately avoids the three AI-default looks (cream+serif+terracotta;
near-black+acid-green; broadsheet hairlines).

### Tokens (replace the current `:root` system in `src/index.css`)

- **Palette** — cool "engineering paper", deep green-ink, single warm signal:
  - `--paper #EEF1F0` (cool off-white base, not cream) · `--surface #FFFFFF`
  - `--ink #14201D` (blackened-green text) · `--ink-muted #5B6B66` · `--hairline #DCE2DF`
  - `--signal #FF5A36` (persimmon — the *only* warm color: primary actions + the live/RUNNING state)
  - `--signal-press #E2441F`
- **Status semantics** (deliberate, more correct than today's all-red):
  - CREATED = draft, cool slate-blue `#41597A` · RUNNING = `--signal` persimmon **with pulse** (the one alive thing) · PAUSED = gold `#C8881A` · ENDED = graphite `#6B7570` (finished/archived, *not* an error → neutral, not red).
- **Categorical variant palette** (`VARIANT_COLORS` in `src/lib/utils.ts`) — replace the
  current near-monochrome teal/green set with hues that read as distinct segments in the
  bar and stay clear of `--signal`:
  `#1F6F6B` `#3457D5` `#E4A11B` `#8E4FC4` `#2E9E5B` `#0E8FA8` `#B23A6E` `#7A8450`

### Typography

- Display: **Space Grotesk** (600/700) — technical grotesque, replaces Sora.
- Body: **Inter** (400/500/600) — quiet workhorse.
- Data/mono: **IBM Plex Mono** (400/500) — elevated to a content face: ids, seeds,
  weights, %s, eyebrows, tab labels in tracked uppercase. This is the typographic signature.
- Load via the `@import` at top of `index.css` **and** the `<link>` in `index.html`
  (update both; drop Sora/Plus Jakarta/JetBrains).

### Signature element — the Allocation Bar

Upgrade `src/components/ui/WeightDistributionBar.tsx` from a plain stacked bar into the
instrument. Keep the existing props (`variants`, `height`) so all current call sites keep
working; **add** optional props:
- `showTicks?: boolean` — fine gradation marks along the track.
- `showLabels?: boolean` — inline segment name/% when the segment is wide enough.
- `marker?: { variantIndex: number }` + `animateMarker?: boolean` — a needle/pin that
  drops onto the assigned segment (used by the randomise tester).
Segment widths animate on change (extend the existing `weight-bar-segment` transition);
respect `prefers-reduced-motion`.

### Motion (restrained)

Bar segments animate width; the randomise marker animates its drop; RUNNING badge pulses;
existing page fade/slide-in stays. Everything gated behind `prefers-reduced-motion`.

## Per-page purpose (be thoughtful about each) + redesign notes

```
                    ┌─────────────────────────────────────────┐
   src/index.css ──▶│ tokens (@theme) + component classes      │
   (design system)  │ .card .btn-* .input .status-* .pill-tab  │
                    │ .filter-pill .hero(instrument) .alloc-bar │
                    └───────────────┬─────────────────────────┘
                                    │ consumed by
   src/lib/utils.ts ─ VARIANT_COLORS┤
                                    ▼
        ┌──────────────┬──────────────┬──────────────┬──────────────┐
        │ AppShell     │ ui/* prims   │ 4 pages       │              │
        │ (header/nav) │ Badge,Button │ List/Create/  │              │
        │              │ Card,AllocBar│ Detail/Debug  │              │
        └──────────────┴──────────────┴──────┬───────┴──────────────┘
                                              │ calls (UNCHANGED)
                                              ▼
                         src/api/client.ts  ◀── FROZEN CONTRACT ──▶  mockApi.ts
```

- **Experiments List `/experiments` — Survey & triage.** Orient across all experiments,
  judge state, navigate in / create new. **Honesty fix:** delete the fabricated
  `mockVariants` 50/50 bar (the `ExperimentListItem` contract has no variants — the survey
  page must not invent a split). Each row instead leads with the real focal data the
  contract provides: status (as the dominant signal), name, mono id, version, last-updated.
  Search + status filter pills retain current behavior/params.
- **Create `/experiments/new` — Compose a valid experiment.** Author name, optimisation
  type, variants & weights (must sum to 1), advanced (seed, createdBy, JSON settings/metadata).
  The interactive allocation bar is the heart here; keep `normalizeWeights`/`equalizeWeights`/
  add/remove logic and the live `setCurrentJson` mirror. Keep the `Σ` validity chip.
- **Detail `/experiments/:id` — Operate & inspect one experiment.** The cockpit: read
  config, drive lifecycle via `ALLOWED_TRANSITIONS` (Start/Pause/End), tune weights, review
  version history. Tabs Overview/Weights/History stay. Restyle the dark `.hero-card` into the
  instrument hero (status + name + allocation bar + key mono facts). Fix copy: "Optimisation"
  spelling to match the product voice.
- **Debugger `/debugger` — Verify & explore.** Five tools (Network, Randomise tester, Data
  Explorer, Current JSON, Validation) keep their logic and all `debugApi` calls. **Signature
  moment:** in the Randomise tester, when an experiment is selected, fetch the full experiment
  via the existing `api.get<Experiment>('/experiments/'+id)` to obtain variants+weights, render
  the allocation bar, and on a test result drop the marker on `result.variant`. Honest, uses
  only the frozen contract.

## Implementation steps

1. **Spec document** — new `docs/SPECIFICATION.md`: product purpose & audience; the design
   system (tokens, type, signature, motion, status & variant palettes from above);
   per-page purpose/contents/states; and a **frozen API contract** section enumerating the
   endpoints and request/response shapes (transcribed from `src/api/client.ts` /
   `mockApi.ts` as the authoritative reference). Add a one-line pointer to it in `docs/README.md`.
2. **Design system** — rewrite `src/index.css`: register the new palette/type as Tailwind v4
   `@theme` tokens (so `brand`/`signal`/`ink`/`paper`/status/`variant-*` are usable as
   utilities), update base `body`/`h*`/mono rules, and recolor every component class
   (`.card`, `.btn-primary|secondary|ghost`, `.input`, `.status-*`, `.pill-tab(s)`,
   `.filter-pill`, `.hero-card`→instrument, `.advanced-settings`, `.weight-bar*`→alloc bar,
   `.spinner`, focus rings). Update fonts in `index.css` `@import` and `index.html` `<link>`;
   update `<title>`/`theme-color`.
3. **Tokens in code** — `src/lib/utils.ts`: swap `VARIANT_COLORS` for the new categorical set
   (keep `getVariantColor`/`formatDate`/`formatWeight` signatures).
4. **UI primitives** — `WeightDistributionBar.tsx` (signature, new optional props above);
   `StatusBadge.tsx` (new status classes; ENDED neutral, RUNNING pulse); `GlassCard`,
   `GradientButton` keep their APIs (restyle via classes only).
5. **Shell + pages** — restyle `AppShell.tsx` (instrument header/nav; keep logo, Debugger
   link, MOCK badge) and sweep the four pages' hardcoded Tailwind color utilities
   (`teal-*`→signal/brand, action `emerald/amber/red`→status tokens, neutrals to the new
   scale; `accentColor`/inline variant colors flow from `getVariantColor`). Apply the
   List honesty fix and the Debugger randomise-drop. **Do not alter any `api`/`debugApi`
   call, endpoint, param, or state logic.**

## Verification

- `npm install` then `npm run build` — must pass typecheck + production build (no contract
  type drift).
- `npm run lint` — clean.
- `npm run dev:mock` and walk every page: List (no invented split; real status/version/id),
  Create (interactive alloc bar, Σ validity, submit → Detail), Detail (Overview/Weights/History,
  Start/Pause/End transitions, save weights), Debugger (Network log, Randomise tester showing
  the marker drop on the assigned segment, Data Explorer tables/pagination/CSV, Current JSON,
  Validation). Confirm mock mode stays fully functional (per AGENTS.md golden rule).
- Sanity-check accessibility floor: visible keyboard focus, mobile down to ~375px, reduced-motion.
- On approval, implement on the `dev` branch and open a PR.
