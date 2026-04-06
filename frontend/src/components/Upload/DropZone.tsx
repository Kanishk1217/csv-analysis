import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
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

  const corners = ['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                   'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2']

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed p-16 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-primary bg-surface2' : 'border-border hover:border-dim bg-surface'}
          ${loading ? 'cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {corners.map((c, i) => (
          <div key={i} className={`absolute w-3 h-3 border-primary ${c}`} />
        ))}
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size={24} />
            <p className="text-sm text-muted">Analyzing file…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border border-border flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" className="text-dim">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-primary font-medium">
                {isDragActive ? 'Drop your CSV here' : 'Drop CSV file or click to browse'}
              </p>
              <p className="text-xs text-dim mt-1 font-mono">.csv files only</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-3 text-xs text-center font-mono text-muted border border-border p-2">
          {error}
        </motion.p>
      )}
    </motion.div>
  )
}
