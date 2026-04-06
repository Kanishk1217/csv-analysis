import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../UI/Button'
import { MetricBox } from '../UI/MetricBox'
import { Spinner } from '../UI/Spinner'
import { preprocessCSV } from '../../api/client'
import type { UploadResponse, PreprocessResponse } from '../../types'

interface Props {
  data: UploadResponse
  file: File
}

const SELECT = 'w-full glass border-0 text-white/70 text-xs font-mono px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none cursor-pointer'

export function Preprocessing({ data, file }: Props) {
  const [fillNum,   setFillNum]   = useState('mean')
  const [fillCat,   setFillCat]   = useState('mode')
  const [scale,     setScale]     = useState('none')
  const [dropDups,  setDropDups]  = useState(false)
  const [result,    setResult]    = useState<PreprocessResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const hasMissingNum = data.numeric_cols.some((c) => (data.missing[c] ?? 0) > 0)
  const hasMissingCat = data.cat_cols.some((c) => (data.missing[c] ?? 0) > 0)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await preprocessCSV(file, fillNum, fillCat, scale, dropDups)
      setResult(res)
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
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="zero">Zero</option>
              <option value="drop">Drop rows</option>
            </select>
          </div>

          {/* Categorical fill */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">
              Fill Categorical Missing
              {!hasMissingCat && <span className="ml-2 text-white/20">(none found)</span>}
            </p>
            <select value={fillCat} onChange={(e) => setFillCat(e.target.value)} className={SELECT}>
              <option value="mode">Mode (most frequent)</option>
              <option value="unknown">Fill "Unknown"</option>
              <option value="drop">Drop rows</option>
            </select>
          </div>

          {/* Scaling */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">Numeric Scaling</p>
            <select value={scale} onChange={(e) => setScale(e.target.value)} className={SELECT}>
              <option value="none">None</option>
              <option value="standard">Standard (Z-score)</option>
              <option value="minmax">Min-Max (0–1)</option>
              <option value="robust">Robust (IQR)</option>
            </select>
          </div>

          {/* Duplicates */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-mono">Duplicates ({data.duplicates})</p>
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
