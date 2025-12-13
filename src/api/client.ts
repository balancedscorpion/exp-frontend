import { useDebuggerStore } from '../store/debugger'

import { API_BASE, IS_MOCK_API } from './config'
import { mockApiRequest } from './mockApi'

export interface ExperimentListItem {
  id: string
  name: string
  status: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface Variant {
  id: string
  name: string
  weight: number
}

export interface Experiment {
  id: string
  name: string
  seed: string
  status: string
  version: number
  variants: { variants: Variant[] }
  optimisationType: string
  optimisationSettings: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface ExperimentVersion {
  version: number
  data: Record<string, unknown>
  createdAt: string
}

export interface ExperimentCreate {
  name: string
  seed?: string
  variants: Array<{ id?: string; name: string; weight: number }>
  optimisationType: string
  optimisationSettings?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdBy?: string
}

export interface ApiRequest {
  id: string
  method: string
  url: string
  requestBody?: unknown
  responseBody?: unknown
  status?: number
  duration?: number
  timestamp: Date
  error?: string
}

// Debug API types
export interface RandomiseTestRequest {
  userId: string
  experimentId: string
  seed?: string
  weights?: number[]
}

export interface RandomiseTestResponse {
  variant: number
  variantId: string
  userId: string
  experimentId: string
  seed: string
  numVariants: number
  source: string
}

export interface LogEntry {
  id: string
  timestamp: string
  userId: string
  experimentId: string
  seed: string
  variantId: string
  variantIndex: number
}

export interface LogsQueryResponse {
  logs: LogEntry[]
  total: number
  limit: number
  offset: number
}

export interface LogsQueryParams {
  experimentId?: string
  userId?: string
  limit?: number
  offset?: number
}

export interface ExplorerTableDescriptor {
  id: string
  label: string
  columns: string[]
  filters: string[]
  default_order_by: string
}

export interface ExplorerTablesResponse {
  tables: ExplorerTableDescriptor[]
}

export interface ExplorerTableQueryResponse {
  table: string
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
  limit: number
  offset: number
}

export interface ExplorerTableQueryParams {
  experimentId?: string
  metricId?: string
  userId?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDesc?: boolean
}

export interface MetricEvent {
  id: string
  timestamp: string
  userId: string
  metricId: string
}

export interface MetricEventsQueryResponse {
  events: MetricEvent[]
  total: number
  limit: number
  offset: number
}

export interface MetricEventsQueryParams {
  metricId?: string
  userId?: string
  limit?: number
  offset?: number
}

export interface SqlQueryRequest {
  experimentId?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDesc?: boolean
}

export interface SqlQueryResponse {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  queryTimeMs: number
}

export interface RandomisationStats {
  totalAllocations: number
  uniqueUsers: number
  uniqueExperiments: number
  variantDistribution: Array<{
    variantId: string
    variantIndex: number
    count: number
  }>
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  const requestRecord: ApiRequest = {
    id: requestId,
    method,
    url,
    requestBody: body,
    timestamp: new Date(),
  }

  // Log the request start
  useDebuggerStore.getState().addRequest(requestRecord)

  try {
    if (IS_MOCK_API) {
      const mockRes = await mockApiRequest({ method, endpoint, body })
      const duration = Date.now() - startTime

      useDebuggerStore.getState().updateRequest(requestId, {
        status: mockRes.status,
        duration,
        responseBody: mockRes.body,
      })

      if (mockRes.status < 200 || mockRes.status >= 300) {
        const error = mockRes.body as { message?: string; detail?: string } | null
        const errorMessage =
          error?.message || error?.detail || `HTTP ${mockRes.status}`
        throw new Error(errorMessage)
      }

      return mockRes.body as T
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const duration = Date.now() - startTime
    let responseBody: unknown

    try {
      responseBody = await response.json()
    } catch {
      responseBody = null
    }

    // Update the request with response
    useDebuggerStore.getState().updateRequest(requestId, {
      status: response.status,
      duration,
      responseBody,
    })

    if (!response.ok) {
      const error = responseBody as { message?: string; detail?: string } | null
      const errorMessage = error?.message || error?.detail || `HTTP ${response.status}`
      throw new Error(errorMessage)
    }

    return responseBody as T
  } catch (error) {
    const duration = Date.now() - startTime
    useDebuggerStore.getState().updateRequest(requestId, {
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, body: unknown) => request<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body: unknown) => request<T>('PUT', endpoint, body),
  patch: <T>(endpoint: string, body: unknown) => request<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
}

// Debug API functions
export const debugApi = {
  testRandomise: (req: RandomiseTestRequest) =>
    api.post<RandomiseTestResponse>('/debug/randomise', req),

  listTables: () => api.get<ExplorerTablesResponse>('/debug/tables'),

  queryTable: (tableId: string, params: ExplorerTableQueryParams = {}) => {
    const searchParams = new URLSearchParams()
    if (params.experimentId) searchParams.set('experimentId', params.experimentId)
    if (params.metricId) searchParams.set('metricId', params.metricId)
    if (params.userId) searchParams.set('userId', params.userId)
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString())
    if (params.orderBy) searchParams.set('orderBy', params.orderBy)
    if (params.orderDesc !== undefined) searchParams.set('orderDesc', params.orderDesc ? 'true' : 'false')
    const query = searchParams.toString()
    return api.get<ExplorerTableQueryResponse>(`/debug/table/${tableId}${query ? `?${query}` : ''}`)
  },

  queryLogs: (params: LogsQueryParams = {}) => {
    const searchParams = new URLSearchParams()
    if (params.experimentId) searchParams.set('experimentId', params.experimentId)
    if (params.userId) searchParams.set('userId', params.userId)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())
    const query = searchParams.toString()
    return api.get<LogsQueryResponse>(`/debug/logs${query ? `?${query}` : ''}`)
  },

  queryMetricEvents: (params: MetricEventsQueryParams = {}) => {
    const searchParams = new URLSearchParams()
    if (params.metricId) searchParams.set('metricId', params.metricId)
    if (params.userId) searchParams.set('userId', params.userId)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())
    const query = searchParams.toString()
    return api.get<MetricEventsQueryResponse>(`/debug/metric-events${query ? `?${query}` : ''}`)
  },

  customQuery: (req: SqlQueryRequest) =>
    api.post<SqlQueryResponse>('/debug/query', req),

  getStats: (experimentId?: string) => {
    const query = experimentId ? `?experimentId=${experimentId}` : ''
    return api.get<RandomisationStats>(`/debug/stats${query}`)
  },
}

