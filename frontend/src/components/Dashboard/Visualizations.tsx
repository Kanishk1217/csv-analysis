import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse } from '../../types'

type ChartType = 'bar' | 'scatter'

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { color: '#fafafa' },
}

function pearsonR(data: { x: number; y: number }[]): number | null {
  const n = data.length
  if (n < 3) return null
  const mx = data.reduce((s, d) => s + d.x, 0) / n
  const my = data.reduce((s, d) => s + d.y, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (const d of data) {
    num += (d.x - mx) * (d.y - my)
    dx2 += (d.x - mx) ** 2
    dy2 += (d.y - my) ** 2
  }
  const den = Math.sqrt(dx2 * dy2)
  return den > 0 ? num / den : null
}

export function Visualizations({ data }: { data: UploadResponse }) {
  const [xCol, setXCol]   = useState(data.columns[0])
  const [yCol, setYCol]   = useState(data.numeric_cols[0] ?? '')
  const [chart, setChart] = useState<ChartType>('bar')

  const barData = useMemo(() => Object.entries(
    data.sample.reduce<Record<string, number>>((acc, row) => {
      const key = String(row[xCol])
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, value]) => ({ name, value })), [data.sample, xCol])

  const scatterData = useMemo(() =>
    data.sample.map((r) => ({ x: Number(r[xCol]), y: Number(r[yCol]) }))
      .filter((d) => !isNaN(d.x) && !isNaN(d.y)),
  [data.sample, xCol, yCol])

  // ── Personalized bar note ──
  const barNote = useMemo(() => {
    if (!barData.length) return `No data to display for "${xCol}".`
    const top    = barData[0]
    const total  = barData.reduce((s, d) => s + d.value, 0)
    const topPct = total > 0 ? ((top.value / total) * 100).toFixed(1) : '0'
    const unique = barData.length
    const parts: string[] = []
    parts.push(`"${top.name}" is the most frequent value in ${xCol} — appears ${top.value.toLocaleString()} times (${topPct}% of the sample).`)
    if (unique === 1) parts.push('Only one unique value found — this column may be a constant.')
    else if (unique >= 15) parts.push(`${unique} distinct values shown (up to 20). High cardinality means this column is diverse.`)
    else parts.push(`${unique} distinct values total.`)
    const second = barData[1]
    if (second && top.value > second.value * 3) parts.push(`The top value dominates — it's ${(top.value / second.value).toFixed(1)}× more common than the next.`)
    return parts.join(' ')
  }, [barData, xCol])

  // ── Personalized scatter note ──
  const scatterNote = useMemo(() => {
    if (scatterData.length < 3) return `Not enough numeric data to plot "${xCol}" vs "${yCol}".`
    const r    = pearsonR(scatterData)
    if (r === null) return `Plotting "${xCol}" vs "${yCol}".`
    const rAbs   = Math.abs(r)
    const dir    = r > 0.05 ? 'positive' : r < -0.05 ? 'negative' : 'no clear'
    const str    = rAbs > 0.7 ? 'strong' : rAbs > 0.4 ? 'moderate' : rAbs > 0.2 ? 'weak' : 'very weak'
    const parts: string[] = []
    parts.push(`Correlation r = ${r.toFixed(2)} (${str} ${dir} relationship, ${scatterData.length} points).`)
    if (rAbs > 0.7)
      parts.push(`As "${xCol}" increases, "${yCol}" strongly tends to ${r > 0 ? 'increase' : 'decrease'} — these columns are highly linked.`)
    else if (rAbs > 0.4)
      parts.push(`There's a noticeable ${r > 0 ? 'upward' : 'downward'} trend between the two columns, but with significant spread.`)
    else if (rAbs > 0.2)
      parts.push(`Weak trend — the two columns have some relationship but many exceptions.`)
    else
      parts.push(`The scatter looks like a cloud with no clear pattern — "${xCol}" and "${yCol}" appear mostly independent.`)
    return parts.join(' ')
  }, [scatterData, xCol, yCol])

  const s = 'bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  // Global average for reference line on bar
  const barAvg = barData.length > 0 ? barData.reduce((s, d) => s + d.value, 0) / barData.length : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select value={chart} onChange={(e) => setChart(e.target.value as ChartType)} className={s}>
          <option value="bar">Bar Chart — frequency of values</option>
          <option value="scatter">Scatter Plot — two columns vs each other</option>
        </select>
        <select value={xCol} onChange={(e) => setXCol(e.target.value)} className={s}>
          {(chart === 'scatter' ? data.numeric_cols : data.columns).map((c) => <option key={c}>{c}</option>)}
        </select>
        {chart === 'scatter' && (
          <select value={yCol} onChange={(e) => setYCol(e.target.value)} className={s}>
            {data.numeric_cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Chart */}
      <div className="bg-surface border border-border p-4 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <p className="text-xs font-mono text-dim uppercase tracking-widest">
            {chart === 'bar' ? `Frequency — ${xCol}` : `${yCol} vs ${xCol}`}
          </p>
          {chart === 'scatter' && scatterData.length > 2 && (() => {
            const r = pearsonR(scatterData)
            if (r === null) return null
            const rAbs = Math.abs(r)
            const color = rAbs > 0.7 ? 'text-white/80' : rAbs > 0.4 ? 'text-white/55' : 'text-white/30'
            return <span className={`text-xs font-mono ${color}`}>r = {r.toFixed(3)}</span>
          })()}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {chart === 'bar' ? (
            <BarChart data={barData} barCategoryGap="20%">
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }}
                interval={barData.length > 8 ? 'preserveStartEnd' : 0} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={42} />
              <Tooltip {...TOOLTIP} formatter={(v: number) => [v.toLocaleString(), 'Count']} />
              {barAvg !== null && (
                <ReferenceLine y={barAvg} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4"
                  label={{ value: `avg ${Math.round(barAvg)}`, fill: '#3f3f46', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              )}
              <Bar dataKey="value" radius={0}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={`rgba(250,250,250,${i === 0 ? 0.85 : 0.3 + (1 - i / barData.length) * 0.4})`} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <ScatterChart>
              <XAxis dataKey="x" name={xCol} tickFormatter={fmtAxis} type="number"
                tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
              <YAxis dataKey="y" name={yCol} tickFormatter={fmtAxis} type="number"
                tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={48} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} {...TOOLTIP}
                formatter={(v: number, name: string) => [fmt(v), name === 'x' ? xCol : yCol]} />
              <Scatter data={scatterData} fill="rgba(250,250,250,0.55)" />
            </ScatterChart>
          )}
        </ResponsiveContainer>

        {/* Personalized note */}
        <p className="text-[10px] font-mono text-white/30 leading-relaxed border-t border-white/[0.05] pt-3">
          {chart === 'bar' ? barNote : scatterNote}
        </p>
      </div>

      {/* Quick stats row */}
      {chart === 'bar' && barData.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass p-3">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Top Value</p>
            <p className="text-sm font-mono text-white/80 truncate">{barData[0].name}</p>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">{barData[0].value.toLocaleString()} occurrences</p>
          </div>
          <div className="glass p-3">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Unique Values</p>
            <p className="text-sm font-mono text-white/80">{barData.length}{barData.length === 20 ? '+' : ''}</p>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">in sample of {data.sample.length}</p>
          </div>
          <div className="glass p-3">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Avg Count</p>
            <p className="text-sm font-mono text-white/80">
              {barAvg !== null ? Math.round(barAvg).toLocaleString() : '—'}
            </p>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">per unique value</p>
          </div>
        </div>
      )}

      {chart === 'scatter' && scatterData.length > 2 && (() => {
        const r = pearsonR(scatterData)
        if (r === null) return null
        const rAbs = Math.abs(r)
        const xVals = scatterData.map(d => d.x)
        const yVals = scatterData.map(d => d.y)
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass p-3">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Correlation r</p>
              <p className="text-sm font-mono text-white/80">{r.toFixed(3)}</p>
              <p className="text-[10px] font-mono text-white/25 mt-0.5">
                {rAbs > 0.7 ? 'strong' : rAbs > 0.4 ? 'moderate' : rAbs > 0.2 ? 'weak' : 'negligible'}
              </p>
            </div>
            <div className="glass p-3">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">{xCol} range</p>
              <p className="text-sm font-mono text-white/80">{fmt(Math.min(...xVals))} – {fmt(Math.max(...xVals))}</p>
              <p className="text-[10px] font-mono text-white/25 mt-0.5">{scatterData.length} points</p>
            </div>
            <div className="glass p-3">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">{yCol} range</p>
              <p className="text-sm font-mono text-white/80">{fmt(Math.min(...yVals))} – {fmt(Math.max(...yVals))}</p>
              <p className="text-[10px] font-mono text-white/25 mt-0.5">Y axis</p>
            </div>
          </div>
        )
      })()}
    </motion.div>
  )
}
