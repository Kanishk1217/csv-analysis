import { motion } from 'framer-motion'
import type { Tab } from '../../types'

const TAB_LABELS: Record<Tab, string> = {
  preview:        'Data Preview',
  statistics:     'Statistics',
  correlations:   'Correlations',
  distributions:  'Distributions',
  visualizations: 'Visualizations',
  model:          'ML Model',
  features:       'Feature Importance',
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
    <div className="flex flex-wrap gap-1 border-b border-border">
      {entries.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key as Tab)}
          className={`relative px-4 py-2 text-xs font-medium tracking-wide transition-colors
            ${active === key ? 'text-primary' : 'text-dim hover:text-muted'}`}
        >
          {active === key && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-px bg-primary"
            />
          )}
          {label}
        </button>
      ))}
    </div>
  )
}
