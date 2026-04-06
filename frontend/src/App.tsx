import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from './components/Layout/Navbar'
import { Footer } from './components/Layout/Footer'
import { DropZone } from './components/Upload/DropZone'
import { UploadingScreen } from './components/Upload/UploadingScreen'
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
import { pingServer } from './api/client'
import type { Tab } from './types'

const TABS: { id: Tab; label: string }[] = [
  { id: 'preview',        label: 'Preview' },
  { id: 'statistics',     label: 'Statistics' },
  { id: 'correlations',   label: 'Correlations' },
  { id: 'distributions',  label: 'Distributions' },
  { id: 'visualizations', label: 'Visualizations' },
  { id: 'model',          label: 'ML Model' },
  { id: 'features',       label: 'Features' },
]

const FEATURES = [
  'Instant EDA', 'Correlation Heatmaps', 'Distributions',
  'Custom Charts', 'ML Training', 'Feature Importance',
]

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
}
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function App() {
  const { file, data, loading: uploading, error: uploadError, upload, reset } = useUpload()
  const {
    result, correlations,
    loading: modelLoading, corrLoading, error: modelError,
    train, loadCorrelations,
  } = useModel(file)

  const [tab, setTab] = useState<Tab>('preview')
  const [serverReady, setServerReady] = useState(false)

  useEffect(() => {
    pingServer().finally(() => setServerReady(true))
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      {/* Full-screen upload loading overlay */}
      <AnimatePresence>
        {uploading && file && <UploadingScreen filename={file.name} />}
      </AnimatePresence>

      <main className="flex-1 pt-14">
        <AnimatePresence mode="wait">
          {!data ? (
            /* ── Hero ── */
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.35 }}
              className="relative max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-10 overflow-hidden"
            >
              {/* Background radial glow */}
              <div
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(ellipse at center, #fafafa 0%, transparent 70%)' }}
              />

              <motion.div variants={stagger} initial="initial" animate="animate" className="text-center space-y-5 relative">
                <motion.div variants={fadeUp} className="flex justify-center mb-2">
                  <span className="text-xs font-mono text-dim border border-border/50 px-3 py-1 tracking-widest uppercase">
                    Data Analysis Platform
                  </span>
                </motion.div>
                <motion.h1
                  variants={fadeUp}
                  className="text-5xl sm:text-6xl font-bold tracking-tight text-gradient leading-none"
                >
                  CSV Analyzer
                </motion.h1>
                <motion.p variants={fadeUp} className="text-sm font-mono text-dim max-w-md mx-auto leading-relaxed">
                  Upload a CSV file to explore your data, compute correlations,
                  train ML models, and inspect feature importances.
                </motion.p>
              </motion.div>

              {/* Feature pills with stagger */}
              <motion.div
                variants={stagger}
                initial="initial"
                animate="animate"
                className="flex flex-wrap justify-center gap-2"
              >
                {FEATURES.map((f) => (
                  <motion.span
                    key={f}
                    variants={fadeUp}
                    whileHover={{ borderColor: 'rgba(161,161,170,0.5)', color: '#a1a1aa', transition: { duration: 0.15 } }}
                    className="px-3 py-1 text-xs font-mono border border-border text-dim cursor-default"
                  >
                    {f}
                  </motion.span>
                ))}
              </motion.div>

              <AnimatePresence>
                {!serverReady && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full overflow-hidden"
                  >
                    <div className="flex items-center gap-3 text-xs font-mono text-dim border border-border/50 bg-surface px-4 py-3">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-primary/50"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      Waking up server — first load may take ~30s on free tier
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <DropZone onFile={upload} loading={uploading} error={uploadError} />
              </motion.div>
            </motion.div>
          ) : (
            /* ── Dashboard ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-6xl mx-auto px-4 py-6 space-y-5"
            >
              {/* File info bar */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between border border-border bg-surface px-4 py-3 relative overflow-hidden"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(250,250,250,0.15), transparent)' }}
                />
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-xs font-mono text-muted">{file?.name}</span>
                  <span className="text-[11px] font-mono text-dim border-l border-border pl-3">
                    {data.shape[0].toLocaleString()} rows · {data.columns.length} cols
                  </span>
                </div>
                <motion.button
                  onClick={reset}
                  whileHover={{ color: '#fafafa' }}
                  className="text-xs font-mono text-dim transition-colors"
                >
                  ✕ Close
                </motion.button>
              </motion.div>

              {/* Tabs */}
              <Tabs tabs={TABS} active={tab} onChange={(t) => setTab(t as Tab)} />

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  {tab === 'preview'        && <DataPreview data={data} />}
                  {tab === 'statistics'     && <Statistics data={data} />}
                  {tab === 'correlations'   && (
                    <Correlations correlations={correlations} loading={corrLoading} onLoad={loadCorrelations} />
                  )}
                  {tab === 'distributions'  && <Distributions data={data} />}
                  {tab === 'visualizations' && <Visualizations data={data} />}
                  {tab === 'model'          && (
                    <MLTraining uploadData={data} onTrain={train} result={result} loading={modelLoading} error={modelError} />
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
