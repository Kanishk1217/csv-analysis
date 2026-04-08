import { useState } from 'react'
import { DataPreview }      from './DataPreview'
import { Statistics }       from './Statistics'
import { Correlations }     from './Correlations'
import { Distributions }    from './Distributions'
import { Visualizations }   from './Visualizations'
import { Preprocessing }    from './Preprocessing'
import { MLTraining }       from './MLTraining'
import { FeatureImportance } from './FeatureImportance'
import { Summary }          from './Summary'
import { AlertBanner }      from '../UI/AlertBanner'
import { ColumnRenamer }    from '../UI/ColumnRenamer'
import type { Tab, UploadResponse, CorrelationResponse, TrainResponse } from '../../types'

interface ModelState {
  result:        TrainResponse | null
  correlations:  CorrelationResponse | null
  loading:       boolean
  corrLoading:   boolean
  error:         string | null
  train:         (target: string, algo: string, testSize: number) => Promise<void>
  loadCorrelations: () => void
}

interface Props {
  data:      UploadResponse
  file:      File | null
  model:     ModelState
  tab:       Tab
  filename:  string
  compact?:  boolean        // true in side-by-side mode → smaller padding
  onRemove?: () => void     // undefined for primary slot (use global reset)
}

export function SlotContent({ data, file, model, tab, filename, compact, onRemove }: Props) {
  const [renameMap, setRenameMap] = useState<Record<string, string>>({})

  return (
    <div className="space-y-3">
      {/* Slot header */}
      <div className={`glass flex items-center justify-between gap-2 ${compact ? 'px-3 py-2' : 'px-5 py-3'} relative overflow-hidden`}>
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
          aria-hidden="true" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0"
            style={{ boxShadow: '0 0 4px rgba(255,255,255,0.3)' }} />
          <span className="text-xs font-mono text-white/60 truncate">{filename}</span>
          <span className="text-[10px] font-mono text-white/25 border-l border-white/10 pl-2 flex-shrink-0">
            {data.shape[0].toLocaleString()} rows · {data.columns.length} cols
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!compact && <ColumnRenamer columns={data.columns} renameMap={renameMap} onChange={setRenameMap} />}
          {onRemove && (
            <button onClick={onRemove}
              className="text-xs font-mono text-white/25 hover:text-white/60 transition-colors"
              aria-label={`Remove ${filename}`}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner data={data} />

      {/* Tab content */}
      <div className={compact ? 'text-[0.8rem]' : ''}>
        {tab === 'summary'        && <Summary data={data} corrResult={model.correlations} />}
        {tab === 'preview'        && <DataPreview data={data} />}
        {tab === 'statistics'     && <Statistics data={data} />}
        {tab === 'correlations'   && (
          <Correlations
            correlations={model.correlations}
            loading={model.corrLoading}
            onLoad={model.loadCorrelations}
          />
        )}
        {tab === 'distributions'  && <Distributions data={data} />}
        {tab === 'visualizations' && <Visualizations data={data} />}
        {tab === 'preprocessing'  && file
          ? <Preprocessing data={data} file={file} />
          : tab === 'preprocessing' && (
            <p className="text-xs font-mono text-dim py-8 text-center">Re-upload this file to run preprocessing.</p>
          )
        }
        {tab === 'model'          && (
          <MLTraining
            uploadData={data}
            onTrain={model.train}
            result={model.result}
            loading={model.loading}
            error={model.error}
          />
        )}
        {tab === 'features'       && <FeatureImportance result={model.result} />}
      </div>
    </div>
  )
}
