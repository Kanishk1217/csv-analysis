import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from './components/Layout/Navbar'
import { Footer } from './components/Layout/Footer'
import { DropZone } from './components/Upload/DropZone'
import { Tabs } from './components/UI/Tabs'
import { DataPreview } from './components/Dashboard/DataPreview'
import { Statistics } from './components/Dashboard/Statistics'
import { Correlations } from './components/Dashboard/Correlations'
import { Distributions } from './components/Dashboard/Distributions'
import { Visualizations } from './components/Dashboard/Visualizations'
import { MLTraining } from './components/Dashboard/MLTraining'
import { FeatureImportance } from './components/Dashboard/FeatureImportance'
import { useUpload } from './hooks/useUpload'
import { useModel } from './hooks/useModel'
import type { Tab } from './types'

const TABS: { id: Tab; label: string }[] = [
  { id: 'preview',       label: 'Preview' },
  { id: 'statistics',    label: 'Statistics' },
  { id: 'correlations',  label: 'Correlations' },
  { id: 'distributions', label: 'Distributions' },
  { id: 'visualizations',label: 'Visualizations' },
  { id: 'model',         label: 'ML Model' },
  { id: 'features',      label: 'Feature Importance' },
]

const FEATURES = [
  'Instant EDA', 'Correlation Heatmaps', 'Distributions',
  'Custom Charts', 'ML Training', 'Feature Importance',
]

export default function App() {
  const { file, data, loading: uploading, error: uploadError, upload, reset } = useUpload()
  const {
    result, correlations,
    loading: modelLoading, error: modelError,
    train, loadCorrelations,
  } = useModel(file)

  const [tab, setTab] = useState<Tab>('preview')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <main className="flex-1 pt-14">
        <AnimatePresence mode="wait">
          {!data ? (
            /* ── Hero ── */
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-10"
            >
              <div className="text-center space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-primary"
                >
                  CSV Analyzer
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-mono text-dim max-w-md mx-auto"
                >
                  Upload a CSV file to explore your data, compute correlations,
                  train ML models, and inspect feature importances — all in the browser.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap justify-center gap-2"
              >
                {FEATURES.map((f) => (
                  <span key={f} className="px-3 py-1 text-xs font-mono border border-border text-dim">
                    {f}
                  </span>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full"
              >
                <DropZone onFile={upload} loading={uploading} error={uploadError} />
              </motion.div>
            </motion.div>
          ) : (
            /* ── Dashboard ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto px-4 py-6 space-y-6"
            >
              {/* File info bar */}
              <div className="flex items-center justify-between border border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-xs font-mono text-muted">{file?.name}</span>
                  <span className="text-xs font-mono text-dim">
                    {data.rows.toLocaleString()} rows · {data.columns.length} columns
                  </span>
                </div>
                <button
                  onClick={reset}
                  className="text-xs font-mono text-dim hover:text-muted transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              {/* Tabs */}
              <Tabs
                tabs={TABS}
                active={tab}
                onChange={(t) => setTab(t as Tab)}
              />

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === 'preview'        && <DataPreview data={data} />}
                  {tab === 'statistics'     && <Statistics data={data} />}
                  {tab === 'correlations'   && (
                    <Correlations
                      correlations={correlations}
                      loading={modelLoading}
                      onLoad={loadCorrelations}
                    />
                  )}
                  {tab === 'distributions'  && <Distributions data={data} />}
                  {tab === 'visualizations' && <Visualizations data={data} />}
                  {tab === 'model'          && (
                    <MLTraining
                      uploadData={data}
                      onTrain={train}
                      result={result}
                      loading={modelLoading}
                      error={modelError}
                    />
                  )}
                  {tab === 'features'       && <FeatureImportance result={result} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
