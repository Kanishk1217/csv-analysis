import { motion } from 'framer-motion'
import type { Tab } from '../../types'

const TAB_LABELS: Record<Tab, string> = {
  preview:        'Preview',
  statistics:     'Statistics',
  correlations:   'Correlations',
  distributions:  'Distributions',
  visualizations: 'Visualizations',
  model:          'ML Model',
  features:       'Features',
}

interface Props {
  tabs?: { id: Tab; label: string }[]
  active: Tab
  onChange: (t: Tab) => void
}

export function Tabs({ tabs, active, onChange }: Props) {
  const entries = tabs
    ? tabs.map((t) => ({ key: t.id, label: t.label }))
    : (Object.keys(TAB_LABELS) as Tab[]).map((k) => ({ key: k, label: TAB_LABELS[k] }))

  return (
    <div className="flex flex-wrap gap-0 border-b border-border">
      {entries.map(({ key, label }) => {
        const isActive = active === key
        return (
          <motion.button
            key={key}
            onClick={() => onChange(key as Tab)}
            whileHover={{ color: isActive ? '#fafafa' : '#a1a1aa' }}
            className={`relative px-4 py-2.5 text-xs font-medium tracking-wide transition-colors
              ${isActive ? 'text-primary' : 'text-dim'}`}
          >
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-px bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            {isActive && (
              <motion.div
                layoutId="tab-bg"
                className="absolute inset-0 bg-white/[0.03]"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
