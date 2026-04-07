import { motion, AnimatePresence } from 'framer-motion'
import type { UploadResponse } from '../../types'

interface Alert { level: 'critical' | 'warning' | 'info'; message: string }

function buildAlerts(data: UploadResponse): Alert[] {
  const alerts: Alert[] = []
  const { shape, missing_total, duplicates, numeric_cols, cat_cols } = data

  const missingPct = (missing_total / Math.max(shape[0] * shape[1], 1)) * 100
  if (missingPct > 30)
    alerts.push({ level: 'critical', message: `${missingPct.toFixed(0)}% of all data is missing — results will be heavily affected. Consider preprocessing first.` })

  if (duplicates > 0 && duplicates / shape[0] > 0.1)
    alerts.push({ level: 'warning', message: `${duplicates.toLocaleString()} duplicate rows (${((duplicates / shape[0]) * 100).toFixed(0)}%) — remove them in the Preprocessing tab for accurate analysis.` })

  const heavyMissing = Object.entries(data.missing).filter(([, v]) => v / shape[0] > 0.3)
  if (heavyMissing.length)
    alerts.push({ level: 'warning', message: `${heavyMissing.length} column(s) missing >30% of values: ${heavyMissing.slice(0, 2).map(([c]) => c).join(', ')}.` })

  if (numeric_cols.length === 0)
    alerts.push({ level: 'info', message: 'No numeric columns detected — ML training and correlations require numeric data.' })

  if (cat_cols.length > 20)
    alerts.push({ level: 'info', message: `${cat_cols.length} categorical columns found — consider encoding or dropping low-value ones before ML training.` })

  return alerts.slice(0, 3)
}

const styles = {
  critical: 'border-white/20 bg-white/[0.04] text-white/80',
  warning:  'border-white/10 bg-white/[0.03] text-white/60',
  info:     'border-white/[0.06] bg-white/[0.02] text-white/40',
}
const icons = { critical: '●', warning: '◆', info: '○' }

export function AlertBanner({ data }: { data: UploadResponse }) {
  const alerts = buildAlerts(data)
  if (!alerts.length) return null
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        {alerts.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-start gap-3 px-4 py-3 border text-xs font-mono ${styles[a.level]}`}
            role="alert" aria-live="polite">
            <span className="flex-shrink-0 mt-0.5">{icons[a.level]}</span>
            <span>{a.message}</span>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
