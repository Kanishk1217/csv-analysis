interface Props {
  label:    string
  variant?: 'default' | 'success' | 'warning' | 'up' | 'down' | 'flat'
}

export function Badge({ label, variant = 'default' }: Props) {
  const variants: Record<string, string> = {
    default: 'bg-surface2 text-muted border-border',
    success: 'bg-surface2 text-primary border-border',
    warning: 'bg-surface2 text-muted border-border',
    up:      'bg-surface2 text-white/80 border-border',
    down:    'bg-surface2 text-white/40 border-border',
    flat:    'bg-surface2 text-white/50 border-border',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border ${variants[variant] ?? variants.default}`}>
      {label}
    </span>
  )
}
