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

// Variant colors - teal/amber theme (matching sample size calculator)
export const VARIANT_COLORS = [
  '#0d9488', // teal (primary)
  '#f59e0b', // amber (accent)
  '#06b6d4', // cyan
  '#059669', // emerald
  '#fbbf24', // yellow
  '#0f766e', // dark teal
  '#14b8a6', // light teal
  '#d97706', // dark amber
]

export function getVariantColor(index: number): string {
  return VARIANT_COLORS[index % VARIANT_COLORS.length]
}
