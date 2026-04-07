import { motion } from 'framer-motion'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt } from '../../utils/format'
import type { UploadResponse } from '../../types'

export function Statistics({ data }: { data: UploadResponse }) {
  const statCols = Object.keys(data.statistics)
  const statRows = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max']

  const hs = Math.round(
    100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 60
        - (data.duplicates / Math.max(data.shape[0], 1)) * 40
  )
  const hsColor = hs >= 90 ? 'bg-white/80' : hs >= 70 ? 'bg-white/50' : 'bg-white/25'

  const insights: string[] = []
  if (data.duplicates > 0) insights.push(`${data.duplicates.toLocaleString()} duplicate rows detected (${((data.duplicates/data.shape[0])*100).toFixed(1)}%) — removing them improves analysis accuracy.`)
  const heavyMissing = Object.entries(data.missing).filter(([, v]) => v / data.shape[0] > 0.1)
  if (heavyMissing.length) insights.push(`${heavyMissing.length} column(s) have >10% missing values: ${heavyMissing.slice(0,3).map(([c]) => c).join(', ')}.`)
  if (!data.duplicates && !heavyMissing.length) insights.push('No major data quality issues detected — dataset is clean and ready for analysis.')
  insights.push(`${data.numeric_cols.length} numeric and ${data.cat_cols.length} categorical columns found.`)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Data quality score */}
      <div className="glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Data Quality Score</p>
          <span className={`text-2xl font-semibold ${hs >= 90 ? 'text-white' : hs >= 70 ? 'text-white/70' : 'text-white/40'}`}>
            {Math.max(0, Math.min(100, hs))}%
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, hs))}%` }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`h-full ${hsColor}`}
          />
        </div>
        <div className="grid grid-cols-4 gap-4 pt-1">
          {[
            { label: 'Rows',     value: data.shape[0].toLocaleString() },
            { label: 'Columns',  value: data.shape[1] },
            { label: 'Complete', value: `${data.complete_rows.toLocaleString()} rows` },
            { label: 'Memory',   value: `${fmt(data.memory_mb, { dec: 2 })} MB` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">{label}</p>
              <p className="text-sm font-mono text-white/70 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <InsightPanel insights={insights} />

      {/* Descriptive statistics table */}
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
                    {data.statistics[col]?.[row] != null ? fmt(data.statistics[col][row]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Missing values bar chart */}
      {Object.values(data.missing).some((v) => v > 0) && (
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-3">Missing Values</p>
          <div className="space-y-2.5">
            {Object.entries(data.missing).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([col, count]) => (
              <div key={col} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted w-40 truncate">{col}</span>
                <div className="flex-1 h-1 bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / data.shape[0]) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-white/40"
                  />
                </div>
                <span className="text-xs font-mono text-dim w-24 text-right">
                  {count.toLocaleString()} ({((count / data.shape[0]) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorical distribution */}
      {data.cat_cols.length > 0 && (
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Categorical Distribution (Top 5)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.cat_cols.map((col) => {
              const entries = Object.entries(data.cat_summary[col] ?? {}).slice(0, 5)
              const total = Object.values(data.cat_summary[col] ?? {}).reduce((a, b) => a + b, 0)
              return (
                <div key={col}>
                  <p className="text-xs font-mono text-muted mb-2">{col}</p>
                  <div className="space-y-2">
                    {entries.map(([val, count]) => (
                      <div key={val} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-dim w-24 truncate">{val}</span>
                        <div className="flex-1 h-1 bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-white/30 transition-all" style={{ width: `${(count / total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-dim w-10 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
