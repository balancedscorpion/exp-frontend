import { MOCK_API_DELAY_MS } from './config'

export interface MockApiRequestParams {
  method: string
  endpoint: string
  body?: unknown
}

export interface MockApiResponse {
  status: number
  body: unknown
}

type ExperimentStatus = 'CREATED' | 'RUNNING' | 'PAUSED' | 'ENDED'

interface MockVariant {
  id: string
  name: string
  weight: number
}

interface MockExperiment {
  id: string
  name: string
  seed: string
  status: ExperimentStatus
  version: number
  variants: { variants: MockVariant[] }
  optimisationType: string
  optimisationSettings: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

interface MockExperimentVersion {
  version: number
  data: Record<string, unknown>
  createdAt: string
}

interface MockLogEntry {
  id: string
  timestamp: string
  userId: string
  experimentId: string
  seed: string
  variantId: string
  variantIndex: number
}

interface MockMetricEvent {
  id: string
  timestamp: string
  userId: string
  metricId: string
}

interface MockDb {
  experiments: Map<string, MockExperiment>
  versions: Map<string, MockExperimentVersion[]>
  logs: MockLogEntry[]
  metricEvents: MockMetricEvent[]
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toIso(d: Date) {
  return d.toISOString()
}

function cloneJson<T>(value: T): T {
  // Good enough for mock fixtures; avoids structuredClone compatibility issues.
  return JSON.parse(JSON.stringify(value)) as T
}

function makeListItem(exp: MockExperiment) {
  return {
    id: exp.id,
    name: exp.name,
    status: exp.status,
    version: exp.version,
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt,
  }
}

function pickWeightedIndex(weights: number[]): number {
  const cleaned = weights.map((w) => (Number.isFinite(w) ? Math.max(0, w) : 0))
  const total = cleaned.reduce((s, w) => s + w, 0)
  if (total <= 0) return 0
  const r = Math.random() * total
  let acc = 0
  for (let i = 0; i < cleaned.length; i++) {
    acc += cleaned[i]
    if (r < acc) return i
  }
  return Math.max(0, cleaned.length - 1)
}

function createDb(): MockDb {
  const db: MockDb = {
    experiments: new Map(),
    versions: new Map(),
    logs: [],
    metricEvents: [],
  }

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const seedExperiments: MockExperiment[] = [
    {
      id: 'exp_checkout_flow',
      name: 'Checkout Flow Optimisation',
      seed: 'seed-checkout-flow',
      status: 'RUNNING',
      version: 3,
      variants: {
        variants: [
          { id: 'v_control', name: 'Control', weight: 0.5 },
          { id: 'v_treatment', name: 'Treatment', weight: 0.5 },
        ],
      },
      optimisationType: 'AB_TEST',
      optimisationSettings: {},
      metadata: { owner: 'growth@example.com', area: 'checkout' },
      createdAt: toIso(daysAgo(21)),
      updatedAt: toIso(daysAgo(1)),
      createdBy: 'growth@example.com',
    },
    {
      id: 'exp_homepage_hero',
      name: 'Homepage Hero Copy',
      seed: 'seed-home-hero',
      status: 'PAUSED',
      version: 2,
      variants: {
        variants: [
          { id: 'v_a', name: 'Original', weight: 0.34 },
          { id: 'v_b', name: 'Value Prop A', weight: 0.33 },
          { id: 'v_c', name: 'Value Prop B', weight: 0.33 },
        ],
      },
      optimisationType: 'AI_OPTIMISATION',
      optimisationSettings: { algorithm: 'thompson_sampling' },
      metadata: { owner: 'product@example.com', area: 'homepage' },
      createdAt: toIso(daysAgo(14)),
      updatedAt: toIso(daysAgo(3)),
      createdBy: 'product@example.com',
    },
    {
      id: 'exp_pricing_cta',
      name: 'Pricing Page CTA',
      seed: 'seed-pricing-cta',
      status: 'CREATED',
      version: 1,
      variants: {
        variants: [
          { id: 'v_control', name: 'Control', weight: 0.5 },
          { id: 'v_treatment', name: 'New CTA', weight: 0.5 },
        ],
      },
      optimisationType: 'AB_TEST',
      optimisationSettings: {},
      metadata: { owner: 'marketing@example.com', area: 'pricing' },
      createdAt: toIso(daysAgo(5)),
      updatedAt: toIso(daysAgo(5)),
      createdBy: 'marketing@example.com',
    },
    {
      id: 'exp_reco_algo',
      name: 'Recommendations Ranking v2',
      seed: 'seed-reco-v2',
      status: 'ENDED',
      version: 4,
      variants: {
        variants: [
          { id: 'v_control', name: 'Ranker v1', weight: 0.5 },
          { id: 'v_treatment', name: 'Ranker v2', weight: 0.5 },
        ],
      },
      optimisationType: 'AB_TEST',
      optimisationSettings: {},
      metadata: { owner: 'ml@example.com', area: 'reco' },
      createdAt: toIso(daysAgo(60)),
      updatedAt: toIso(daysAgo(30)),
      createdBy: 'ml@example.com',
    },
  ]

  for (const exp of seedExperiments) {
    db.experiments.set(exp.id, exp)

    // Seed a small version history per experiment
    const versions: MockExperimentVersion[] = []
    const baseCreatedAt = new Date(exp.createdAt)
    for (let v = 1; v <= exp.version; v++) {
      const snap: MockExperiment = {
        ...cloneJson(exp),
        version: v,
        updatedAt: toIso(new Date(baseCreatedAt.getTime() + v * 24 * 60 * 60 * 1000)),
      }
      versions.unshift({
        version: v,
        data: cloneJson(snap) as unknown as Record<string, unknown>,
        createdAt: snap.updatedAt,
      })
    }
    db.versions.set(exp.id, versions)
  }

  // Seed some randomisation logs for the debugger
  const demoLogs: Array<Pick<MockLogEntry, 'userId' | 'experimentId' | 'variantIndex'>> = [
    { userId: 'user_001', experimentId: 'exp_checkout_flow', variantIndex: 0 },
    { userId: 'user_002', experimentId: 'exp_checkout_flow', variantIndex: 1 },
    { userId: 'user_003', experimentId: 'exp_homepage_hero', variantIndex: 2 },
    { userId: 'user_002', experimentId: 'exp_homepage_hero', variantIndex: 1 },
    { userId: 'user_004', experimentId: 'exp_pricing_cta', variantIndex: 0 },
  ]

  for (let i = 0; i < demoLogs.length; i++) {
    const l = demoLogs[i]
    const exp = db.experiments.get(l.experimentId)
    if (!exp) continue
    const variant = exp.variants.variants[l.variantIndex] ?? exp.variants.variants[0]
    db.logs.push({
      id: crypto.randomUUID(),
      timestamp: toIso(daysAgo(2 - i / 10)),
      userId: l.userId,
      experimentId: l.experimentId,
      seed: exp.seed,
      variantId: variant.id,
      variantIndex: l.variantIndex,
    })
  }

  // Seed a few metric events as another explorer table
  const demoMetricEvents: Array<Pick<MockMetricEvent, 'userId' | 'metricId'>> = [
    { userId: 'user_001', metricId: 'purchase' },
    { userId: 'user_002', metricId: 'signup' },
    { userId: 'user_002', metricId: 'purchase' },
    { userId: 'user_003', metricId: 'page_view' },
  ]

  for (let i = 0; i < demoMetricEvents.length; i++) {
    const e = demoMetricEvents[i]
    db.metricEvents.push({
      id: crypto.randomUUID(),
      timestamp: toIso(daysAgo(1 - i / 10)),
      userId: e.userId,
      metricId: e.metricId,
    })
  }

  return db
}

const db = createDb()

function getExperimentOrNull(id: string) {
  return db.experiments.get(id) ?? null
}

function bumpVersion(exp: MockExperiment, reason?: string) {
  exp.version += 1
  exp.updatedAt = toIso(new Date())

  const versions = db.versions.get(exp.id) ?? []
  versions.unshift({
    version: exp.version,
    data: {
      ...(cloneJson(exp) as unknown as Record<string, unknown>),
      _mock: { reason: reason ?? 'update' },
    },
    createdAt: exp.updatedAt,
  })
  db.versions.set(exp.id, versions)
}

function parseIntParam(value: string | null, fallback: number) {
  if (value === null) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

function listExperiments(url: URL): MockApiResponse {
  const status = url.searchParams.get('status')
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
  const limit = parseIntParam(url.searchParams.get('limit'), 50)
  const offset = parseIntParam(url.searchParams.get('offset'), 0)

  let items = Array.from(db.experiments.values())

  if (status) items = items.filter((e) => e.status === status)
  if (search) items = items.filter((e) => e.name.toLowerCase().includes(search) || e.id.toLowerCase().includes(search))

  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const total = items.length
  const page = items.slice(offset, offset + limit).map(makeListItem)

  return { status: 200, body: { items: page, total } }
}

function createExperiment(body: unknown): MockApiResponse {
  if (!isRecord(body)) return { status: 400, body: { message: 'Invalid JSON body' } }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const optimisationType = typeof body.optimisationType === 'string' ? body.optimisationType : 'AB_TEST'
  const seed = typeof body.seed === 'string' && body.seed.trim() ? body.seed.trim() : `seed-${crypto.randomUUID().slice(0, 8)}`
  const createdBy = typeof body.createdBy === 'string' && body.createdBy.trim() ? body.createdBy.trim() : null
  const optimisationSettings = isRecord(body.optimisationSettings) ? body.optimisationSettings : {}
  const metadata = isRecord(body.metadata) ? body.metadata : {}

  const variantsRaw = Array.isArray(body.variants) ? body.variants : null
  if (!name) return { status: 400, body: { message: 'Experiment name is required' } }
  if (!variantsRaw || variantsRaw.length < 2) return { status: 400, body: { message: 'At least 2 variants are required' } }

  const variants: MockVariant[] = variantsRaw.map((v, i) => {
    const rec = isRecord(v) ? v : {}
    const vName = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : `Variant ${String.fromCharCode(65 + i)}`
    const vWeight = typeof rec.weight === 'number' && Number.isFinite(rec.weight) ? rec.weight : 0
    const vId = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : crypto.randomUUID()
    return { id: vId, name: vName, weight: vWeight }
  })

  const now = toIso(new Date())
  const id = `exp_${crypto.randomUUID().slice(0, 12).replace(/-/g, '')}`

  const exp: MockExperiment = {
    id,
    name,
    seed,
    status: 'CREATED',
    version: 1,
    variants: { variants },
    optimisationType,
    optimisationSettings: cloneJson(optimisationSettings),
    metadata: cloneJson(metadata),
    createdAt: now,
    updatedAt: now,
    createdBy,
  }

  db.experiments.set(id, exp)
  db.versions.set(id, [
    {
      version: 1,
      data: cloneJson(exp) as unknown as Record<string, unknown>,
      createdAt: now,
    },
  ])

  return { status: 200, body: { id } }
}

function updateWeights(expId: string, body: unknown): MockApiResponse {
  const exp = getExperimentOrNull(expId)
  if (!exp) return { status: 404, body: { message: 'Experiment not found' } }
  if (!isRecord(body) || !Array.isArray(body.weights)) return { status: 400, body: { message: 'Expected { weights: number[] }' } }

  const weights = body.weights.map((w) => (typeof w === 'number' && Number.isFinite(w) ? w : 0))
  if (weights.length !== exp.variants.variants.length) {
    return { status: 400, body: { message: 'Weights length must match number of variants' } }
  }

  exp.variants.variants = exp.variants.variants.map((v, i) => ({ ...v, weight: weights[i] }))
  bumpVersion(exp, 'weights')

  return { status: 200, body: cloneJson(exp) }
}

function updateStatus(expId: string, body: unknown): MockApiResponse {
  const exp = getExperimentOrNull(expId)
  if (!exp) return { status: 404, body: { message: 'Experiment not found' } }
  if (!isRecord(body)) return { status: 400, body: { message: 'Invalid JSON body' } }
  const status = body.status
  if (status !== 'CREATED' && status !== 'RUNNING' && status !== 'PAUSED' && status !== 'ENDED') {
    return { status: 400, body: { message: 'Invalid status' } }
  }

  exp.status = status
  bumpVersion(exp, 'status')
  return { status: 200, body: cloneJson(exp) }
}

function listDebugTables(): MockApiResponse {
  return {
    status: 200,
    body: {
      tables: [
        {
          id: 'randomisation_logs',
          label: 'Randomisation Logs',
          columns: ['id', 'timestamp', 'userId', 'experimentId', 'seed', 'variantId', 'variantIndex'],
          filters: ['experimentId', 'userId'],
          default_order_by: 'timestamp_desc',
        },
        {
          id: 'metric_events',
          label: 'Metric Events',
          columns: ['id', 'timestamp', 'userId', 'metricId'],
          filters: ['metricId', 'userId'],
          default_order_by: 'timestamp_desc',
        },
      ],
    },
  }
}

function queryDebugTable(tableId: string, url: URL): MockApiResponse {
  const limit = parseIntParam(url.searchParams.get('limit'), 20)
  const offset = parseIntParam(url.searchParams.get('offset'), 0)

  if (tableId === 'randomisation_logs') {
    const experimentId = url.searchParams.get('experimentId') ?? undefined
    const userId = url.searchParams.get('userId') ?? undefined

    let rows = [...db.logs]
    if (experimentId) rows = rows.filter((r) => r.experimentId === experimentId)
    if (userId) rows = rows.filter((r) => r.userId === userId)
    rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

    const total = rows.length
    const page = rows.slice(offset, offset + limit).map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      userId: r.userId,
      experimentId: r.experimentId,
      seed: r.seed,
      variantId: r.variantId,
      variantIndex: r.variantIndex,
    }))

    return {
      status: 200,
      body: {
        table: tableId,
        columns: ['id', 'timestamp', 'userId', 'experimentId', 'seed', 'variantId', 'variantIndex'],
        rows: page,
        total,
        limit,
        offset,
      },
    }
  }

  if (tableId === 'metric_events') {
    const metricId = url.searchParams.get('metricId') ?? undefined
    const userId = url.searchParams.get('userId') ?? undefined

    let rows = [...db.metricEvents]
    if (metricId) rows = rows.filter((r) => r.metricId === metricId)
    if (userId) rows = rows.filter((r) => r.userId === userId)
    rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

    const total = rows.length
    const page = rows.slice(offset, offset + limit).map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      userId: r.userId,
      metricId: r.metricId,
    }))

    return {
      status: 200,
      body: {
        table: tableId,
        columns: ['id', 'timestamp', 'userId', 'metricId'],
        rows: page,
        total,
        limit,
        offset,
      },
    }
  }

  return { status: 404, body: { message: `Unknown table '${tableId}'` } }
}

function computeStats(url: URL): MockApiResponse {
  const experimentId = url.searchParams.get('experimentId') ?? undefined
  const logs = experimentId ? db.logs.filter((l) => l.experimentId === experimentId) : db.logs

  const uniqueUsers = new Set(logs.map((l) => l.userId)).size
  const uniqueExperiments = new Set(logs.map((l) => l.experimentId)).size

  const dist = new Map<string, { variantId: string; variantIndex: number; count: number }>()
  for (const l of logs) {
    const cur = dist.get(l.variantId)
    if (!cur) {
      dist.set(l.variantId, { variantId: l.variantId, variantIndex: l.variantIndex, count: 1 })
    } else {
      cur.count += 1
    }
  }

  return {
    status: 200,
    body: {
      totalAllocations: logs.length,
      uniqueUsers,
      uniqueExperiments,
      variantDistribution: Array.from(dist.values()).sort((a, b) => b.count - a.count),
    },
  }
}

function testRandomise(body: unknown): MockApiResponse {
  if (!isRecord(body)) return { status: 400, body: { message: 'Invalid JSON body' } }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const experimentId = typeof body.experimentId === 'string' ? body.experimentId.trim() : ''
  const seedOverride = typeof body.seed === 'string' && body.seed.trim() ? body.seed.trim() : undefined

  if (!userId || !experimentId) {
    return { status: 400, body: { message: 'userId and experimentId are required' } }
  }

  const exp = getExperimentOrNull(experimentId)
  if (!exp) return { status: 404, body: { message: 'Experiment not found' } }

  const weightsOverride =
    Array.isArray(body.weights) && body.weights.every((w) => typeof w === 'number' && Number.isFinite(w))
      ? (body.weights as number[])
      : undefined

  const weights = weightsOverride ?? exp.variants.variants.map((v) => v.weight)
  const idx = pickWeightedIndex(weights)
  const chosen = exp.variants.variants[idx] ?? exp.variants.variants[0]

  const seed = seedOverride ?? exp.seed

  // Log this allocation so the Data Explorer + stats feel alive
  db.logs.unshift({
    id: crypto.randomUUID(),
    timestamp: toIso(new Date()),
    userId,
    experimentId: exp.id,
    seed,
    variantId: chosen.id,
    variantIndex: idx,
  })

  return {
    status: 200,
    body: {
      variant: idx,
      variantId: chosen.id,
      userId,
      experimentId: exp.id,
      seed,
      numVariants: exp.variants.variants.length,
      source: 'MOCK',
    },
  }
}

export async function mockApiRequest(req: MockApiRequestParams): Promise<MockApiResponse> {
  if (MOCK_API_DELAY_MS > 0) await delay(MOCK_API_DELAY_MS)

  const url = new URL(req.endpoint, 'http://mock.local')
  const parts = url.pathname.split('/').filter(Boolean)

  if (parts.length === 0) return { status: 404, body: { message: 'Not found' } }

  // /experiments...
  if (parts[0] === 'experiments') {
    if (parts.length === 1) {
      if (req.method === 'GET') return listExperiments(url)
      if (req.method === 'POST') return createExperiment(req.body)
      return { status: 405, body: { message: 'Method not allowed' } }
    }

    const expId = parts[1]
    if (parts.length === 2) {
      if (req.method === 'GET') {
        const exp = getExperimentOrNull(expId)
        return exp ? { status: 200, body: cloneJson(exp) } : { status: 404, body: { message: 'Experiment not found' } }
      }
      return { status: 405, body: { message: 'Method not allowed' } }
    }

    if (parts[2] === 'versions' && req.method === 'GET') {
      const items = db.versions.get(expId) ?? []
      return { status: 200, body: { items: cloneJson(items) } }
    }

    if (parts[2] === 'status' && req.method === 'POST') return updateStatus(expId, req.body)
    if (parts[2] === 'weights' && req.method === 'PUT') return updateWeights(expId, req.body)

    return { status: 404, body: { message: 'Not found' } }
  }

  // /debug...
  if (parts[0] === 'debug') {
    if (parts[1] === 'randomise' && req.method === 'POST') return testRandomise(req.body)
    if (parts[1] === 'tables' && req.method === 'GET') return listDebugTables()
    if (parts[1] === 'stats' && req.method === 'GET') return computeStats(url)

    if (parts[1] === 'table' && parts.length >= 3 && req.method === 'GET') {
      return queryDebugTable(parts[2], url)
    }

    // Optional compatibility endpoints
    if (parts[1] === 'logs' && req.method === 'GET') {
      const limit = parseIntParam(url.searchParams.get('limit'), 20)
      const offset = parseIntParam(url.searchParams.get('offset'), 0)
      const experimentId = url.searchParams.get('experimentId') ?? undefined
      const userId = url.searchParams.get('userId') ?? undefined

      let rows = [...db.logs]
      if (experimentId) rows = rows.filter((r) => r.experimentId === experimentId)
      if (userId) rows = rows.filter((r) => r.userId === userId)
      rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

      const total = rows.length
      const page = rows.slice(offset, offset + limit).map((r) => cloneJson(r))

      return { status: 200, body: { logs: page, total, limit, offset } }
    }

    if (parts[1] === 'metric-events' && req.method === 'GET') {
      const limit = parseIntParam(url.searchParams.get('limit'), 50)
      const offset = parseIntParam(url.searchParams.get('offset'), 0)
      const metricId = url.searchParams.get('metricId') ?? undefined
      const userId = url.searchParams.get('userId') ?? undefined

      let rows = [...db.metricEvents]
      if (metricId) rows = rows.filter((r) => r.metricId === metricId)
      if (userId) rows = rows.filter((r) => r.userId === userId)
      rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

      const total = rows.length
      const page = rows.slice(offset, offset + limit).map((r) => cloneJson(r))
      return { status: 200, body: { events: page, total, limit, offset } }
    }

    if (parts[1] === 'query' && req.method === 'POST') {
      // A lightweight “SQL query” mock for future UI usage
      const columns = ['id', 'timestamp', 'userId', 'experimentId', 'variantId', 'variantIndex']
      const rows = db.logs.slice(0, 25).map((l) => ({
        id: l.id,
        timestamp: l.timestamp,
        userId: l.userId,
        experimentId: l.experimentId,
        variantId: l.variantId,
        variantIndex: l.variantIndex,
      }))
      return { status: 200, body: { columns, rows, rowCount: rows.length, queryTimeMs: 12 } }
    }

    return { status: 404, body: { message: 'Not found' } }
  }

  return { status: 404, body: { message: 'Not found' } }
}


