import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ArrowRight, Layers, Clock } from 'lucide-react'
import { api, type ExperimentListItem } from '../api/client'
import { formatDate } from '../lib/utils'
import { Card, Button, StatusBadge } from '../components/ui'

const STATUS_OPTIONS = ['ALL', 'CREATED', 'RUNNING', 'PAUSED', 'ENDED']

// Status → the rail colour on each row (mirrors the design-system status tokens).
const STATUS_RAIL: Record<string, string> = {
  CREATED: 'var(--color-draft)',
  RUNNING: 'var(--color-signal-500)',
  PAUSED: 'var(--color-hold)',
  ENDED: 'var(--color-done)',
}

export function ExperimentsListPage() {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    loadExperiments()
  }, [search, statusFilter])

  async function loadExperiments() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      params.set('limit', '50')

      const data = await api.get<{ items: ExperimentListItem[]; total: number }>(
        `/experiments?${params.toString()}`
      )
      setExperiments(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load experiments:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      {/* Hero Section */}
      <div className="mb-8">
        <p className="eyebrow mb-2">Experiment Registry</p>
        <h1 className="text-3xl font-bold text-ink mb-2">Your Optimisations</h1>
        <p className="text-ink-muted text-lg">
          Survey every experiment, judge its state, and jump into the controls.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input
            type="text"
            placeholder="Search optimisations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`filter-pill ${statusFilter === status ? 'filter-pill--active' : ''}`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <p className="eyebrow mb-6">
        {total} optimisation{total !== 1 ? 's' : ''} found
      </p>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="spinner" />
        </div>
      ) : experiments.length === 0 ? (
        <Card className="py-16 text-center">
          <img
            src="/logo.png"
            alt="AI Optimiser"
            className="w-16 h-16 rounded-2xl mx-auto mb-5 shadow-sm object-cover"
          />
          <h3 className="text-xl font-semibold text-ink mb-2">No optimisations yet</h3>
          <p className="text-ink-muted mb-6 max-w-sm mx-auto">
            Create your first optimisation to start testing.
          </p>
          <Link to="/experiments/new">
            <Button>
              <Plus className="w-4 h-4" />
              Create Optimisation
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 stagger-children">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      )}
    </div>
  )
}

interface ExperimentCardProps {
  experiment: ExperimentListItem
}

function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Link to={`/experiments/${experiment.id}`}>
      <Card hover className="group overflow-hidden">
        <div className="flex items-stretch">
          {/* Status rail */}
          <div
            className="w-1 flex-shrink-0"
            style={{ backgroundColor: STATUS_RAIL[experiment.status] ?? 'var(--color-done)' }}
          />

          <div className="flex items-center gap-6 flex-1 min-w-0 p-5">
            {/* Status + identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={experiment.status} size="sm" />
                <div className="flex items-center gap-1.5 text-ink-faint">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono font-semibold">v{experiment.version}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-ink mb-1 truncate group-hover:text-signal-700 transition-colors">
                {experiment.name}
              </h3>

              <p className="text-xs text-ink-faint font-mono truncate">{experiment.id}</p>
            </div>

            {/* Last updated */}
            <div className="hidden sm:flex items-center gap-2 text-ink-muted flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-ink-faint" />
              <span className="text-sm font-mono">{formatDate(experiment.updatedAt)}</span>
            </div>

            <ArrowRight className="w-5 h-5 text-hairline-strong group-hover:text-signal-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
