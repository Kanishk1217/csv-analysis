import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) {
  const base = 'inline-flex items-center justify-center font-medium tracking-wide transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-primary text-bg hover:bg-muted',
    ghost:   'text-muted hover:text-primary hover:bg-surface2',
    outline: 'border border-border text-muted hover:border-primary hover:text-primary',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm',
  }
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
