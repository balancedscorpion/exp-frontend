import { getVariantColor } from '../../lib/utils'

interface Variant {
  name: string
  weight: number
}

interface WeightDistributionBarProps {
  variants: Variant[]
  height?: number
}

export function WeightDistributionBar({ variants, height = 8 }: WeightDistributionBarProps) {
  return (
    <div className="w-full">
      <div
        className="weight-bar"
        style={{ height }}
      >
        {variants.map((variant, index) => (
          <div
            key={index}
            className="weight-bar-segment group relative"
            style={{
              width: `${variant.weight * 100}%`,
              backgroundColor: getVariantColor(index),
            }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="card px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg">
                <span className="font-semibold text-slate-800">{variant.name}</span>
                <span className="text-slate-500 ml-2">{(variant.weight * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
