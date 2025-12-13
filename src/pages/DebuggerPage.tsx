import { useState, useEffect } from 'react'
import {
  Terminal,
  Copy,
  Check,
  Trash2,
  FileJson,
  Network,
  AlertTriangle,
  Shuffle,
  Database,
  Play,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useDebuggerStore } from '../store/debugger'
import { Card } from '../components/ui'
import { cn } from '../lib/utils'
import { api, debugApi } from '../api/client'
import type {
  ExperimentListItem,
  RandomiseTestResponse,
  ExplorerTableDescriptor,
  ExplorerTableQueryResponse,
  RandomisationStats,
} from '../api/client'

type Tab = 'network' | 'json' | 'validation' | 'randomise' | 'explorer'

interface TestHistory {
  id: string
  timestamp: Date
  userId: string
  experimentId: string
  experiment_name?: string
  result: RandomiseTestResponse
}

export function DebuggerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('network')
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Randomise Tester state
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<string>('')
  const [testUserId, setTestUserId] = useState('')
  const [testResult, setTestResult] = useState<RandomiseTestResponse | null>(null)
  const [testHistory, setTestHistory] = useState<TestHistory[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  // Data Explorer state
  const [explorerTables, setExplorerTables] = useState<ExplorerTableDescriptor[]>([])
  const [selectedTableId, setSelectedTableId] = useState('randomisation_logs')
  const [tableData, setTableData] = useState<ExplorerTableQueryResponse | null>(null)

  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(0)
  const [logsLimit] = useState(20)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [filterExperiment, setFilterExperiment] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [stats, setStats] = useState<RandomisationStats | null>(null)
  const [, setStatsLoading] = useState(false)
  const [filterMetricId, setFilterMetricId] = useState('')

  const { requests, currentJson, validationErrors, clearRequests } = useDebuggerStore()
  const selectedReq = requests.find((r) => r.id === selectedRequest)

  // Load experiments on mount
  useEffect(() => {
    api.get<{ items: ExperimentListItem[] } | ExperimentListItem[]>('/experiments')
      .then((response) => {
        // Handle both array response and paginated response {items: [...]}
        let expArray: ExperimentListItem[] = []
        if (Array.isArray(response)) {
          expArray = response
        } else if (response && Array.isArray((response as { items: ExperimentListItem[] }).items)) {
          expArray = (response as { items: ExperimentListItem[] }).items
        }
        setExperiments(expArray)
      })
      .catch(console.error)
  }, [])

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function generateCurl(req: typeof selectedReq) {
    if (!req) return ''
    let curl = `curl -X ${req.method} 'http://localhost:8000${req.url}'`
    if (req.requestBody) {
      curl += ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(req.requestBody)}'`
    }
    return curl
  }

  // Randomise Tester functions
  async function runRandomiseTest() {
    if (!selectedExperiment || !testUserId.trim()) {
      setTestError('Please select an experiment and enter a user ID')
      return
    }

    setTestLoading(true)
    setTestError(null)
    setTestResult(null)

    try {
      const result = await debugApi.testRandomise({
        userId: testUserId.trim(),
        experimentId: selectedExperiment,
      })
      setTestResult(result)

      const exp = experiments.find((e) => e.id === selectedExperiment)
      setTestHistory((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          userId: testUserId.trim(),
          experimentId: selectedExperiment,
          experiment_name: exp?.name,
          result,
        },
        ...prev.slice(0, 19),
      ])
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTestLoading(false)
    }
  }

  // Data Explorer functions

  async function loadExplorerTables() {
    try {
      const res = await debugApi.listTables()
      const arr = Array.isArray(res?.tables) ? res.tables : []
      setExplorerTables(arr)
    } catch (err) {
      console.error('Failed to load explorer tables:', err)
    }
  }

  async function loadSelectedTable() {
    setLogsLoading(true)
    setLogsError(null)
    setTableData(null)

    try {
      const res = await debugApi.queryTable(selectedTableId, {
        experimentId: filterExperiment || undefined,
        metricId: filterMetricId || undefined,
        userId: filterUser || undefined,
        limit: logsLimit,
        offset: logsPage * logsLimit,
      })
      setTableData(res)
      // Keep existing totals for pagination UI reuse
      setLogsTotal(res?.total ?? 0)
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : 'Failed to load table')
    } finally {
      setLogsLoading(false)
    }
  }

  async function loadStats() {
    setStatsLoading(true)
    try {
      const result = await debugApi.getStats(filterExperiment || undefined)
      setStats(result)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'explorer') {
      if (explorerTables.length === 0) {
        loadExplorerTables()
      }
      loadSelectedTable()
      if (selectedTableId === 'randomisation_logs') {
        loadStats()
      } else {
        setStats(null)
      }
    }
  }, [activeTab, selectedTableId, logsPage, filterExperiment, filterUser, filterMetricId])

  // CSV export is now generic via exportSelectedTableAsCsv()

  function exportSelectedTableAsCsv() {
    if (!tableData || !Array.isArray(tableData.rows) || tableData.rows.length === 0) return
    const headers = Array.isArray(tableData.columns) ? tableData.columns : []
    const rows = tableData.rows.map((row) => headers.map((h) => JSON.stringify(row?.[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTableId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
          <Terminal className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Debugger</h1>
          <p className="text-slate-500 text-sm">Monitor API requests, test randomisation, and explore data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="pill-tabs flex-wrap">
          <button
            onClick={() => setActiveTab('network')}
            className={cn('pill-tab flex items-center gap-2', activeTab === 'network' && 'pill-tab--active')}
          >
            <Network className="w-4 h-4" />
            Network
            {requests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-200 text-xs font-semibold">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('randomise')}
            className={cn('pill-tab flex items-center gap-2', activeTab === 'randomise' && 'pill-tab--active')}
          >
            <Shuffle className="w-4 h-4" />
            Randomise Tester
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={cn('pill-tab flex items-center gap-2', activeTab === 'explorer' && 'pill-tab--active')}
          >
            <Database className="w-4 h-4" />
            Data Explorer
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={cn('pill-tab flex items-center gap-2', activeTab === 'json' && 'pill-tab--active')}
          >
            <FileJson className="w-4 h-4" />
            Current JSON
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={cn('pill-tab flex items-center gap-2', activeTab === 'validation' && 'pill-tab--active')}
          >
            <AlertTriangle className="w-4 h-4" />
            Validation
            {validationErrors.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                {validationErrors.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'network' && requests.length > 0 && (
          <button onClick={clearRequests} className="btn-ghost">
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Network Tab */}
      {activeTab === 'network' && (
        <div className="flex gap-6 min-h-[500px]">
          <Card className="w-80 flex-shrink-0 overflow-hidden">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Network className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">No requests yet</p>
                <p className="text-xs mt-1">Navigate the app to see API calls</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {(Array.isArray(requests) ? requests : []).map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      selectedRequest === req.id ? 'bg-teal-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded',
                          req.method === 'GET'
                            ? 'bg-blue-100 text-blue-600'
                            : req.method === 'POST'
                            ? 'bg-green-100 text-green-600'
                            : req.method === 'PUT' || req.method === 'PATCH'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-red-100 text-red-600'
                        )}
                      >
                        {req.method}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-mono',
                          req.error
                            ? 'bg-red-100 text-red-600'
                            : req.status && req.status >= 200 && req.status < 300
                            ? 'bg-green-100 text-green-600'
                            : req.status
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {req.status || '...'}
                      </span>
                    </div>
                    <p className="text-xs font-mono truncate text-slate-700">{req.url}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {req.duration ? `${req.duration}ms` : 'pending'} • {req.timestamp.toLocaleTimeString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex-1 p-6">
            {selectedReq ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Request Detail</h3>
                  <button onClick={() => copyToClipboard(generateCurl(selectedReq))} className="btn-ghost">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    Copy as cURL
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Method</p>
                    <p className="font-mono font-semibold text-slate-800">{selectedReq.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <p className="font-mono font-semibold text-slate-800">{selectedReq.status || 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Duration</p>
                    <p className="font-mono font-semibold text-slate-800">
                      {selectedReq.duration ? `${selectedReq.duration}ms` : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">URL</p>
                  <p className="font-mono text-sm break-all text-slate-800">{selectedReq.url}</p>
                </div>

                {selectedReq.requestBody !== undefined && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Request Body</p>
                    <pre className="text-xs font-mono bg-slate-50 p-4 rounded-xl overflow-auto max-h-40 text-slate-700 border border-slate-100">
                      {JSON.stringify(selectedReq.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedReq.responseBody !== undefined && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Response Body</p>
                    <pre className="text-xs font-mono bg-slate-50 p-4 rounded-xl overflow-auto max-h-60 text-slate-700 border border-slate-100">
                      {JSON.stringify(selectedReq.responseBody, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedReq.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    {selectedReq.error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p className="text-sm">Select a request to view details</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Randomise Tester Tab */}
      {activeTab === 'randomise' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Form */}
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-teal-600" />
              Test Randomisation
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Experiment</label>
                <select
                  value={selectedExperiment}
                  onChange={(e) => setSelectedExperiment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Select an experiment...</option>
                  {(Array.isArray(experiments) ? experiments : []).map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name} ({exp.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">User ID</label>
                <input
                  type="text"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  placeholder="Enter a user ID to test..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <button
                onClick={runRandomiseTest}
                disabled={testLoading || !selectedExperiment || !testUserId.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {testLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Test
              </button>

              {testError && (
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                  <h4 className="font-semibold text-teal-800 mb-3">Result</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-teal-600">Variant Index:</span>
                      <span className="ml-2 font-mono font-bold text-teal-900">{testResult.variant}</span>
                    </div>
                    <div>
                      <span className="text-teal-600">Num Variants:</span>
                      <span className="ml-2 font-mono text-teal-900">{testResult.numVariants}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-teal-600">Variant ID:</span>
                      <span className="ml-2 font-mono text-xs text-teal-900 break-all">{testResult.variantId}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-teal-600">Seed:</span>
                      <span className="ml-2 font-mono text-xs text-teal-900 break-all">{testResult.seed}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Test History */}
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Test History</h3>
            {testHistory.length === 0 ? (
              <div className="text-slate-400 text-sm py-8 text-center">
                No tests run yet. Run a test to see history.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {(Array.isArray(testHistory) ? testHistory : []).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">
                        {item.experiment_name || item.experimentId.slice(0, 8)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>User: <span className="font-mono">{item.userId}</span></span>
                      <span>→</span>
                      <span className="font-semibold text-teal-700">
                        Variant {item.result.variant}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Data Explorer Tab */}
      {activeTab === 'explorer' && (
        <div className="space-y-6">
          {/* Stats */}
          {selectedTableId === 'randomisation_logs' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">Total Allocations</p>
                <p className="text-2xl font-bold text-slate-900">{(stats.totalAllocations ?? 0).toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">Unique Users</p>
                <p className="text-2xl font-bold text-slate-900">{(stats.uniqueUsers ?? 0).toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">Experiments</p>
                <p className="text-2xl font-bold text-slate-900">{stats.uniqueExperiments ?? 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">Variants</p>
                <p className="text-2xl font-bold text-slate-900">{(stats.variantDistribution ?? []).length}</p>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Table:</span>
                <select
                  value={selectedTableId}
                  onChange={(e) => {
                    setSelectedTableId(e.target.value)
                    setLogsPage(0)
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {(Array.isArray(explorerTables) ? explorerTables : []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Filters:</span>
              </div>

              {selectedTableId === 'randomisation_logs' ? (
                <select
                  value={filterExperiment}
                  onChange={(e) => {
                    setFilterExperiment(e.target.value)
                    setLogsPage(0)
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">All Experiments</option>
                  {(Array.isArray(experiments) ? experiments : []).map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name}
                    </option>
                  ))}
                </select>
              ) : selectedTableId === 'metric_events' ? (
                <input
                  type="text"
                  value={filterMetricId}
                  onChange={(e) => {
                    setFilterMetricId(e.target.value)
                    setLogsPage(0)
                  }}
                  placeholder="Filter by metric ID..."
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-48"
                />
              ) : null}

              {(() => {
                const cfg = (Array.isArray(explorerTables) ? explorerTables : []).find((t) => t.id === selectedTableId)
                const supportsUser = cfg?.filters?.includes('userId')
                return supportsUser ? (
                  <input
                    type="text"
                    value={filterUser}
                    onChange={(e) => {
                      setFilterUser(e.target.value)
                      setLogsPage(0)
                    }}
                    placeholder="Filter by user ID..."
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-48"
                  />
                ) : null
              })()}

              <button onClick={loadSelectedTable} className="btn-ghost" disabled={logsLoading}>
                <RefreshCw className={cn('w-4 h-4', logsLoading && 'animate-spin')} />
                Refresh
              </button>

              <button
                onClick={exportSelectedTableAsCsv}
                className="btn-ghost"
                disabled={!tableData || !Array.isArray(tableData.rows) || tableData.rows.length === 0}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </Card>

          {/* Logs Table */}
          <Card className="overflow-hidden">
            {logsError ? (
              <div className="p-6 text-center text-red-600">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{logsError}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Make sure DEBUG_MODE=true is set on the server.
                </p>
              </div>
            ) : logsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>Loading table...</p>
              </div>
            ) : !tableData || !Array.isArray(tableData.rows) || tableData.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No rows found</p>
                <p className="text-xs mt-1">Try changing filters or selecting another table</p>
              </div>
            ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {(Array.isArray(tableData.columns) ? tableData.columns : []).map((col) => (
                            <th key={col} className="text-left px-4 py-3 font-medium text-slate-600">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Array.isArray(tableData.rows) ? tableData.rows : []).map((row, idx) => (
                          <tr key={(row?.id as string) ?? idx} className="hover:bg-slate-50">
                            {(Array.isArray(tableData.columns) ? tableData.columns : []).map((col) => {
                              const val = row?.[col]
                              const isTimestamp = col === 'timestamp' || col.endsWith('_at')
                              const rendered =
                                isTimestamp && typeof val === 'string' ? new Date(val).toLocaleString() : String(val ?? '-')
                              return (
                                <td key={col} className="px-4 py-3 font-mono text-xs text-slate-700 max-w-64 truncate">
                                  {rendered}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Showing {logsPage * logsLimit + 1}-{Math.min((logsPage + 1) * logsLimit, logsTotal)} of{' '}
                      {logsTotal.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLogsPage((p) => Math.max(0, p - 1))}
                        disabled={logsPage === 0}
                        className="btn-ghost p-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {logsPage + 1} of {Math.ceil(logsTotal / logsLimit) || 1}
                      </span>
                      <button
                        onClick={() => setLogsPage((p) => p + 1)}
                        disabled={(logsPage + 1) * logsLimit >= logsTotal}
                        className="btn-ghost p-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
            )}
          </Card>
        </div>
      )}

      {/* JSON Tab */}
      {activeTab === 'json' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Current Form/Experiment JSON</h3>
            {currentJson !== null && (
              <button onClick={() => copyToClipboard(JSON.stringify(currentJson, null, 2))} className="btn-ghost">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy
              </button>
            )}
          </div>
          {currentJson !== null ? (
            <pre className="text-xs font-mono bg-slate-50 p-6 rounded-xl overflow-auto max-h-[500px] text-slate-700 border border-slate-100">
              {JSON.stringify(currentJson, null, 2)}
            </pre>
          ) : (
            <div className="text-slate-400 text-sm py-16 text-center">
              No data available. Create or view an experiment to see its JSON.
            </div>
          )}
        </Card>
      )}

      {/* Validation Tab */}
      {activeTab === 'validation' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Validation Status</h3>
          {(Array.isArray(validationErrors) ? validationErrors : []).length > 0 ? (
            <div className="space-y-3">
              {(Array.isArray(validationErrors) ? validationErrors : []).map((error, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100"
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-teal-700 bg-teal-50 p-4 rounded-xl border border-teal-100">
              <Check className="w-5 h-5" />
              All validations passing
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
