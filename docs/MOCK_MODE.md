# Mock mode (offline development)

Mock mode lets you run the ExpConfig UI **without any backend running**. API calls are handled in the browser by an in-memory mock router.

## Enter mock mode

Recommended (also disables the Vite dev proxy):

```bash
npm run dev:mock
```

Alternative (forces the client to use the mock API even in normal dev mode):

```bash
VITE_API_MOCK=true npm run dev
```

## Optional: simulate latency

```bash
VITE_API_MOCK_DELAY_MS=150 npm run dev:mock
```

## How it works

- `src/api/config.ts`
  - `API_BASE` is `/api/v1`
  - `IS_MOCK_API` is enabled when:
    - `import.meta.env.MODE === 'mock'` (used by `vite --mode mock`), or
    - `VITE_API_MOCK === 'true'`
  - `MOCK_API_DELAY_MS` controls optional latency in mock mode
- `src/api/client.ts`
  - All API helpers call a single internal `request(...)`
  - When `IS_MOCK_API` is true, requests are routed to `mockApiRequest(...)`
- `src/api/mockApi.ts`
  - Implements `mockApiRequest(...)` with a small router and an in-memory database
  - Seeds demo experiments + debug tables on page load (reload resets the mock DB)

## Mock API contract (high-level)

The mock routes are designed to match the backend contract used by the UI. Common patterns:

- List endpoints return `{ items, total }` (with `limit`/`offset` support)
- Detail endpoints return a single object
- Error responses use `{ message: string }` where relevant

The current mock includes endpoints under:

- `/experiments`
- `/debug/*` (randomise, tables, table queries, stats, etc.)

See `src/api/mockApi.ts` for the authoritative list.

## Updating the mock (required when API changes)

Treat mock mode as part of the product:

- If you change request/response shapes, status codes, or URLs, update the mock in the same PR.
- Keep `src/api/client.ts` types and `src/api/mockApi.ts` responses aligned.
- Seed enough fixtures so the main pages (list, detail, create, debugger) remain usable.
- Prefer realistic pagination/filtering so UI edge cases are exercised.
- Include a couple of “unhappy path” cases when the UI expects validation or 404s.

If the backend contract is still evolving, leave a short note in `src/api/mockApi.ts` describing the assumption and keep mock mode functional.


