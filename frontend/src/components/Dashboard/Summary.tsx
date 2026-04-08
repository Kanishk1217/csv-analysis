import { useState } from 'react'
import { motion } from 'framer-motion'
import { fmt } from '../../utils/format'
import type { UploadResponse, CorrelationResponse } from '../../types'

interface Props {
  data:       UploadResponse
  corrResult: CorrelationResponse | null
}

interface Section { title: string; bullets: string[] }

function buildSummary(data: UploadResponse, corr: CorrelationResponse | null): Section[] {
  const { shape, missing_total, duplicates, numeric_cols, cat_cols, statistics, missing, complete_rows } = data
  const sections: Section[] = []

  // ── 1. Dataset Overview ──
  const completeness = (100 - (missing_total / Math.max(shape[0] * shape[1], 1)) * 100).toFixed(1)
  const overview: string[] = [
    `Your dataset has ${shape[0].toLocaleString()} rows and ${shape[1]} columns — ${numeric_cols.length} numeric and ${cat_cols.length} categorical.`,
    `Data completeness is ${completeness}%. ${complete_rows.toLocaleString()} rows are fully populated.`,
  ]
  if (duplicates > 0)
    overview.push(`${duplicates.toLocaleString()} duplicate rows found (${((duplicates / shape[0]) * 100).toFixed(1)}%) — remove them in the Preprocessing tab for cleaner results.`)
  if (Number(completeness) >= 95)
    overview.push('Excellent data completeness — this dataset is in great shape for analysis.')
  else if (Number(completeness) < 70)
    overview.push('Low completeness may skew results. Impute or drop high-missing columns before modelling.')
  sections.push({ title: 'Dataset Overview', bullets: overview })

  // ── 2. Column Landscape ──
  const landscape: string[] = []
  if (numeric_cols.length)
    landscape.push(`Numeric columns available for ML and statistics: ${numeric_cols.slice(0, 5).join(', ')}${numeric_cols.length > 5 ? ` and ${numeric_cols.length - 5} more` : ''}.`)
  if (cat_cols.length)
    landscape.push(`Categorical columns: ${cat_cols.slice(0, 4).join(', ')}${cat_cols.length > 4 ? ` and ${cat_cols.length - 4} more` : ''}.`)
  if (cat_cols.length > 15)
    landscape.push('Many categorical columns detected — consider encoding or dropping low-cardinality ones before ML training.')
  const heavyMissing = Object.entries(missing).filter(([, v]) => v / shape[0] > 0.2)
  if (heavyMissing.length)
    landscape.push(`${heavyMissing.length} column(s) are missing over 20% of values: ${heavyMissing.slice(0, 3).map(([c]) => c).join(', ')}.`)
  sections.push({ title: 'Column Landscape', bullets: landscape })

  // ── 3. Key Statistics ──
  const findings: string[] = []
  if (numeric_cols.length >= 1) {
    const topMean = numeric_cols.reduce((a, b) =>
      (statistics[a]?.mean ?? 0) > (statistics[b]?.mean ?? 0) ? a : b)
    const mean = statistics[topMean]?.mean
    if (mean) findings.push(`${topMean} has the highest average value at ${fmt(mean)}.`)
  }
  if (numeric_cols.length >= 2) {
    const topStd = numeric_cols.reduce((a, b) =>
      (statistics[a]?.std ?? 0) > (statistics[b]?.std ?? 0) ? a : b)
    const std = statistics[topStd]?.std
    if (std && std > 0) findings.push(`${topStd} shows the most variability (std dev: ${fmt(std)}) — investigate for outliers.`)
  }
  if (corr?.pairs.length) {
    const top = corr.pairs[0]
    const v   = top.correlation ?? 0
    if (Math.abs(v) > 0.6)
      findings.push(`Strong ${v > 0 ? 'positive' : 'negative'} relationship between ${top.feature1} and ${top.feature2} (${v > 0 ? '+' : ''}${v.toFixed(2)}).`)
  }
  if (findings.length) sections.push({ title: 'Key Statistics', bullets: findings })

  // ── 4. Data Quality ──
  const quality: string[] = []
  const missingPct = (missing_total / Math.max(shape[0] * shape[1], 1)) * 100
  if (missingPct > 30)
    quality.push(`Over ${missingPct.toFixed(0)}% of all data is missing — ML results may be unreliable without preprocessing.`)
  else if (missingPct > 0)
    quality.push(`${missingPct.toFixed(1)}% of values are missing. Use the Preprocessing tab to impute or drop them.`)
  else
    quality.push('No missing values detected — your dataset is complete.')
  if (duplicates === 0)
    quality.push('No duplicate rows — data integrity looks good.')
  sections.push({ title: 'Data Quality', bullets: quality })

  // ── 5. Recommended Next Steps ──
  const actions: string[] = []
  if (numeric_cols.length >= 2)
    actions.push('Open the Correlations tab to discover which columns influence each other most.')
  if (numeric_cols.length >= 1)
    actions.push('Use Distributions to spot skewed columns and outliers before modelling.')
  if (heavyMissing.length || duplicates > 0)
    actions.push('Run Preprocessing to clean missing values and remove duplicates before training.')
  if (numeric_cols.length >= 2)
    actions.push('Go to ML Model — select a target column and train a predictive model in one click.')
  if (numeric_cols.length >= 2)
    actions.push('Check Feature Importance after training to learn which columns drive predictions most.')
  sections.push({ title: 'Recommended Next Steps', bullets: actions })

  return sections
}

export function Summary({ data, corrResult }: Props) {
  const sections = buildSummary(data, corrResult)
  const [colSearch, setColSearch] = useState('')
  const filteredCols = data.columns.filter((c) => c.toLowerCase().includes(colSearch.toLowerCase()))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-1">What Your Data Is Telling You</p>
        <p className="text-xs font-mono text-white/40 leading-relaxed">
          A synthesized narrative across all tabs — generated automatically from your dataset.
        </p>
      </div>

      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.07 }}
          className="bg-surface border border-border p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/20">{String(si + 1).padStart(2, '0')}</span>
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-white/50">{section.title}</p>
          </div>
          <ul className="space-y-2.5">
            {section.bullets.map((b, bi) => (
              <motion.li
                key={bi}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: si * 0.07 + bi * 0.04 }}
                className="flex items-start gap-2.5 text-sm font-mono text-white/65 leading-relaxed"
              >
                <span className="text-white/20 mt-1 flex-shrink-0">›</span>
                <span>{b}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ))}
      {/* Column Summary — last block */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-surface border border-border overflow-x-auto"
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 flex-shrink-0">
            Column Summary ({data.columns.length})
          </p>
          <input
            type="text"
            placeholder="Search columns…"
            value={colSearch}
            onChange={(e) => setColSearch(e.target.value)}
            aria-label="Search columns"
            className="w-full max-w-xs bg-transparent border border-border text-xs font-mono text-muted placeholder:text-dim px-3 py-1.5 focus:outline-none focus:border-white/20"
          />
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Column', 'Type', 'Missing', 'Unique Values', 'Mean / Top'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCols.map((col) => {
              const isNum   = data.numeric_cols.includes(col)
              const missing = data.missing[col] ?? 0
              const missPct = data.shape[0] > 0 ? ((missing / data.shape[0]) * 100).toFixed(1) : '0'
              const stat    = data.statistics[col]
              const catData = data.cat_summary?.[col]
              const topCat  = catData ? Object.entries(catData).sort((a, b) => b[1] - a[1])[0]?.[0] : null
              const uniqueCount = catData ? Object.keys(catData).length : null
              return (
                <tr key={col} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted">{col}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${isNum ? 'border-white/15 text-white/50' : 'border-white/10 text-white/35'}`}>
                      {isNum ? 'numeric' : 'categorical'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-dim">
                    {missing > 0 ? <span className="text-muted">{missing} ({missPct}%)</span> : <span className="opacity-30">none</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-dim">
                    {uniqueCount !== null ? uniqueCount : (stat?.count !== null && stat?.count !== undefined ? stat.count : '—')}
                  </td>
                  <td className="px-4 py-2 font-mono text-dim">
                    {isNum && stat?.mean !== null && stat?.mean !== undefined
                      ? fmt(stat.mean)
                      : topCat
                      ? <span className="text-muted truncate max-w-[120px] inline-block">{topCat}</span>
                      : '—'}
                  </td>
                </tr>
              )
            })}
            {filteredCols.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-dim font-mono text-xs">
                  No columns match "{colSearch}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-[10px] font-mono text-white/20 p-3 border-t border-border">
          Missing shows rows without a value for that column. Mean / Top shows the average for numeric columns and the most frequent value for text columns.
        </p>
      </motion.div>
    </motion.div>
  )
}
