import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, StopCircle, Save, Copy, Check, Clock, Layers } from 'lucide-react'
import { api, type Experiment, type ExperimentVersion } from '../api/client'
import { formatDate, getVariantColor, cn } from '../lib/utils'
import { Card, Button, StatusBadge, WeightDistributionBar } from '../components/ui'
import { useDebuggerStore } from '../store/debugger'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['RUNNING', 'ENDED'],
  RUNNING: ['PAUSED', 'ENDED'],
  PAUSED: ['RUNNING', 'ENDED'],
  ENDED: [],
}

type Tab = 'overview' | 'weights' | 'history'

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const setCurrentJson = useDebuggerStore((s) => s.setCurrentJson)

  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [versions, setVersions] = useState<ExperimentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [weights, setWeights] = useState<number[]>([])
  const [savingWeights, setSavingWeights] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id) loadExperiment()
  }, [id])

  async function loadExperiment() {
    setLoading(true)
    try {
      const [exp, vers] = await Promise.all([
        api.get<Experiment>(`/experiments/${id}`),
        api.get<{ items: ExperimentVersion[] }>(`/experiments/${id}/versions`),
      ])
      setExperiment(exp)
      setVersions(vers.items)
      setWeights(exp.variants.variants.map((v) => v.weight))
      setCurrentJson(exp)
    } catch (error) {
      console.error('Failed to load experiment:', error)
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(newStatus: string) {
    if (!experiment) return
    setChangingStatus(true)
    try {
      const updated = await api.post<Experiment>(`/experiments/${id}/status`, { status: newStatus })
      setExperiment(updated)
      setCurrentJson(updated)
      const vers = await api.get<{ items: ExperimentVersion[] }>(`/experiments/${id}/versions`)
      setVersions(vers.items)
    } catch (error) {
      console.error('Failed to change status:', error)
    } finally {
      setChangingStatus(false)
    }
  }

  async function saveWeights() {
    if (!experiment) return
    setSavingWeights(true)
    try {
      const updated = await api.put<Experiment>(`/experiments/${id}/weights`, { weights })
      setExperiment(updated)
      setCurrentJson(updated)
    } catch (error) {
      console.error('Failed to update weights:', error)
    } finally {
      setSavingWeights(false)
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-500">Experiment not found</p>
      </div>
    )
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[experiment.status] || []
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  const weightsValid = Math.abs(weightSum - 1) < 0.0001
  const weightsChanged = experiment.variants.variants.some((v, i) => Math.abs(v.weight - weights[i]) > 0.0001)
  const variants = experiment.variants.variants

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
      {/* Back Link */}
      <Link
        to="/experiments"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Experiments
      </Link>

      {/* Hero Section */}
      <div className="hero-card mb-8">
        <div className="relative flex flex-col items-center">
          <StatusBadge status={experiment.status} size="lg" />
          <h1 className="hero-card-value mt-4 text-3xl md:text-4xl">{experiment.name}</h1>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6 mt-4 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>v{experiment.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDate(experiment.updatedAt)}</span>
            </div>
          </div>

          {/* Status Actions */}
          {allowedTransitions.length > 0 && (
            <div className="flex gap-3 mt-6">
              {allowedTransitions.includes('RUNNING') && (
                <button
                  onClick={() => changeStatus('RUNNING')}
                  disabled={changingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start
                </button>
              )}
              {allowedTransitions.includes('PAUSED') && (
                <button
                  onClick={() => changeStatus('PAUSED')}
                  disabled={changingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              {allowedTransitions.includes('ENDED') && (
                <button
                  onClick={() => changeStatus('ENDED')}
                  disabled={changingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                  End
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pill-tabs w-fit mb-6">
        {(['overview', 'weights', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('pill-tab', activeTab === tab && 'pill-tab--active')}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'weights' && 'Weights'}
            {tab === 'history' && `History (${versions.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-5 stagger-children">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-slate-400 mb-1">ID</dt>
                <dd className="font-mono text-sm text-slate-800 flex items-center gap-2">
                  {experiment.id}
                  <button onClick={() => copyToClipboard(experiment.id)} className="text-slate-400 hover:text-teal-600 transition-colors">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1">Seed</dt>
                <dd className="font-mono text-sm text-slate-800">{experiment.seed}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1">Optimization Type</dt>
                <dd className="text-sm text-slate-800">{experiment.optimisationType.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1">Created</dt>
                <dd className="text-sm text-slate-800">{formatDate(experiment.createdAt)}</dd>
              </div>
              {experiment.createdBy && (
                <div>
                  <dt className="text-xs text-slate-400 mb-1">Created By</dt>
                  <dd className="text-sm text-slate-800">{experiment.createdBy}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Variants</h3>
            <div className="mb-4">
              <WeightDistributionBar variants={variants} height={10} />
            </div>
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={variant.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getVariantColor(index) }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{variant.name}</p>
                  </div>
                  <span className="text-sm font-mono text-slate-600">{(variant.weight * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'weights' && (
        <Card className="p-6 max-w-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-slate-900">Adjust Weights</h3>
            <div className={cn('px-3 py-1 rounded-lg text-xs font-mono font-semibold', weightsValid ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600')}>
              Sum: {weightSum.toFixed(6)}
            </div>
          </div>

          <div className="mb-6">
            <WeightDistributionBar variants={variants.map((v, i) => ({ ...v, weight: weights[i] }))} height={12} />
          </div>

          <div className="space-y-5 mb-6">
            {variants.map((variant, index) => (
              <div key={variant.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getVariantColor(index) }} />
                    <span className="font-semibold text-slate-800">{variant.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-16 text-right">{(weights[index] * 100).toFixed(1)}%</span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={weights[index]}
                      onChange={(e) => {
                        const newWeights = [...weights]
                        newWeights[index] = parseFloat(e.target.value) || 0
                        setWeights(newWeights)
                      }}
                      disabled={experiment.status === 'ENDED'}
                      className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-right focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={weights[index]}
                  onChange={(e) => {
                    const newWeights = [...weights]
                    newWeights[index] = parseFloat(e.target.value)
                    setWeights(newWeights)
                  }}
                  disabled={experiment.status === 'ENDED'}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer disabled:opacity-50"
                  style={{ accentColor: getVariantColor(index) }}
                />
              </div>
            ))}
          </div>

          {experiment.status !== 'ENDED' && (
            <Button onClick={saveWeights} disabled={!weightsValid || !weightsChanged || savingWeights}>
              {savingWeights ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Weights
            </Button>
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 stagger-children">
          {versions.map((version) => (
            <Card key={version.version} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-teal-700">v{version.version}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Version {version.version}</p>
                    <p className="text-xs text-slate-500">{formatDate(version.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(version.data, null, 2))}
                  className="btn-ghost text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy JSON
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-50 p-4 rounded-xl overflow-auto max-h-48 text-slate-700 border border-slate-100">
                {JSON.stringify(version.data, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
