import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`
}

// Categorical variant spectrum — distinct hues that stay legible side-by-side
// in the allocation bar, and clear of the persimmon action/live signal.
export const VARIANT_COLORS = [
  '#1f6f6b', // teal-green
  '#3457d5', // cobalt
  '#e4a11b', // gold
  '#8e4fc4', // violet
  '#2e9e5b', // green
  '#0e8fa8', // cyan-blue
  '#b23a6e', // magenta-rose
  '#7a8450', // olive
]

export function getVariantColor(index: number): string {
  return VARIANT_COLORS[index % VARIANT_COLORS.length]
}
