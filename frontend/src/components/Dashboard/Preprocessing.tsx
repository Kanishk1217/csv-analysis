import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../UI/Button'
import { MetricBox } from '../UI/MetricBox'
import { Spinner } from '../UI/Spinner'
import { preprocessCSV } from '../../api/client'
import type { UploadResponse, PreprocessResponse } from '../../types'

interface Props {
  data:             UploadResponse
  file:             File
  onPreprocessed?:  (result: PreprocessResponse) => void
}

const SELECT = 'w-full glass border-0 text-white/70 text-xs font-mono px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none cursor-pointer'

function tag(isRec: boolean) {
  return isRec ? ' (Recommended)' : ''
}

/** Derive the best preprocessing strategy purely from upload stats */
function useRecommendations(data: UploadResponse) {
  return useMemo(() => {
    const totalCells = data.shape[0] * Math.max(data.shape[1], 1)
    const missingRate = totalCells > 0 ? data.missing_total / totalCells : 0

    // ── Numeric fill ──
    // Detect skew: compare mean vs median (50th percentile) per column
    let skewedCols = 0
    for (const col of data.numeric_cols) {
      const stat = data.statistics[col]
      if (!stat) continue
      const mean   = stat['mean']   ?? stat['Mean']   ?? null
      const median = stat['50%']    ?? stat['median'] ?? null
      if (mean === null || median === null || median === 0) continue
      const skewRatio = Math.abs((mean - median) / (Math.abs(median) + 1e-6))
      if (skewRatio > 0.2) skewedCols++
    }
    const mostlySkewed = skewedCols > data.numeric_cols.length / 2

    // If >40% of values in any numeric col are missing → drop is better
    const anyHighMissingNum = data.numeric_cols.some(
      (c) => data.shape[0] > 0 && (data.missing[c] ?? 0) / data.shape[0] > 0.4
    )

    let recFillNum: string
    if (anyHighMissingNum) recFillNum = 'drop'
    else if (mostlySkewed)  recFillNum = 'median'
    else                    recFillNum = 'mean'

    // ── Categorical fill ──
    // Mode is almost always correct; suggest "unknown" if cardinality is high
    const highCardCols = data.cat_cols.filter((c) => {
      const summary = data.cat_summary?.[c]
      return summary && Object.keys(summary).length > 20
    })
    const recFillCat = highCardCols.length > data.cat_cols.length / 2 ? 'unknown' : 'mode'

    // ── Scaling ──
    // Robust if outliers likely (skewed data); Standard if clean; None if very few cols
    let recScale: string
    if (data.numeric_cols.length < 2) recScale = 'none'
    else if (mostlySkewed)            recScale = 'robust'
    else                              recScale = 'standard'

    // ── Drop duplicates ──
    const recDropDups = data.duplicates > 0

    // ── Explanation bullets ──
    const reasons: string[] = []
    if (mostlySkewed)
      reasons.push(`${skewedCols} of your numeric column(s) are skewed — Median fill and Robust scaling are more reliable than Mean/Standard for skewed data.`)
    if (anyHighMissingNum)
      reasons.push('At least one numeric column has >40% missing values — dropping those rows is safer than imputing so many blanks.')
    if (!mostlySkewed && !anyHighMissingNum)
      reasons.push('Your numeric data looks fairly symmetric — Mean fill and Standard scaling work well here.')
    if (data.duplicates > 0)
      reasons.push(`${data.duplicates} duplicate rows detected — removing them prevents them from biasing the model.`)
    if (missingRate < 0.01 && data.duplicates === 0)
      reasons.push('Your data is already very clean — minimal preprocessing needed.')

    return { recFillNum, recFillCat, recScale, recDropDups, reasons }
  }, [data])
}

export function Preprocessing({ data, file, onPreprocessed }: Props) {
  const rec = useRecommendations(data)

  const [fillNum,  setFillNum]  = useState(rec.recFillNum)
  const [fillCat,  setFillCat]  = useState(rec.recFillCat)
  const [scale,    setScale]    = useState(rec.recScale)
  const [dropDups, setDropDups] = useState(rec.recDropDups)
  const [result,   setResult]   = useState<PreprocessResponse | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const hasMissingNum = data.numeric_cols.some((c) => (data.missing[c] ?? 0) > 0)
  const hasMissingCat = data.cat_cols.some((c) => (data.missing[c] ?? 0) > 0)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await preprocessCSV(file, fillNum, fillCat, scale, dropDups)
      setResult(res)
      onPreprocessed?.(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preprocessing failed')
    } finally {
      setLoading(false)
    }
  }

  function downloadCSV() {
    if (!result) return
    const blob = new Blob([result.csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `preprocessed_${file.name}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Data quality summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Missing Values" value={data.missing_total} delay={0}    />
        <MetricBox label="Duplicates"     value={data.duplicates}    delay={0.05} />
        <MetricBox label="Numeric Cols"   value={data.numeric_cols.length} delay={0.1} />
        <MetricBox label="Cat Cols"       value={data.cat_cols.length}     delay={0.15} />
      </div>

      {/* Recommendation panel */}
      {rec.reasons.length > 0 && (
        <div className="bg-surface border border-border p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-3">
            Why These Settings Are Recommended For Your File
          </p>
          <ul className="space-y-1.5">
            {rec.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-mono text-white/55 leading-relaxed">
                <span className="text-white/20 flex-shrink-0 mt-0.5">›</span><span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Options panel */}
      <div className="glass p-5 space-y-5">
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Preprocessing Options</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Numeric fill */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">
              Fill Numeric Missing
              {!hasMissingNum && <span className="ml-2 text-white/20">(none found)</span>}
            </p>
            <select value={fillNum} onChange={(e) => setFillNum(e.target.value)} className={SELECT}>
              <option value="mean">Mean{tag(rec.recFillNum === 'mean')}</option>
              <option value="median">Median{tag(rec.recFillNum === 'median')}</option>
              <option value="zero">Zero</option>
              <option value="drop">Drop rows{tag(rec.recFillNum === 'drop')}</option>
            </select>
          </div>

          {/* Categorical fill */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">
              Fill Categorical Missing
              {!hasMissingCat && <span className="ml-2 text-white/20">(none found)</span>}
            </p>
            <select value={fillCat} onChange={(e) => setFillCat(e.target.value)} className={SELECT}>
              <option value="mode">Mode (most frequent){tag(rec.recFillCat === 'mode')}</option>
              <option value="unknown">Fill "Unknown"{tag(rec.recFillCat === 'unknown')}</option>
              <option value="drop">Drop rows</option>
            </select>
          </div>

          {/* Scaling */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">Numeric Scaling</p>
            <select value={scale} onChange={(e) => setScale(e.target.value)} className={SELECT}>
              <option value="none">None{tag(rec.recScale === 'none')}</option>
              <option value="standard">Standard (Z-score){tag(rec.recScale === 'standard')}</option>
              <option value="minmax">Min-Max (0–1)</option>
              <option value="robust">Robust (IQR){tag(rec.recScale === 'robust')}</option>
            </select>
          </div>

          {/* Duplicates */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">
              Duplicates ({data.duplicates})
              {rec.recDropDups && <span className="ml-1 text-white/30 text-[10px]">— drop recommended</span>}
            </p>
            <button
              onClick={() => setDropDups(!dropDups)}
              className={`w-full glass px-3 py-2.5 text-xs font-mono text-left transition-colors
                ${dropDups ? 'text-white border border-white/20' : 'text-white/40 hover:text-white/60'}`}
            >
              {dropDups ? '✓ Drop duplicates' : 'Keep duplicates'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={run} disabled={loading} magnetic size="md">
            {loading ? <><Spinner size={14} /> Processing…</> : 'Apply Preprocessing'}
          </Button>
          {result && (
            <Button onClick={downloadCSV} variant="outline" size="md">
              ↓ Download CSV
            </Button>
          )}
        </div>

        {error && (
          <p className="text-xs font-mono text-white/40 glass px-4 py-3">{error}</p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {/* Before / After stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricBox label="Rows Before"         value={result.rows_before}        delay={0}    />
              <MetricBox label="Rows After"          value={result.rows_after}         delay={0.05} />
              <MetricBox label="Numeric Filled"      value={result.filled_numeric}     delay={0.1}  />
              <MetricBox label="Categorical Filled"  value={result.filled_categorical} delay={0.15} />
            </div>
            <p className="text-[10px] font-mono text-white/25">
              {result.rows_before - result.rows_after > 0
                ? `${(result.rows_before - result.rows_after).toLocaleString()} rows were removed (duplicates or rows with missing values that couldn't be filled).`
                : 'All rows were kept — no rows needed to be dropped.'
              }
              {result.filled_numeric > 0 && ` ${result.filled_numeric.toLocaleString()} numeric blanks were filled.`}
              {result.filled_categorical > 0 && ` ${result.filled_categorical.toLocaleString()} text blanks were filled.`}
            </p>

            {/* Preview table */}
            <div className="glass overflow-x-auto">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-mono text-white/30 uppercase tracking-widest">Preview (first 10 rows)</p>
                <span className="text-[11px] font-mono text-white/20">
                  {result.rows_after.toLocaleString()} rows · {result.cols} cols after
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {result.columns.slice(0, 8).map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-mono text-white/25 whitespace-nowrap">{col}</th>
                    ))}
                    {result.columns.length > 8 && (
                      <th className="px-4 py-2 text-left font-mono text-white/15">+{result.columns.length - 8} more</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((row, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      {result.columns.slice(0, 8).map((col) => (
                        <td key={col} className="px-4 py-2 font-mono text-white/50 whitespace-nowrap">
                          {String(row[col] ?? '—')}
                        </td>
                      ))}
                      {result.columns.length > 8 && <td className="px-4 py-2" />}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
