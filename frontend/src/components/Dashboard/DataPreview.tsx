import { motion } from 'framer-motion'
import { MetricBox } from '../UI/MetricBox'
import { Badge } from '../UI/Badge'
import type { UploadResponse } from '../../types'

export function DataPreview({ data }: { data: UploadResponse }) {
  const cols = data.columns
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Rows"        value={data.shape[0]} delay={0} />
        <MetricBox label="Columns"     value={data.shape[1]} delay={0.05} />
        <MetricBox label="Numeric"     value={data.numeric_cols.length} delay={0.1} />
        <MetricBox label="Categorical" value={data.cat_cols.length} delay={0.15} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Missing Values" value={data.missing_total} delay={0.2} />
        <MetricBox label="Duplicates"     value={data.duplicates} delay={0.25} />
        <MetricBox label="Complete Rows"  value={data.complete_rows} delay={0.3} />
        <MetricBox label="Memory"         value={`${data.memory_mb} MB`} delay={0.35} />
      </div>
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-3">Column Types</p>
        <div className="flex flex-wrap gap-2">
          {cols.map((col) => (
            <div key={col} className="flex items-center gap-1.5">
              <span className="text-xs text-muted">{col}</span>
              <Badge label={data.dtypes[col]} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface border border-border overflow-x-auto">
        <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
          Preview — first {data.preview.length} rows
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {cols.map((col) => (
                <th key={col} className="px-4 py-2 text-left font-mono text-dim whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.preview.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                {cols.map((col) => (
                  <td key={col} className="px-4 py-2 text-muted font-mono whitespace-nowrap">
                    {String(row[col] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
