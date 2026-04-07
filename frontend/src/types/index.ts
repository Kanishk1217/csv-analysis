export interface UploadResponse {
  shape: [number, number]
  columns: string[]
  dtypes: Record<string, string>
  preview: Record<string, unknown>[]
  sample: Record<string, unknown>[]
  missing: Record<string, number>
  missing_total: number
  duplicates: number
  complete_rows: number
  memory_mb: number
  numeric_cols: string[]
  cat_cols: string[]
  statistics: Record<string, Record<string, number | null>>
  cat_summary: Record<string, Record<string, number>>
}

export interface CorrelationResponse {
  original: { columns: string[]; matrix: number[][] }
  cleaned:  { columns: string[]; matrix: number[][] }
  pairs: { feature1: string; feature2: string; correlation: number }[]
  error?: string
}

export interface TrainResponse {
  algorithm: string
  problem_type: 'regression' | 'classification'
  train_samples: number
  test_samples: number
  features: number
  metrics: {
    r2?: number
    rmse?: number
    mae?: number
    accuracy?: number
  }
  actual_vs_predicted?: { actual: number[]; predicted: number[] }
  classification_report?: Record<string, Record<string, number> | number>
  confusion_matrix?: number[][]
  feature_importance?: {
    features: string[]
    scores: number[]
    cumulative: number[]
  }
  error?: string
}

export interface PreprocessResponse {
  rows_before: number
  rows_after: number
  cols: number
  filled_numeric: number
  filled_categorical: number
  preview: Record<string, unknown>[]
  columns: string[]
  csv: string
}

export type Tab =
  | 'preview'
  | 'statistics'
  | 'correlations'
  | 'distributions'
  | 'visualizations'
  | 'preprocessing'
  | 'model'
  | 'features'
  | 'summary'
