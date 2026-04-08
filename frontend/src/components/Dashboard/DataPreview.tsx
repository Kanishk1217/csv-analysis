import { useState } from 'react'
import { motion } from 'framer-motion'
import { MetricBox } from '../UI/MetricBox'
import type { UploadResponse } from '../../types'

export function DataPreview({ data }: { data: UploadResponse }) {
  const [search, setSearch] = useState('')
  const cols = data.columns

  const filteredCols = cols.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  )

  const filteredRows = data.preview.filter((row) =>
    !search || cols.some((col) =>
      String(row[col] ?? '').toLowerCase().includes(search.toLowerCase())
    )
  )

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

      {/* Search bar */}
      <div className="bg-surface border border-border p-3 flex items-center gap-3">
        <span className="text-dim font-mono text-xs flex-shrink-0">Search</span>
        <input
          type="text"
          placeholder="Filter columns or rows by value…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search columns and rows"
          className="w-full bg-transparent border border-border text-xs font-mono text-muted placeholder:text-dim px-3 py-1.5 focus:outline-none focus:border-white/20"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-dim text-xs font-mono hover:text-white transition-colors flex-shrink-0"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* All Columns block */}
      <div className="bg-surface border border-border p-4 space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">
          All Columns ({filteredCols.length}{search ? ` of ${cols.length}` : ''})
        </p>
        <div className="flex flex-wrap gap-2">
          {filteredCols.map((col) => {
            const isNum  = data.numeric_cols.includes(col)
            const missing = data.missing[col] ?? 0
            const missPct = data.shape[0] > 0 ? ((missing / data.shape[0]) * 100).toFixed(0) : '0'
            const color = isNum
              ? 'border-white/15 text-white/60'
              : 'border-white/10 text-white/40'
            return (
              <div
                key={col}
                className={`flex items-center gap-1.5 border px-2 py-1 text-[11px] font-mono ${color}`}
                title={`${col} — ${data.dtypes[col] ?? ''}${missing > 0 ? ` · ${missPct}% missing` : ''}`}
              >
                <span>{col}</span>
                <span className="text-white/20">{isNum ? '#' : 'T'}</span>
                {missing > 0 && (
                  <span className="text-white/30 text-[9px]">{missPct}%↯</span>
                )}
              </div>
            )
          })}
          {filteredCols.length === 0 && (
            <p className="text-xs font-mono text-dim">No columns match "{search}"</p>
          )}
        </div>
        <p className="text-[10px] font-mono text-white/20">
          # = numeric · T = text/categorical · %↯ = percentage missing
        </p>
      </div>

      {/* Preview table */}
      <div className="bg-surface border border-border overflow-x-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <p className="text-xs font-mono text-dim uppercase tracking-widest">
            Preview — {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}{search ? ' matching' : ` of first ${data.preview.length}`}
          </p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {cols.map((col) => (
                <th key={col} className="px-4 py-2 text-left font-mono text-dim whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                {cols.map((col) => (
                  <td key={col} className="px-4 py-2 text-muted font-mono whitespace-nowrap">
                    {String(row[col] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-dim font-mono text-xs">
                  No rows match "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-[10px] font-mono text-white/20 p-3 border-t border-border">
          Showing a sample of your data. Use the Preprocessing tab to clean missing values before running ML models.
        </p>
      </div>
    </motion.div>
  )
}
