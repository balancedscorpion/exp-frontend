# ExpConfig Frontend

React + TypeScript + Vite frontend for the ExpConfig UI.

## Tech stack

- React (via Vite)
- TypeScript
- React Router
- Zustand (state)
- Tailwind CSS

## Getting started

### Prerequisites

- Node.js (18+ recommended)
- npm

### Install

```bash
npm install
```

## Local development

### With a real backend

1. Start the backend on `http://localhost:8000`
2. Run the frontend:

```bash
npm run dev
```

The dev server proxies `/api/*` and `/health` to the backend (see `vite.config.ts`).

### Without a backend (mock/offline mode)

Run the frontend with an in-browser mock API:

```bash
npm run dev:mock
```

Mock mode is implemented in:

- `src/api/config.ts` (mock toggle + delay)
- `src/api/client.ts` (routes requests to mock when enabled)
- `src/api/mockApi.ts` (in-memory mock router + fixtures)

Optional: simulate slower networks so loading states are visible:

```bash
VITE_API_MOCK_DELAY_MS=150 npm run dev:mock
```

Alternative: force mock mode without switching Vite mode (useful for quickly toggling):

```bash
VITE_API_MOCK=true npm run dev
```

### Environment variables

Vite only exposes variables prefixed with `VITE_`.

- `VITE_API_MOCK`: set to `true` to force the in-browser mock API (even outside `--mode mock`)
- `VITE_API_MOCK_DELAY_MS`: add artificial latency (milliseconds) when the mock API is enabled

See `env.example` for a starting point (copy to `.env.local`).

## Scripts

- `npm run dev`: start dev server
- `npm run dev:mock`: start dev server in mock mode (`vite --mode mock`)
- `npm run build`: typecheck + production build to `dist/`
- `npm run preview`: preview the production build locally
- `npm run lint`: run ESLint

## Docker image publishing (GitHub Actions)

This repo includes a workflow that builds and publishes a Docker image to `ghcr.io` using the convention:

- `ghcr.io/<owner>/<repo>/<image>:dev` on pushes to `dev` / `develop`
- `ghcr.io/<owner>/<repo>/<image>:staging` on pushes to `staging`
- `ghcr.io/<owner>/<repo>/<image>:release` on pushes to `main` / `master` / `release`

The workflow uses the built-in `GITHUB_TOKEN` with `packages: write` permission (no extra secrets required).

## Project structure

- `src/api/`: API config, types, client wrapper, and mock API
- `src/pages/`: route-level screens (experiments list/detail/create + debugger)
- `src/components/`: layout components
- `src/components/ui/`: reusable UI primitives
- `src/store/`: Zustand stores (e.g. API debugger request log)

## Mock mode expectations

Mock mode is a first-class dev experience. If you change API behavior, **update the mock** so `npm run dev:mock` remains functional.

For details, see `docs/MOCK_MODE.md` and `AGENTS.md`.

