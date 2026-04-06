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
  active: Tab
  onChange: (t: Tab) => void
}

export function Tabs({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`relative px-4 py-2 text-xs font-medium tracking-wide transition-colors
            ${active === tab ? 'text-primary' : 'text-dim hover:text-muted'}`}
        >
          {active === tab && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-px bg-primary"
            />
          )}
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  )
}
