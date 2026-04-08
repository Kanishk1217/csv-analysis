import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, Cell } from 'recharts'
import { TrustBadge }  from '../UI/TrustBadge'
import { InsightPanel } from '../UI/InsightPanel'
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
  const top10   = features.slice(0, 10).map((f, i) => ({ feature: f, score: scores[i], pct: (scores[i] * 100).toFixed(1) }))
  const cumData = cumulative.map((c, i) => ({ n: i + 1, pct: c }))
  const n80 = cumulative.findIndex((c) => c >= 80) + 1
  const n90 = cumulative.findIndex((c) => c >= 90) + 1

  // Feedback recommendations
  const recs: string[] = []
  const r2  = result.metrics.r2 ?? result.metrics.accuracy ?? null
  if (result.problem_type === 'regression') {
    if ((r2 ?? 0) < 0.5)  recs.push('R² below 0.5 — model performance is weak. Try Gradient Boosting or add more feature columns.')
    if ((r2 ?? 0) > 0.95) recs.push('R² above 0.95 may indicate overfitting — verify on completely new data.')
    if ((r2 ?? 0) >= 0.5 && (r2 ?? 0) <= 0.95) recs.push('Model performance is acceptable. Focus on top features to refine business decisions.')
  } else {
    if ((r2 ?? 0) < 0.7) recs.push('Accuracy below 70% — try more training data or switch to Gradient Boosting.')
    if ((r2 ?? 0) > 0.95) recs.push('Very high accuracy — check for data leakage (a column directly encoding the target).')
  }
  if (scores[0] > 0.5) recs.push(`${features[0]} drives over ${(scores[0]*100).toFixed(0)}% of predictions — highest priority for investigation.`)
  if (n80 <= 3) recs.push(`Only ${n80} feature(s) needed for 80% of predictive power — consider simplifying the model.`)

  const insights = [
    `Top feature: ${features[0]} (${(scores[0]*100).toFixed(1)}% importance).`,
    `${n80} feature(s) cover 80% of predictive power — ${n90} cover 90%.`,
    'Low-importance features can be removed to simplify the model without losing much accuracy.',
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsightPanel insights={insights} />

      {/* Trust badge */}
      {r2 !== null && (
        <div className="glass p-4">
          <TrustBadge value={r2} type={result.problem_type === 'regression' ? 'r2' : 'accuracy'} />
        </div>
      )}

      {/* What this means */}
      {recs.length > 0 && (
        <div className="glass p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-3">What This Means</p>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed">
                <span className="text-white/20 mt-0.5 flex-shrink-0">›</span><span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top 10 bar chart */}
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">
          Top 10 Features — {result.algorithm}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top10} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
            <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'JetBrains Mono' }} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, 'Importance']} />
            <Bar dataKey="score" radius={0}>
              {top10.map((_, i) => (
                <Cell key={i} fill={`rgba(250,250,250,${0.85 - i * 0.07})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] font-mono text-white/25 mt-2">
          Longer bars = more influence on the model's predictions. Features at the top drive the outcome most. Features near the bottom add little value and could be removed to simplify the model.
        </p>
      </div>

      {/* Full table */}
      <div className="bg-surface border border-border overflow-x-auto">
        <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
          Full Importance Table
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Rank', 'Feature', 'Score', 'Share'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                <td className="px-4 py-2 font-mono text-dim">{i + 1}</td>
                <td className="px-4 py-2 font-mono text-muted">{f}</td>
                <td className="px-4 py-2 font-mono text-muted">{scores[i].toFixed(4)}</td>
                <td className="px-4 py-2 font-mono text-primary">{(scores[i] * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cumulative chart */}
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Cumulative Importance</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cumData}>
            <XAxis dataKey="n" tick={{ fontSize: 10, fill: '#52525b' }} label={{ value: 'Features', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#52525b' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => `${v.toFixed(1)}%`} />
            <ReferenceLine y={80} stroke="#52525b" strokeDasharray="4 4" label={{ value: '80%', fontSize: 9, fill: '#52525b' }} />
            <ReferenceLine y={90} stroke="#3f3f46" strokeDasharray="4 4" label={{ value: '90%', fontSize: 9, fill: '#52525b' }} />
            <Line type="monotone" dataKey="pct" stroke="rgba(250,250,250,0.7)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] font-mono text-white/25 mt-2">
          This line shows how much of the model's total predictive power is captured as you add more features (sorted by importance). The dashed lines mark the 80% and 90% thresholds — features beyond the 80% mark often add noise, not signal.
        </p>
        <p className="text-[11px] font-mono text-dim mt-3">
          <span className="text-muted">{n80}</span> feature(s) → 80% ·{' '}
          <span className="text-muted">{n90}</span> feature(s) → 90% ·{' '}
          <span className="text-muted">{features.length}</span> total
        </p>
      </div>
    </motion.div>
  )
}
