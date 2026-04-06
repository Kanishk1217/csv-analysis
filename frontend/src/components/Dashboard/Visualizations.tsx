import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { UploadResponse } from '../../types'

type ChartType = 'bar' | 'scatter'

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { color: '#fafafa' },
}

export function Visualizations({ data }: { data: UploadResponse }) {
  const [xCol, setXCol]   = useState(data.columns[0])
  const [yCol, setYCol]   = useState(data.numeric_cols[0] ?? '')
  const [chart, setChart] = useState<ChartType>('bar')

  const barData = Object.entries(
    data.sample.reduce<Record<string, number>>((acc, row) => {
      const key = String(row[xCol])
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  ).slice(0, 20).map(([name, value]) => ({ name, value }))

  const scatterData = data.sample.map((r) => ({ x: Number(r[xCol]), y: Number(r[yCol]) }))
    .filter((d) => !isNaN(d.x) && !isNaN(d.y))

  const s = 'bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select value={chart} onChange={(e) => setChart(e.target.value as ChartType)} className={s}>
          <option value="bar">Bar Chart</option>
          <option value="scatter">Scatter Plot</option>
        </select>
        <select value={xCol} onChange={(e) => setXCol(e.target.value)} className={s}>
          {data.columns.map((c) => <option key={c}>{c}</option>)}
        </select>
        {chart === 'scatter' && (
          <select value={yCol} onChange={(e) => setYCol(e.target.value)} className={s}>
            {data.numeric_cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">
          {chart === 'bar' ? `Frequency — ${xCol}` : `${yCol} vs ${xCol}`}
        </p>
        <ResponsiveContainer width="100%" height={300}>
          {chart === 'bar' ? (
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
              <Tooltip {...TOOLTIP} />
              <Bar dataKey="value" radius={0}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={`rgba(250,250,250,${0.3 + (i / barData.length) * 0.5})`} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <ScatterChart>
              <XAxis dataKey="x" name={xCol} tick={{ fontSize: 10, fill: '#52525b' }} />
              <YAxis dataKey="y" name={yCol} tick={{ fontSize: 10, fill: '#52525b' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} {...TOOLTIP} />
              <Scatter data={scatterData} fill="#fafafa" fillOpacity={0.6} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
