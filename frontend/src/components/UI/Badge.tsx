interface Props {
  label: string
  variant?: 'default' | 'success' | 'warning'
}

export function Badge({ label, variant = 'default' }: Props) {
  const variants = {
    default: 'bg-surface2 text-muted border-border',
    success: 'bg-surface2 text-primary border-border',
    warning: 'bg-surface2 text-muted border-border',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border ${variants[variant]}`}>
      {label}
    </span>
  )
}
