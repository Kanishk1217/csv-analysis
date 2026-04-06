import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }: Props) {
  const base = 'inline-flex items-center justify-center font-medium tracking-wide transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden'
  const variants = {
    primary: 'bg-primary text-bg hover:bg-muted',
    ghost:   'text-muted hover:text-primary hover:bg-surface2',
    outline: 'border border-border text-muted hover:border-muted hover:text-primary',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm',
  }

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {variant === 'primary' && (
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          whileHover={{ translateX: '200%' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
