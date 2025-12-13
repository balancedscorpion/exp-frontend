import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ArrowRight, Layers } from 'lucide-react'
import { api, type ExperimentListItem } from '../api/client'
import { formatDate } from '../lib/utils'
import { Card, Button, StatusBadge, WeightDistributionBar } from '../components/ui'

const STATUS_OPTIONS = ['ALL', 'CREATED', 'RUNNING', 'PAUSED', 'ENDED']

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
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Your Optimisations
        </h1>
        <p className="text-slate-600 text-lg">
          Create, manage, and monitor your A/B tests and optimisations.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
      <p className="text-slate-500 text-sm mb-6">
        {total} optimisation{total !== 1 ? 's' : ''} found
      </p>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : experiments.length === 0 ? (
        <Card className="py-16 text-center">
          <img 
            src="/logo.png" 
            alt="AI Optimiser"
            className="w-16 h-16 rounded-2xl mx-auto mb-5 shadow-md object-cover"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No optimisations yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
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
        <div className="flex flex-col gap-4 stagger-children">
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
  const mockVariants = [
    { name: 'Control', weight: 0.5 },
    { name: 'Treatment', weight: 0.5 },
  ]

  return (
    <Link to={`/experiments/${experiment.id}`}>
      <Card hover className="p-5 group">
        <div className="flex items-center gap-6">
          {/* Left: Status and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={experiment.status} size="sm" />
              <div className="flex items-center gap-1.5 text-slate-400">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">v{experiment.version}</span>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate group-hover:text-teal-700 transition-colors">
              {experiment.name}
            </h3>
            
            <p className="text-xs text-slate-400 font-mono">
              {experiment.id}
            </p>
          </div>

          {/* Center: Weight Distribution */}
          <div className="w-48 flex-shrink-0 hidden md:block">
            <p className="text-xs text-slate-500 mb-1.5">Distribution</p>
            <WeightDistributionBar variants={mockVariants} height={8} />
          </div>

          {/* Right: Date and Arrow */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-sm text-slate-500 hidden sm:block">
              {formatDate(experiment.updatedAt)}
            </span>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
