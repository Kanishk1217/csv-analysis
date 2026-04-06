import { motion } from 'framer-motion'

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-primary grid grid-cols-2 gap-px p-0.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-primary" />
            ))}
          </div>
          <span className="text-sm font-medium text-primary tracking-wide">CSV Analyzer</span>
        </div>
        <span className="text-xs text-dim font-mono">v1.0</span>
      </div>
    </motion.nav>
  )
}
