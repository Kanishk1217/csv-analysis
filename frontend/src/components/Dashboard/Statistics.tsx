import { motion } from 'framer-motion'
import type { UploadResponse } from '../../types'

export function Statistics({ data }: { data: UploadResponse }) {
  const statCols = Object.keys(data.statistics)
  const statRows = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-surface border border-border overflow-x-auto">
        <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
          Descriptive Statistics
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-mono text-dim">Metric</th>
              {statCols.map((col) => (
                <th key={col} className="px-4 py-2 text-left font-mono text-dim whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statRows.map((row) => (
              <tr key={row} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                <td className="px-4 py-2 font-mono text-dim">{row}</td>
                {statCols.map((col) => (
                  <td key={col} className="px-4 py-2 font-mono text-muted">
                    {data.statistics[col]?.[row] != null
                      ? Number(data.statistics[col][row]).toLocaleString(undefined, { maximumFractionDigits: 4 })
                      : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.values(data.missing).some((v) => v > 0) && (
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-3">Missing Values</p>
          <div className="space-y-2">
            {Object.entries(data.missing).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([col, count]) => (
              <div key={col} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted w-40 truncate">{col}</span>
                <div className="flex-1 h-1 bg-surface2">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(count / data.shape[0]) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-dim w-20 text-right">
                  {count} ({((count / data.shape[0]) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.cat_cols.length > 0 && (
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Categorical Distribution</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.cat_cols.map((col) => (
              <div key={col}>
                <p className="text-xs text-muted font-medium mb-2">{col}</p>
                <div className="space-y-1.5">
                  {Object.entries(data.cat_summary[col] ?? {}).slice(0, 5).map(([val, count]) => {
                    const total = Object.values(data.cat_summary[col]).reduce((a, b) => a + b, 0)
                    return (
                      <div key={val} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-dim w-24 truncate">{val}</span>
                        <div className="flex-1 h-px bg-surface2">
                          <div className="h-full bg-muted" style={{ width: `${(count / total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-dim">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
