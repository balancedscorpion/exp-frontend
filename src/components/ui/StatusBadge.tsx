import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

const statusStyles: Record<string, string> = {
  CREATED: 'status-created',
  RUNNING: 'status-running',
  PAUSED: 'status-paused',
  ENDED: 'status-ended',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-3 py-1',
    lg: 'text-xs px-4 py-1.5',
  }

  return (
    <span
      className={cn(
        'status-badge',
        statusStyles[status] || 'status-created',
        sizeClasses[size]
      )}
    >
      {status}
    </span>
  )
}
