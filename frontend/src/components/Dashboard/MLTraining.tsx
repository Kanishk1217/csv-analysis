import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { Button }       from '../UI/Button'
import { MetricBox }    from '../UI/MetricBox'
import { Spinner }      from '../UI/Spinner'
import { TrustBadge }   from '../UI/TrustBadge'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse, TrainResponse } from '../../types'

const REGRESSION_ALGOS     = ['Linear Regression', 'Ridge Regression', 'Decision Tree', 'Random Forest', 'Gradient Boosting']
const CLASSIFICATION_ALGOS = ['Logistic Regression', 'Decision Tree', 'Random Forest', 'Gradient Boosting']

const TARGET_KEYWORDS = ['target', 'label', 'outcome', 'price', 'revenue', 'sales', 'churn', 'default',
  'survived', 'status', 'grade', 'score', 'result', 'y', 'class', 'category', 'output', 'output_col',
  'predicted', 'diagnosis', 'fraud', 'spam', 'sentiment', 'rating', 'quality', 'satisfaction']

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { color: '#fafafa' },
}

interface SmartRec {
  targetCol:   string
  targetReason: string
  algo:        string
  algoReason:  string
  taskType:    'regression' | 'classification'
  warnings:    string[]
}

function useSmartRec(uploadData: UploadResponse): SmartRec {
  return useMemo(() => {
    const rows    = uploadData.shape[0]
    const allCols = uploadData.columns.filter((c) => {
      const cl = c.toLowerCase()
      return !['id', 'index', 'idx'].includes(cl) && !cl.endsWith('_id') && !cl.startsWith('id_')
    })

    // ── Pick best target column ──
    // 1. Name matches a keyword
    const byKeyword = allCols.find((c) =>
      TARGET_KEYWORDS.some((kw) => c.toLowerCase().includes(kw))
    )
    // 2. Last column (common ML convention)
    const lastCol = allCols[allCols.length - 1] ?? uploadData.columns[0]
    const targetCol = byKeyword ?? lastCol

    const isNumericTarget = uploadData.numeric_cols.includes(targetCol)
    const taskType = isNumericTarget ? 'regression' : 'classification'

    const targetReason = byKeyword
      ? `"${targetCol}" matches a common ML target keyword.`
      : `"${targetCol}" is the last column — a common convention for the prediction target.`

    // ── Pick best algorithm ──
    let algo: string
    let algoReason: string

    if (taskType === 'regression') {
      if (rows < 300) {
        algo = 'Linear Regression'
        algoReason = `Small dataset (${rows.toLocaleString()} rows) — linear models generalize better and avoid overfitting.`
      } else if (rows < 5000) {
        algo = 'Random Forest'
        algoReason = `Medium-sized dataset (${rows.toLocaleString()} rows) — Random Forest handles non-linear patterns well without heavy tuning.`
      } else {
        algo = 'Gradient Boosting'
        algoReason = `Large dataset (${rows.toLocaleString()} rows) — Gradient Boosting delivers top accuracy when you have enough data.`
      }
    } else {
      if (rows < 300) {
        algo = 'Logistic Regression'
        algoReason = `Small dataset (${rows.toLocaleString()} rows) — Logistic Regression is stable and interpretable for small classification problems.`
      } else if (rows < 5000) {
        algo = 'Random Forest'
        algoReason = `Medium dataset (${rows.toLocaleString()} rows) — Random Forest is robust to noise and works well out of the box.`
      } else {
        algo = 'Gradient Boosting'
        algoReason = `Large dataset (${rows.toLocaleString()} rows) — Gradient Boosting typically achieves the highest accuracy at scale.`
      }
    }

    // ── Warnings ──
    const warnings: string[] = []
    if (rows < 100)
      warnings.push(`Very small dataset (${rows} rows) — results may not generalise. Collect more data for reliable predictions.`)
    const featureCount = allCols.length - 1
    if (featureCount < 2)
      warnings.push('Very few feature columns — add more columns to improve prediction quality.')
    if (uploadData.missing_total > 0)
      warnings.push(`${uploadData.missing_total.toLocaleString()} missing values detected — run Preprocessing first to fill or drop them.`)
    if (uploadData.duplicates > 0)
      warnings.push(`${uploadData.duplicates} duplicate rows — these inflate training metrics. Deduplicate in Preprocessing.`)

    return { targetCol, targetReason, algo, algoReason, taskType, warnings }
  }, [uploadData])
}

interface Props {
  uploadData: UploadResponse
  onTrain:    (target: string, algo: string, testSize: number) => Promise<void>
  result:     TrainResponse | null
  loading:    boolean
  error:      string | null
}

export function MLTraining({ uploadData, onTrain, result, loading, error }: Props) {
  const rec = useSmartRec(uploadData)

  // Exclude pure ID columns from target (high cardinality integers)
  const validTargets = uploadData.columns.filter((c) => {
    const col = c.toLowerCase()
    return !['id', 'index', 'idx'].includes(col) && !col.endsWith('_id') && !col.startsWith('id_')
  })

  const [target,   setTarget]   = useState(rec.targetCol)
  const [algo,     setAlgo]     = useState(rec.algo)
  const [testSize, setTestSize] = useState(20)

  const isReg  = uploadData.numeric_cols.includes(target)
  const algos  = isReg ? REGRESSION_ALGOS : CLASSIFICATION_ALGOS
  const s      = 'w-full bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  // Reset algo when target type changes
  function handleTargetChange(col: string) {
    setTarget(col)
    const newIsReg = uploadData.numeric_cols.includes(col)
    if (newIsReg !== isReg) setAlgo(newIsReg ? rec.algo : rec.algo)
  }

  const avpData = result?.actual_vs_predicted
    ? result.actual_vs_predicted.actual.map((a, i) => ({
        actual:    a,
        predicted: result.actual_vs_predicted!.predicted[i],
      }))
    : []

  const allVals = avpData.flatMap((d) => [d.actual, d.predicted])
  const minVal  = allVals.length ? Math.min(...allVals) : 0
  const maxVal  = allVals.length ? Math.max(...allVals) : 1
  const refLine = [{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Smart Recommendation Panel ── */}
      <div className="bg-surface border border-border p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Smart Training Recommendation</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target recommendation */}
          <div className="glass p-3 space-y-1.5">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Recommended Target</p>
            <p className="text-sm font-mono text-white/80">{rec.targetCol}</p>
            <p className="text-[10px] font-mono text-white/35 leading-relaxed">{rec.targetReason}</p>
            <span className="inline-block text-[9px] font-mono border border-white/10 px-1.5 py-0.5 text-white/30 uppercase tracking-widest">
              {rec.taskType === 'regression' ? 'Regression task — numeric output' : 'Classification task — category output'}
            </span>
          </div>

          {/* Algorithm recommendation */}
          <div className="glass p-3 space-y-1.5">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Recommended Algorithm</p>
            <p className="text-sm font-mono text-white/80">{rec.algo}</p>
            <p className="text-[10px] font-mono text-white/35 leading-relaxed">{rec.algoReason}</p>
            <span className="inline-block text-[9px] font-mono border border-white/10 px-1.5 py-0.5 text-white/30 uppercase tracking-widest">
              {uploadData.shape[0].toLocaleString()} rows · {(validTargets.length - 1)} features
            </span>
          </div>
        </div>

        {rec.warnings.length > 0 && (
          <ul className="space-y-1.5 border-t border-white/[0.06] pt-3">
            {rec.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-mono text-white/40 leading-relaxed">
                <span className="text-white/20 flex-shrink-0">⚠</span><span>{w}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[10px] font-mono text-white/20">
          These are suggestions based on your data shape — feel free to change them below and experiment.
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="bg-surface border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Target Column</p>
          <select value={target} onChange={(e) => handleTargetChange(e.target.value)} className={s}>
            {validTargets.map((c) => (
              <option key={c} value={c}>
                {c}{c === rec.targetCol ? ' (recommended)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs font-mono text-dim mt-1">
            Task: <span className="text-muted">{isReg ? 'Regression' : 'Classification'}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Algorithm</p>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)} className={s}>
            {algos.map((a) => (
              <option key={a} value={a}>
                {a}{a === rec.algo ? ' (recommended)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Test Split: {testSize}%</p>
          <input type="range" min={10} max={40} step={5} value={testSize}
            onChange={(e) => setTestSize(Number(e.target.value))} className="w-full accent-primary" />
          <p className="text-[10px] font-mono text-white/20 mt-1">
            {Math.round(uploadData.shape[0] * (1 - testSize / 100))} train · {Math.round(uploadData.shape[0] * testSize / 100)} test rows
          </p>
          <Button className="w-full mt-3" onClick={() => onTrain(target, algo, testSize)} disabled={loading}>
            {loading ? <><Spinner size={14} /><span className="ml-2">Training…</span></> : 'Train Model'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox label="Algorithm"     value={result.algorithm}     />
            <MetricBox label="Train Samples" value={result.train_samples} />
            <MetricBox label="Test Samples"  value={result.test_samples}  />
            <MetricBox label="Features"      value={result.features}      />
          </div>

          {/* ── Regression results ── */}
          {result.problem_type === 'regression' && result.metrics && (
            <>
              <div className="glass p-4">
                <TrustBadge value={result.metrics.r2 ?? 0} type="r2" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="glass p-4">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">R² Score</p>
                  <p className="text-2xl font-semibold text-white">{result.metrics.r2?.toFixed(4) ?? '—'}</p>
                  <p className="text-[10px] font-mono text-white/20 mt-1">
                    {(result.metrics.r2 ?? 0) >= 0.8 ? 'Excellent fit' : (result.metrics.r2 ?? 0) >= 0.5 ? 'Moderate fit' : 'Poor fit'}
                  </p>
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">RMSE</p>
                  <p className="text-2xl font-semibold text-white">{fmt(result.metrics.rmse)}</p>
                  <p className="text-[10px] font-mono text-white/20 mt-1">avg error in target units</p>
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">MAE</p>
                  <p className="text-2xl font-semibold text-white">{fmt(result.metrics.mae)}</p>
                  <p className="text-[10px] font-mono text-white/20 mt-1">mean absolute error</p>
                </div>
              </div>

              {/* Personalized regression note */}
              <div className="glass p-4 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">What This Means</p>
                <ul className="space-y-2">
                  {(() => {
                    const r2     = result.metrics.r2 ?? 0
                    const rmse   = result.metrics.rmse ?? 0
                    const total  = result.train_samples + result.test_samples
                    const items: string[] = []

                    if (r2 >= 0.9)
                      items.push(`R² = ${r2.toFixed(3)} — the model explains ${(r2*100).toFixed(1)}% of variance in "${target}". This is excellent predictive power.`)
                    else if (r2 >= 0.7)
                      items.push(`R² = ${r2.toFixed(3)} — the model explains ${(r2*100).toFixed(1)}% of variance in "${target}". Good fit, but some variance remains unexplained.`)
                    else if (r2 >= 0.5)
                      items.push(`R² = ${r2.toFixed(3)} — the model explains ${(r2*100).toFixed(1)}% of variance in "${target}". Moderate fit — try Gradient Boosting or add more features.`)
                    else
                      items.push(`R² = ${r2.toFixed(3)} — the model explains only ${(r2*100).toFixed(1)}% of variance. Low fit — "${target}" may not be predictable from these columns, or data needs cleaning.`)

                    if (rmse > 0)
                      items.push(`RMSE = ${fmt(rmse)} — on average, predictions are off by ±${fmt(rmse)} in the same units as "${target}".`)

                    if (r2 > 0.95)
                      items.push('Very high R² — verify there is no data leakage (a column that encodes the target directly).')

                    if (total < 200)
                      items.push(`Only ${total} total rows — results may not generalise to new data. Collect more data if possible.`)

                    if (result.features < 3)
                      items.push('Very few features — adding more relevant columns usually improves R² significantly.')

                    return items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed">
                        <span className="text-white/20 mt-0.5 flex-shrink-0">›</span><span>{it}</span>
                      </li>
                    ))
                  })()}
                </ul>
              </div>

              {avpData.length > 0 && (
                <div className="bg-surface border border-border p-4 space-y-3">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">Actual vs Predicted — {target}</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart>
                      <XAxis dataKey="x" type="number" domain={[minVal, maxVal]} tickFormatter={fmtAxis}
                        tick={{ fontSize: 10, fill: '#52525b' }} name="Actual" />
                      <YAxis dataKey="y" type="number" domain={[minVal, maxVal]} tickFormatter={fmtAxis}
                        tick={{ fontSize: 10, fill: '#52525b' }} name="Predicted" />
                      <Tooltip {...TOOLTIP} formatter={(v: number) => fmt(v)} />
                      <Line data={refLine} dataKey="y" dot={false} stroke="rgba(255,255,255,0.15)"
                        strokeWidth={1.5} strokeDasharray="4 4" legendType="none" />
                      <Scatter data={avpData} fill="rgba(250,250,250,0.5)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] font-mono text-white/25">
                    Each dot is one test row. The dashed diagonal is the "perfect prediction" line — dots close to it mean the model predicted correctly.
                    {avpData.length > 0 && (() => {
                      const errors = avpData.map(d => Math.abs(d.actual - d.predicted))
                      const pct10  = errors.filter(e => e <= (maxVal - minVal) * 0.1).length
                      return ` ${((pct10 / avpData.length) * 100).toFixed(0)}% of test predictions are within 10% of the actual range.`
                    })()}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Classification results ── */}
          {result.problem_type === 'classification' && result.metrics && (
            <>
              <div className="glass p-4">
                <TrustBadge value={result.metrics.accuracy ?? 0} type="accuracy" />
              </div>

              <div className="glass p-5">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Accuracy</p>
                <p className="text-3xl font-semibold text-white">
                  {((result.metrics.accuracy ?? 0) * 100).toFixed(1)}%
                </p>
                <div className="mt-3 h-1 bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(result.metrics.accuracy ?? 0) * 100}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-white/50"
                  />
                </div>
              </div>

              {/* Personalized classification note */}
              <div className="glass p-4 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">What This Means</p>
                <ul className="space-y-2">
                  {(() => {
                    const acc   = result.metrics.accuracy ?? 0
                    const total = result.train_samples + result.test_samples
                    const items: string[] = []

                    if (acc >= 0.95)
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — the model correctly classifies "${target}" nearly all the time. Check for data leakage if this seems too high.`)
                    else if (acc >= 0.8)
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — the model correctly classifies ${Math.round(acc * result.test_samples)} out of ${result.test_samples} test rows for "${target}". Solid performance.`)
                    else if (acc >= 0.65)
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — moderate. The model gets "${target}" right more often than random guessing. Try Gradient Boosting for improvement.`)
                    else
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — below 65%. "${target}" may be hard to predict from these columns. Check class balance in the report below.`)

                    if (total < 200)
                      items.push(`Only ${total} rows total — classification models need more data to learn reliable boundaries.`)

                    if (acc > 0.95)
                      items.push('Suspiciously high accuracy — check if any feature column directly encodes the class label (data leakage).')

                    return items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed">
                        <span className="text-white/20 mt-0.5 flex-shrink-0">›</span><span>{it}</span>
                      </li>
                    ))
                  })()}
                </ul>
              </div>

              {result.classification_report && (
                <div className="bg-surface border border-border overflow-x-auto">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
                    Classification Report — "{target}"
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {['Class', 'Precision', 'Recall', 'F1-Score', 'Support'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.classification_report)
                        .filter(([k]) => !['accuracy', 'macro avg', 'weighted avg'].includes(k))
                        .map(([cls, vals]) => (
                          <tr key={cls} className="border-b border-border/50 hover:bg-surface2">
                            <td className="px-4 py-2 font-mono text-muted">{cls}</td>
                            {['precision', 'recall', 'f1-score', 'support'].map((m) => (
                              <td key={m} className="px-4 py-2 font-mono text-muted">
                                {typeof vals === 'object' ? (vals as Record<string, number>)[m]?.toFixed(3) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] font-mono text-white/20 p-4">
                    Precision = when the model predicts a class, how often is it right. Recall = of all actual cases, how many did the model catch. F1 = balance of both. Low support = few examples of that class.
                  </p>
                </div>
              )}

              {result.confusion_matrix && (
                <div className="bg-surface border border-border p-4 space-y-3">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">Confusion Matrix</p>
                  <p className="text-[10px] font-mono text-white/25">Diagonal cells (lighter) = correct predictions. Off-diagonal = mistakes.</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      {result.confusion_matrix.map((row, i) => (
                        <tr key={i}>
                          {row.map((val, j) => {
                            const mx = Math.max(...result.confusion_matrix!.flat())
                            const isCorrect = i === j
                            return (
                              <td key={j} className="w-14 h-14 text-center font-mono border border-border"
                                style={{ backgroundColor: `rgba(${isCorrect ? '250,250,250' : '100,130,180'},${val / Math.max(mx, 1) * 0.7})` }}>
                                <span className="font-semibold">{val}</span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
