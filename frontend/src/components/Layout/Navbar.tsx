import { motion } from 'framer-motion'

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6 border-b border-white/[0.06]"
      style={{
        background: 'rgba(10,10,10,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-6 h-6 border border-white/20 grid grid-cols-2 gap-px p-[3px] overflow-hidden">
          {[1, 0.4, 0.4, 1].map((op, i) => (
            <div key={i} className="bg-primary" style={{ opacity: op }} />
          ))}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          />
        </div>
        <span className="text-sm font-semibold tracking-tight text-gradient">CSV Analyzer</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <motion.span
          className="text-xs font-mono text-dim border border-border/50 px-2 py-0.5"
          animate={{ borderColor: ['rgba(38,38,38,0.5)', 'rgba(161,161,170,0.3)', 'rgba(38,38,38,0.5)'] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          v1.0
        </motion.span>
      </div>
    </motion.header>
  )
}
