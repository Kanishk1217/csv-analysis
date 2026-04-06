import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  label: string
  value: string | number
  sub?: string
  delay?: number
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 800
    const from = 0
    const to = value

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease out quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])

  return <>{display.toLocaleString()}</>
}

export function MetricBox({ label, value, sub, delay = 0 }: Props) {
  const isNum = typeof value === 'number'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ borderColor: 'rgba(161,161,170,0.4)', transition: { duration: 0.2 } }}
      className="bg-surface border border-border p-4 relative overflow-hidden group cursor-default"
    >
      {/* Subtle top glow on hover */}
      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <p className="text-xs text-dim font-mono uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-semibold text-primary leading-none">
        {isNum ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="text-xs text-dim mt-1.5 font-mono">{sub}</p>}
    </motion.div>
  )
}
