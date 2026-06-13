import { getVariantColor, cn } from '../../lib/utils'

interface Variant {
  name: string
  weight: number
}

interface WeightDistributionBarProps {
  variants: Variant[]
  height?: number
  /** Overlay gradation ticks on the track — the instrument ruling. */
  showTicks?: boolean
  /** Render variant name + % inside wide-enough segments. */
  showLabels?: boolean
  /** Drop a deterministic-allocation needle onto a variant's segment. */
  marker?: { variantIndex: number } | null
  /** Animate the marker dropping in (used by the randomise tester). */
  animateMarker?: boolean
}

export function WeightDistributionBar({
  variants,
  height = 8,
  showTicks = false,
  showLabels = false,
  marker = null,
  animateMarker = false,
}: WeightDistributionBarProps) {
  // Position the marker at the horizontal centre of its target segment.
  const markerLeft = (() => {
    if (!marker || marker.variantIndex < 0 || marker.variantIndex >= variants.length) return null
    const before = variants
      .slice(0, marker.variantIndex)
      .reduce((sum, v) => sum + v.weight, 0)
    return (before + variants[marker.variantIndex].weight / 2) * 100
  })()

  return (
    <div className="w-full">
      <div className={cn('weight-bar', showTicks && 'weight-bar--ruled')} style={{ height }}>
        {variants.map((variant, index) => {
          const pct = variant.weight * 100
          return (
            <div
              key={index}
              className="weight-bar-segment group relative"
              style={{ width: `${pct}%`, backgroundColor: getVariantColor(index) }}
            >
              {showLabels && pct >= 12 && (
                <span className="weight-bar-seglabel">
                  {variant.name}
                  <span style={{ opacity: 0.75 }}>{pct.toFixed(0)}%</span>
                </span>
              )}

              {/* Hover readout */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg bg-ink text-white">
                  <span className="font-semibold">{variant.name}</span>
                  <span className="font-mono ml-2 text-signal-300">{pct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )
        })}

        {markerLeft !== null && (
          <div
            className={cn('weight-bar-marker', animateMarker && 'weight-bar-marker--drop')}
            style={{ left: `${markerLeft}%` }}
          />
        )}
      </div>
    </div>
  )
}
