import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'
import type { TrainResponse } from '../../types'

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { color: '#fafafa' },
}

export function FeatureImportance({ result }: { result: TrainResponse | null }) {
  if (!result) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-dim font-mono">Train a model in the ML Model tab first.</p>
    </div>
  )
  if (!result.feature_importance) return (
    <p className="text-sm text-dim font-mono py-8 text-center">
      {result.algorithm} does not provide feature importances.
    </p>
  )

  const { features, scores, cumulative } = result.feature_importance
  const top10    = features.slice(0, 10).map((f, i) => ({ feature: f, score: scores[i] }))
  const cumData  = cumulative.map((c, i) => ({ n: i + 1, pct: c }))
  const n80 = cumulative.findIndex((c) => c >= 80) + 1
  const n90 = cumulative.findIndex((c) => c >= 90) + 1

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">
          Top 10 Feature Importances — {result.algorithm}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top10} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
            <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'JetBrains Mono' }} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => v.toFixed(6)} />
            <Bar dataKey="score" fill="#fafafa" fillOpacity={0.7} radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface border border-border overflow-x-auto">
        <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
          Full Importance Table
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Rank', 'Feature', 'Score', '%'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                <td className="px-4 py-2 font-mono text-dim">{i + 1}</td>
                <td className="px-4 py-2 font-mono text-muted">{f}</td>
                <td className="px-4 py-2 font-mono text-muted">{scores[i].toFixed(6)}</td>
                <td className="px-4 py-2 font-mono text-primary">{(scores[i] * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Cumulative Importance</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={cumData}>
            <XAxis dataKey="n" tick={{ fontSize: 10, fill: '#52525b' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b' }} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => `${v.toFixed(1)}%`} />
            <ReferenceLine y={80} stroke="#52525b" strokeDasharray="4 4" label={{ value: '80%', fontSize: 9, fill: '#52525b' }} />
            <ReferenceLine y={90} stroke="#3f3f46" strokeDasharray="4 4" label={{ value: '90%', fontSize: 9, fill: '#52525b' }} />
            <Line type="monotone" dataKey="pct" stroke="#fafafa" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs font-mono text-dim mt-3">
          <span className="text-muted">{n80}</span> features → 80% ·{' '}
          <span className="text-muted">{n90}</span> features → 90% ·{' '}
          <span className="text-muted">{features.length}</span> total
        </p>
      </div>
    </motion.div>
  )
}
