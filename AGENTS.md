# ExpConfig Frontend — Agent Guide

This repository is the **React + TypeScript + Vite** frontend for the ExpConfig UI.
It supports two development modes:

- **Real backend mode** (default): API calls are proxied to a backend running locally.
- **Mock mode** (offline): API calls are handled **in the browser** by an in-memory mock.

## Golden rule (do not break this)

**Always keep the mock API up to date.**

Any time you add/change/remove an API call, request shape, or response shape, you must update:

- `src/api/client.ts` (types + exported API helpers)
- `src/api/mockApi.ts` (mock routes + fixtures)
- `README.md` / `docs/MOCK_MODE.md` if behavior or env vars change

Assume `npm run dev:mock` is a first-class dev experience. Do not leave it broken.

## Quick commands

- **Install**: `npm install`
- **Dev (real backend)**: `npm run dev`
- **Dev (mock mode)**: `npm run dev:mock`
- **Lint**: `npm run lint`
- **Production build**: `npm run build`
- **Preview build**: `npm run preview`

## How API calls work

- **API base**: `src/api/config.ts` defines `API_BASE` (currently `/api/v1`).
- **Single entry-point**: all HTTP calls should go through `src/api/client.ts` (`api` and `debugApi`).
  - This ensures requests are logged to the debugger store (`src/store/debugger.ts`).
  - Avoid calling `fetch` directly from pages/components.
- **Mock toggle**:
  - Enabled when `import.meta.env.MODE === 'mock'` (used by `npm run dev:mock`), or
  - When `VITE_API_MOCK === 'true'` (manual override).
- **Mock implementation**: `src/api/mockApi.ts` implements an in-memory router + seeded fixtures.

## Vite dev server behavior

- In normal dev mode, `vite.config.ts` proxies `/api/*` and `/health` to `http://localhost:8000`.
- In mock mode (`vite --mode mock`) the proxy is disabled (because the client never calls the real backend).

## Where things live

- **Pages / routes**: `src/pages/*`
- **Shell/layout**: `src/components/AppShell.tsx`
- **Reusable UI primitives**: `src/components/ui/*`
- **API client + types**: `src/api/*`
- **State** (Zustand): `src/store/*`

## Updating the mock (expected workflow)

When you touch API behavior:

- **Start from the contract**: mimic the backend’s URL paths, query params, status codes, and error shapes.
- **Update types first**: adjust TypeScript interfaces in `src/api/client.ts`.
- **Update mock routes**: add/update handlers in `src/api/mockApi.ts`’s `mockApiRequest(...)` router.
- **Add fixtures that exercise the UI**: seed enough data to make list/detail/debug pages useful.
- **Keep pagination/filtering realistic**: match `{ items, total }` patterns and query params where applicable.
- **Cover unhappy paths**: when the UI expects errors (validation, not found), mock them too.

If the backend contract is uncertain, document the assumption in a short comment in `mockApi.ts` and keep mock mode usable.


