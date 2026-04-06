import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Spinner } from '../UI/Spinner'

interface Props {
  onFile: (file: File) => void
  loading: boolean
  error: string | null
}

export function DropZone({ onFile, loading, error }: Props) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onFile(files[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <motion.div
        {...getRootProps()}
        animate={{
          borderColor: isDragActive ? 'rgba(250,250,250,0.6)' : 'rgba(38,38,38,1)',
          backgroundColor: isDragActive ? 'rgba(26,26,26,1)' : 'rgba(17,17,17,1)',
          boxShadow: isDragActive ? '0 0 40px rgba(250,250,250,0.06), inset 0 0 40px rgba(250,250,250,0.02)' : '0 0 0px transparent',
        }}
        whileHover={{ borderColor: 'rgba(82,82,91,1)', backgroundColor: 'rgba(17,17,17,1)' }}
        transition={{ duration: 0.2 }}
        className={`relative border-2 border-dashed p-16 text-center cursor-pointer ${loading ? 'cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {/* Animated corner brackets */}
        {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => {
          const isRight = pos.includes('right')
          const isBottom = pos.includes('bottom')
          return (
            <motion.div
              key={i}
              className={`absolute w-4 h-4 ${pos}`}
              style={{
                borderTop: isBottom ? 'none' : '2px solid',
                borderBottom: isBottom ? '2px solid' : 'none',
                borderLeft: isRight ? 'none' : '2px solid',
                borderRight: isRight ? '2px solid' : 'none',
                borderColor: 'currentColor',
              }}
              animate={{
                color: isDragActive ? '#fafafa' : 'rgba(82,82,91,0.8)',
                scale: isDragActive ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          )
        })}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <Spinner size={28} />
              <div>
                <p className="text-sm text-muted font-medium">Analyzing file…</p>
                <motion.p
                  className="text-xs font-mono text-dim mt-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Processing with ML pipeline
                </motion.p>
              </div>
            </motion.div>
          ) : isDragActive ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-10 h-10 border border-primary/50 flex items-center justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" className="text-primary">
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                </svg>
              </motion.div>
              <p className="text-sm text-primary font-medium">Release to analyze</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-12 h-12 border border-border flex items-center justify-center relative">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" className="text-dim">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-primary font-medium">Drop CSV file or click to browse</p>
                <p className="text-xs text-dim mt-1.5 font-mono">.csv files only · any size</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-xs text-center font-mono text-muted border border-border/60 p-3 bg-surface"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
