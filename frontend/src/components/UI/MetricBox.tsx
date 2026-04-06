import { motion } from 'framer-motion'

interface Props {
  label: string
  value: string | number
  sub?: string
}

export function MetricBox({ label, value, sub }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border p-4"
    >
      <p className="text-xs text-dim font-mono uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-semibold text-primary">{value}</p>
      {sub && <p className="text-xs text-dim mt-1">{sub}</p>}
    </motion.div>
  )
}
