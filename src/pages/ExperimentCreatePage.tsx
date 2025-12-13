import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Sparkles, ChevronDown, Plus, Save, AlertCircle, X } from 'lucide-react'
import { api, type ExperimentCreate } from '../api/client'
import { Card, Button, WeightDistributionBar } from '../components/ui'
import { getVariantColor, cn } from '../lib/utils'
import { useDebuggerStore } from '../store/debugger'

const OPTIMISATION_TYPES = [
  {
    value: 'AB_TEST',
    label: 'A/B Test',
    description: 'Classic randomized experiment',
    icon: FlaskConical,
  },
  {
    value: 'AI_OPTIMISATION',
    label: 'AI Optimisation',
    description: 'Automatic traffic optimization',
    icon: Sparkles,
  },
]

interface VariantData {
  id: string
  name: string
  weight: number
}

export function ExperimentCreatePage() {
  const navigate = useNavigate()
  const setCurrentJson = useDebuggerStore((s) => s.setCurrentJson)

  const [name, setName] = useState('')
  const [optimisationType, setOptimisationType] = useState('AB_TEST')
  const [variants, setVariants] = useState<VariantData[]>([
    { id: '', name: 'Control', weight: 0.5 },
    { id: '', name: 'Treatment', weight: 0.5 },
  ])

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [seed, setSeed] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [optimisationSettings, setOptimisationSettings] = useState('{}')
  const [metadata, setMetadata] = useState('{}')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightSum = variants.reduce((sum, v) => sum + v.weight, 0)
  const isWeightValid = Math.abs(weightSum - 1) < 0.0001

  function buildPayload(): ExperimentCreate {
    const payload: ExperimentCreate = {
      name,
      optimisationType: optimisationType,
      variants: variants.map((v) => ({
        id: v.id || undefined,
        name: v.name,
        weight: v.weight,
      })),
    }

    if (seed) payload.seed = seed
    if (createdBy) payload.createdBy = createdBy

    try {
      const settings = JSON.parse(optimisationSettings)
      if (Object.keys(settings).length > 0) payload.optimisationSettings = settings
    } catch { /* ignore */ }

    try {
      const meta = JSON.parse(metadata)
      if (Object.keys(meta).length > 0) payload.metadata = meta
    } catch { /* ignore */ }

    return payload
  }

  function updateDebugger() {
    setCurrentJson(buildPayload())
  }

  function addVariant() {
    const n = variants.length
    const newWeight = 1 / (n + 1)
    const scaleFactor = n / (n + 1)
    const scaledVariants = variants.map((v) => ({ ...v, weight: v.weight * scaleFactor }))
    setVariants(normalizeWeights([...scaledVariants, { id: '', name: `Variant ${String.fromCharCode(65 + n)}`, weight: newWeight }]))
  }

  function removeVariant(index: number) {
    if (variants.length <= 2) return
    const remaining = variants.filter((_, i) => i !== index)
    const remainingSum = remaining.reduce((sum, v) => sum + v.weight, 0)
    if (remainingSum > 0) {
      setVariants(normalizeWeights(remaining.map((v) => ({ ...v, weight: v.weight / remainingSum }))))
    } else {
      setVariants(remaining.map((v) => ({ ...v, weight: 1 / remaining.length })))
    }
  }

  function normalizeWeights(vars: VariantData[]): VariantData[] {
    const sum = vars.reduce((s, v) => s + v.weight, 0)
    if (sum === 0) return vars.map((v) => ({ ...v, weight: 1 / vars.length }))
    const scaled = vars.map((v) => ({ ...v, weight: Math.round((v.weight / sum) * 1000000) / 1000000 }))
    const scaledSum = scaled.reduce((s, v) => s + v.weight, 0)
    if (scaled.length > 0) scaled[scaled.length - 1].weight += 1 - scaledSum
    return scaled
  }

  function equalizeWeights() {
    setVariants(normalizeWeights(variants.map((v) => ({ ...v, weight: 1 / variants.length }))))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isWeightValid) {
      setError(`Weights must sum to 1.0 (current: ${weightSum.toFixed(6)})`)
      return
    }
    if (!name.trim()) {
      setError('Experiment name is required')
      return
    }
    if (variants.length < 2) {
      setError('At least 2 variants are required')
      return
    }

    setSubmitting(true)
    try {
      const result = await api.post<{ id: string }>('/experiments', buildPayload())
      navigate(`/experiments/${result.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Experiment</h1>
        <p className="text-slate-600">Configure your new experiment with variants and weights.</p>
      </div>

      <form onSubmit={handleSubmit} onChange={updateDebugger}>
        {/* Basics */}
        <Card className="p-6 mb-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Basics</h2>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Experiment Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Checkout Flow Optimization"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Optimization Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {OPTIMISATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setOptimisationType(type.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    optimisationType === type.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <type.icon className={cn('w-5 h-5 mb-2', optimisationType === type.value ? 'text-teal-600' : 'text-slate-400')} />
                  <p className={cn('font-semibold text-sm', optimisationType === type.value ? 'text-teal-700' : 'text-slate-700')}>
                    {type.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Variants */}
        <Card className="p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Variants</h2>
            <div className={cn('px-3 py-1 rounded-lg text-xs font-mono font-semibold', isWeightValid ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600')}>
              Σ = {weightSum.toFixed(4)}
            </div>
          </div>

          <div className="mb-5">
            <WeightDistributionBar variants={variants} height={10} />
          </div>

          <div className="space-y-3 mb-5">
            {variants.map((variant, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200"
                style={{ borderLeftWidth: 4, borderLeftColor: getVariantColor(index) }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: getVariantColor(index) }}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => {
                      const updated = [...variants]
                      updated[index].name = e.target.value
                      setVariants(updated)
                    }}
                    placeholder="Variant name"
                    className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-slate-300 focus:border-teal-500 text-sm font-semibold text-slate-800 outline-none py-1 transition-colors"
                  />
                </div>
                <div className="w-24 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={variant.weight}
                    onChange={(e) => {
                      const updated = [...variants]
                      updated[index].weight = parseFloat(e.target.value) || 0
                      setVariants(updated)
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-right focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                  <p className="text-xs text-slate-500 text-right mt-1">{(variant.weight * 100).toFixed(1)}%</p>
                </div>
                {variants.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:text-teal-600 hover:border-teal-400 transition-colors font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
            <button
              type="button"
              onClick={equalizeWeights}
              className="text-sm text-slate-500 hover:text-teal-600 font-semibold transition-colors"
            >
              Equalize Weights
            </button>
          </div>
        </Card>

        {/* Advanced Settings */}
        <details className="advanced-settings mb-6" open={advancedOpen} onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}>
          <summary>
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-semibold text-sm text-slate-700">Advanced Settings</span>
                <span className="block text-xs text-slate-500 mt-0.5">Seed, metadata, and more</span>
              </div>
              <ChevronDown className={cn('w-5 h-5 text-slate-400 transition-transform', advancedOpen && 'rotate-180')} />
            </div>
          </summary>
          <div className="advanced-content">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Seed</label>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Auto-generated"
                  className="input font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Created By</label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="user@example.com"
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Optimization Settings (JSON)</label>
              <textarea
                value={optimisationSettings}
                onChange={(e) => setOptimisationSettings(e.target.value)}
                rows={3}
                className="input font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Metadata (JSON)</label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                rows={3}
                className="input font-mono text-sm"
              />
            </div>
          </div>
        </details>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={submitting} size="lg">
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Create Experiment
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/experiments')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
