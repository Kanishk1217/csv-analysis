import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  UploadResponse, CorrelationResponse, TrainResponse, PreprocessResponse
} from '../../types/index'

// ── Palette ──────────────────────────────────────────────────────────────────
const BG:    [number,number,number] = [8,  8,  8 ]
const CARD:  [number,number,number] = [18, 18, 18]
const LINE:  [number,number,number] = [36, 36, 36]
const DIM:   [number,number,number] = [80, 80, 80]
const BODY:  [number,number,number] = [180,180,180]
const WHITE: [number,number,number] = [240,240,240]
const ACC:   [number,number,number] = [56, 189,248] // sky-400
const ACC2:  [number,number,number] = [99, 102,241] // indigo-500

const W = 210
const ML = 14
const MR = 14
const CW = W - ML - MR

let _y = 0
let _doc: jsPDF

function newPage() {
  _doc.addPage()
  _doc.setFillColor(...BG)
  _doc.rect(0, 0, W, 297, 'F')
  _y = 18
}

function chk(needed: number) {
  if (_y + needed > 278) newPage()
}

function secHeader(title: string, sub?: string) {
  chk(18)
  _doc.setFillColor(...ACC)
  _doc.rect(ML, _y, 2, sub ? 10 : 8, 'F')
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(11)
  _doc.setTextColor(...WHITE)
  _doc.text(title, ML + 5, _y + (sub ? 4.5 : 5.5))
  if (sub) {
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7.5)
    _doc.setTextColor(...DIM)
    _doc.text(sub, ML + 5, _y + 9)
  }
  _y += (sub ? 14 : 11)
  _doc.setDrawColor(...LINE)
  _doc.setLineWidth(0.3)
  _doc.line(ML, _y, ML + CW, _y)
  _y += 4
}

function bul(text: string) {
  chk(6)
  _doc.setFillColor(...ACC)
  _doc.circle(ML + 1.5, _y - 0.8, 0.9, 'F')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(8)
  _doc.setTextColor(...BODY)
  const lines = _doc.splitTextToSize(text, CW - 6) as string[]
  _doc.text(lines, ML + 5, _y)
  _y += lines.length * 4.2 + 1
}

function statRow(items: { label: string; value: string }[]) {
  const cols = items.length
  const cw   = CW / cols
  chk(14)
  items.forEach((item, i) => {
    const x = ML + i * cw
    _doc.setFillColor(...CARD)
    _doc.roundedRect(x, _y, cw - 2, 13, 1.5, 1.5, 'F')
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...DIM)
    _doc.text(item.label, x + cw / 2 - 1, _y + 4.5, { align: 'center' })
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9)
    _doc.setTextColor(...ACC)
    _doc.text(item.value, x + cw / 2 - 1, _y + 10.5, { align: 'center' })
  })
  _y += 16
}

function tbl(
  head: string[],
  body: (string | number)[][],
  opts?: { colWidths?: number[] }
) {
  if (!body.length) return
  chk(20)
  autoTable(_doc, {
    startY: _y,
    head:   [head],
    body:   body.map(r => r.map(c => String(c))),
    margin: { left: ML, right: MR },
    styles: {
      font:      'helvetica',
      fontSize:  7.5,
      cellPadding: 2.5,
      fillColor: CARD,
      textColor: BODY,
      lineColor: LINE,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor:  [24, 24, 24],
      textColor:  ACC,
      fontStyle:  'bold',
      fontSize:   7.5,
      lineColor:  LINE,
      lineWidth:  0.25,
    },
    alternateRowStyles: { fillColor: [14, 14, 14] },
    columnStyles: opts?.colWidths
      ? Object.fromEntries(opts.colWidths.map((w, i) => [i, { cellWidth: w }]))
      : {},
    tableLineColor: LINE,
    tableLineWidth: 0.2,
    didDrawPage: () => {
      _doc.setFillColor(...BG)
      _doc.rect(0, 0, W, 297, 'F')
    },
  })
  _y = (_doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
}

function cover(filename: string, data: UploadResponse) {
  _doc.setFillColor(...BG)
  _doc.rect(0, 0, W, 297, 'F')

  // Decorative arc (sky)
  _doc.setDrawColor(...ACC)
  _doc.setLineWidth(0.8)
  for (let i = 0; i < 3; i++) {
    _doc.setDrawColor(ACC[0], ACC[1], ACC[2])
    _doc.setLineWidth(0.3 + i * 0.15)
    const r = 60 + i * 18
    _doc.circle(W - 20, 20, r, 'S')
  }
  // Accent bar
  _doc.setFillColor(...ACC2)
  _doc.rect(0, 0, 4, 297, 'F')
  _doc.setFillColor(...ACC)
  _doc.rect(4, 0, 2, 297, 'F')

  // Badge
  _doc.setFillColor(...CARD)
  _doc.roundedRect(ML, 60, 70, 9, 2, 2, 'F')
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(7)
  _doc.setTextColor(...ACC)
  _doc.text('CSV / DATA ANALYSIS REPORT', ML + 5, 65.5)

  // Title
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(28)
  _doc.setTextColor(...WHITE)
  _doc.text('Data', ML, 90)
  _doc.setTextColor(...ACC)
  _doc.text('Analysis', ML, 108)
  _doc.setTextColor(...WHITE)
  _doc.text('Report', ML, 126)

  // Subtitle line
  _doc.setDrawColor(...ACC2)
  _doc.setLineWidth(0.5)
  _doc.line(ML, 132, ML + 80, 132)

  // Filename
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(9)
  _doc.setTextColor(...DIM)
  const cleanName = filename.replace(/\.csv$/i, '')
  _doc.text(`Dataset: ${cleanName}`, ML, 140)
  _doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, ML, 147)

  // Dataset stat cards
  const stats = [
    { label: 'ROWS',     value: data.shape[0].toLocaleString() },
    { label: 'COLUMNS',  value: data.shape[1].toString() },
    { label: 'MISSING',  value: `${data.missing_total}` },
    { label: 'NUMERIC',  value: data.numeric_cols.length.toString() },
  ]
  const cw = CW / 4
  stats.forEach((s, i) => {
    const x = ML + i * cw
    _doc.setFillColor(...CARD)
    _doc.roundedRect(x, 158, cw - 2, 18, 2, 2, 'F')
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...DIM)
    _doc.text(s.label, x + (cw - 2) / 2, 165, { align: 'center' })
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(11)
    _doc.setTextColor(...ACC)
    _doc.text(s.value, x + (cw - 2) / 2, 173, { align: 'center' })
  })

  // TOC
  _doc.setFillColor(...CARD)
  _doc.roundedRect(ML, 190, CW, 78, 2, 2, 'F')
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(8.5)
  _doc.setTextColor(...ACC)
  _doc.text('TABLE OF CONTENTS', ML + 6, 198)
  _doc.setDrawColor(...LINE)
  _doc.setLineWidth(0.2)
  _doc.line(ML + 6, 200, ML + CW - 6, 200)
  const toc = [
    '1  Dataset Summary',
    '2  Column Landscape & Preview',
    '3  Descriptive Statistics',
    '4  Correlation Analysis',
    '5  Data Distributions',
    '6  Preprocessing Results',
    '7  ML Model Training',
    '8  Feature Importance',
    '9  Insights & Recommendations',
  ]
  toc.forEach((t, i) => {
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7.5)
    _doc.setTextColor(...BODY)
    _doc.text(t, ML + 6, 206 + i * 6.8)
  })

  // Footer strip
  _doc.setFillColor(...CARD)
  _doc.rect(0, 282, W, 15, 'F')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(6.5)
  _doc.setTextColor(...DIM)
  _doc.text('Powered by CSV Analysis Platform', ML, 291)
  _doc.text(`Page 1`, W - MR, 291, { align: 'right' })
}

function footers(totalPages: number) {
  const pageCount = _doc.getNumberOfPages()
  for (let i = 2; i <= pageCount; i++) {
    _doc.setPage(i)
    _doc.setFillColor(...CARD)
    _doc.rect(0, 282, W, 15, 'F')
    _doc.setDrawColor(...LINE)
    _doc.setLineWidth(0.2)
    _doc.line(ML, 282, W - MR, 282)
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...DIM)
    _doc.text('CSV Analysis Report', ML, 291)
    _doc.text(`Page ${i} of ${totalPages}`, W - MR, 291, { align: 'right' })
  }
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function generateCSVPDF(params: {
  filename:        string
  data:            UploadResponse
  corrResult:      CorrelationResponse | null
  trainResult:     TrainResponse | null
  preprocessResult: PreprocessResponse | null
}) {
  const { filename, data, corrResult, trainResult, preprocessResult } = params

  _doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  _doc.setFillColor(...BG)
  _doc.rect(0, 0, W, 297, 'F')

  // ── Cover ────────────────────────────────────────────────────────────────
  cover(filename, data)

  // ── § 1 Dataset Summary ──────────────────────────────────────────────────
  newPage()
  secHeader('§1 Dataset Summary', 'Shape, quality metrics, and column overview')

  statRow([
    { label: 'Total Rows',    value: data.shape[0].toLocaleString() },
    { label: 'Total Columns', value: data.shape[1].toString() },
    { label: 'Missing Values',value: data.missing_total.toString() },
    { label: 'Duplicate Rows',value: data.duplicates.toString() },
  ])

  statRow([
    { label: 'Complete Rows',    value: data.complete_rows.toLocaleString() },
    { label: 'Memory (MB)',      value: (data.memory_mb ?? 0).toFixed(2) },
    { label: 'Numeric Cols',     value: data.numeric_cols.length.toString() },
    { label: 'Categorical Cols', value: data.cat_cols.length.toString() },
  ])

  // Missing values table
  const missingEntries = Object.entries(data.missing).filter(([, v]) => v > 0)
  if (missingEntries.length > 0) {
    chk(12)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(8)
    _doc.setTextColor(...DIM)
    _doc.text('Columns with Missing Values', ML, _y)
    _y += 5
    tbl(
      ['Column', 'Missing Count', '% Missing'],
      missingEntries.map(([col, cnt]) => [
        col,
        cnt,
        `${((cnt / data.shape[0]) * 100).toFixed(1)}%`,
      ])
    )
  } else {
    bul('No missing values detected — dataset is complete.')
  }

  // ── § 2 Column Landscape & Preview ─────────────────────────────────────
  newPage()
  secHeader('§2 Column Landscape & Preview', 'Data types and sample rows')

  tbl(
    ['Column', 'Type', 'Category'],
    data.columns.map(col => [
      col,
      data.dtypes[col] ?? 'unknown',
      data.numeric_cols.includes(col) ? 'Numeric'
        : data.cat_cols.includes(col) ? 'Categorical'
        : 'Other',
    ])
  )

  chk(10)
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(8)
  _doc.setTextColor(...DIM)
  _doc.text('Sample Data (first 8 rows)', ML, _y)
  _y += 5

  const previewCols = data.columns.slice(0, 6)
  const previewRows = (data.preview ?? data.sample ?? []).slice(0, 8).map(row =>
    previewCols.map(col => {
      const v = row[col]
      if (v === null || v === undefined) return '—'
      const s = String(v)
      return s.length > 18 ? s.slice(0, 16) + '…' : s
    })
  )
  if (previewRows.length) {
    tbl(previewCols, previewRows)
  }

  // ── § 3 Descriptive Statistics ──────────────────────────────────────────
  newPage()
  secHeader('§3 Descriptive Statistics', 'Numeric column summaries')

  const statCols = data.numeric_cols.slice(0, 12)
  const statKeys = ['mean', 'std', 'min', '25%', '50%', '75%', 'max']
  if (statCols.length) {
    tbl(
      ['Column', 'Mean', 'Std Dev', 'Min', 'P25', 'Median', 'P75', 'Max'],
      statCols.map(col => {
        const s = data.statistics[col] ?? {}
        return [
          col,
          ...statKeys.map(k => {
            const v = s[k]
            return v != null ? Number(v).toFixed(2) : '—'
          }),
        ]
      })
    )
  }

  if (data.cat_cols.length) {
    chk(10)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(8)
    _doc.setTextColor(...DIM)
    _doc.text('Categorical Column Top Values', ML, _y)
    _y += 5
    const catEntries: (string | number)[][] = []
    data.cat_cols.slice(0, 8).forEach(col => {
      const freq = data.cat_summary?.[col] ?? {}
      const topEntries = Object.entries(freq)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
      topEntries.forEach(([val, cnt], idx) => {
        catEntries.push([
          idx === 0 ? col : '',
          val,
          (cnt as number).toLocaleString(),
          `${(((cnt as number) / data.shape[0]) * 100).toFixed(1)}%`,
        ])
      })
    })
    if (catEntries.length) {
      tbl(['Column', 'Top Value', 'Count', 'Share'], catEntries)
    }
  }

  // ── § 4 Correlation Analysis ────────────────────────────────────────────
  newPage()
  secHeader('§4 Correlation Analysis', 'Feature relationships — top pairs by absolute correlation')

  if (corrResult && !corrResult.error) {
    const topPairs = [...corrResult.pairs]
      .filter(p => p.feature1 !== p.feature2)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 20)

    if (topPairs.length) {
      tbl(
        ['Feature A', 'Feature B', 'Correlation', 'Strength'],
        topPairs.map(p => {
          const r = p.correlation
          const abs = Math.abs(r)
          const strength = abs >= 0.7 ? 'Strong' : abs >= 0.4 ? 'Moderate' : 'Weak'
          return [
            p.feature1,
            p.feature2,
            r.toFixed(4),
            `${r >= 0 ? '+' : ''}${strength}`,
          ]
        })
      )
    }

    // Insights from correlations
    const strong = topPairs.filter(p => Math.abs(p.correlation) >= 0.7)
    if (strong.length) {
      chk(8)
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(8)
      _doc.setTextColor(...DIM)
      _doc.text('Strong Correlations', ML, _y)
      _y += 5
      strong.slice(0, 5).forEach(p => {
        bul(`${p.feature1} ↔ ${p.feature2}: r = ${p.correlation.toFixed(3)} (${p.correlation > 0 ? 'positive' : 'negative'})`)
      })
    }
  } else {
    bul('Correlation analysis results unavailable.')
  }

  // ── § 5 Data Distributions ──────────────────────────────────────────────
  newPage()
  secHeader('§5 Data Distributions', 'Statistical distribution summary for numeric columns')

  if (data.numeric_cols.length) {
    const distRows: (string | number)[][] = data.numeric_cols.slice(0, 15).map(col => {
      const s  = data.statistics[col] ?? {}
      const mn = s['mean'] as number | null
      const sd = s['std']  as number | null
      const mn_v = s['min'] as number | null
      const mx_v = s['max'] as number | null
      const p25 = s['25%'] as number | null
      const p75 = s['75%'] as number | null
      const iqr = (p25 != null && p75 != null) ? (p75 - p25) : null
      const skew = (mn != null && sd != null && sd > 0 && p25 != null && p75 != null)
        ? ((mn - ((p25 + p75) / 2)) / (sd)).toFixed(2)
        : '—'
      return [
        col,
        mn  != null ? mn.toFixed(2)    : '—',
        sd  != null ? sd.toFixed(2)    : '—',
        mn_v != null ? mn_v.toFixed(2) : '—',
        mx_v != null ? mx_v.toFixed(2) : '—',
        iqr != null ? iqr.toFixed(2)   : '—',
        skew,
      ]
    })
    tbl(['Column', 'Mean', 'Std Dev', 'Min', 'Max', 'IQR', 'Skew Est.'], distRows)
  }

  // ── § 6 Preprocessing Results ───────────────────────────────────────────
  newPage()
  secHeader('§6 Preprocessing Results', 'Data cleaning & transformation summary')

  if (preprocessResult) {
    statRow([
      { label: 'Rows Before', value: preprocessResult.rows_before.toLocaleString() },
      { label: 'Rows After',  value: preprocessResult.rows_after.toLocaleString() },
      { label: 'Columns',     value: preprocessResult.cols.toString() },
      { label: 'Rows Removed',value: (preprocessResult.rows_before - preprocessResult.rows_after).toString() },
    ])

    statRow([
      { label: 'Numeric Filled',     value: preprocessResult.filled_numeric.toString() },
      { label: 'Categorical Filled', value: preprocessResult.filled_categorical.toString() },
      { label: 'Retention Rate',     value: `${((preprocessResult.rows_after / preprocessResult.rows_before) * 100).toFixed(1)}%` },
      { label: 'Fill Rate',          value: `${((preprocessResult.filled_numeric + preprocessResult.filled_categorical) > 0 ? preprocessResult.filled_numeric + preprocessResult.filled_categorical : 0)}` },
    ])

    bul(`Dataset shape after preprocessing: ${preprocessResult.rows_after.toLocaleString()} rows × ${preprocessResult.cols} columns.`)
    if (preprocessResult.rows_before - preprocessResult.rows_after > 0) {
      bul(`${preprocessResult.rows_before - preprocessResult.rows_after} rows removed during preprocessing (duplicate or irreparable records).`)
    }
    if (preprocessResult.filled_numeric > 0) {
      bul(`${preprocessResult.filled_numeric} numeric cells imputed using median imputation.`)
    }
    if (preprocessResult.filled_categorical > 0) {
      bul(`${preprocessResult.filled_categorical} categorical cells imputed using mode imputation.`)
    }

    // Preview of preprocessed columns
    if (preprocessResult.columns?.length) {
      chk(10)
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(8)
      _doc.setTextColor(...DIM)
      _doc.text('Preprocessed Dataset Columns', ML, _y)
      _y += 5
      const colChunks: string[] = preprocessResult.columns.slice(0, 20)
      const colRows: (string | number)[][] = []
      for (let i = 0; i < colChunks.length; i += 3) {
        colRows.push(colChunks.slice(i, i + 3).concat(['','','']).slice(0, 3))
      }
      tbl(['Column 1', 'Column 2', 'Column 3'], colRows)
    }
  } else {
    bul('Preprocessing was not run during this session.')
  }

  // ── § 7 ML Model Training ───────────────────────────────────────────────
  newPage()
  secHeader('§7 ML Model Training', 'Algorithm performance and evaluation metrics')

  if (trainResult && !trainResult.error) {
    statRow([
      { label: 'Algorithm',      value: trainResult.algorithm },
      { label: 'Problem Type',   value: trainResult.problem_type === 'regression' ? 'Regression' : 'Classification' },
      { label: 'Train Samples',  value: trainResult.train_samples.toLocaleString() },
      { label: 'Test Samples',   value: trainResult.test_samples.toLocaleString() },
    ])

    const metrics = trainResult.metrics
    if (trainResult.problem_type === 'regression') {
      statRow([
        { label: 'R² Score', value: metrics.r2  != null ? metrics.r2.toFixed(4)  : '—' },
        { label: 'RMSE',     value: metrics.rmse != null ? metrics.rmse.toFixed(4) : '—' },
        { label: 'MAE',      value: metrics.mae  != null ? metrics.mae.toFixed(4)  : '—' },
        { label: 'Features', value: trainResult.features.toString() },
      ])
      if (metrics.r2 != null) {
        const r2 = metrics.r2
        bul(`R² of ${r2.toFixed(4)} means the model explains ${(r2 * 100).toFixed(1)}% of variance in the target.`)
      }
    } else {
      statRow([
        { label: 'Accuracy', value: metrics.accuracy != null ? `${(metrics.accuracy * 100).toFixed(2)}%` : '—' },
        { label: 'Features', value: trainResult.features.toString() },
        { label: 'Train',    value: trainResult.train_samples.toLocaleString() },
        { label: 'Test',     value: trainResult.test_samples.toLocaleString() },
      ])
      if (metrics.accuracy != null) {
        bul(`Model accuracy: ${(metrics.accuracy * 100).toFixed(2)}% on held-out test set.`)
      }

      if (trainResult.confusion_matrix) {
        chk(10)
        _doc.setFont('helvetica', 'bold')
        _doc.setFontSize(8)
        _doc.setTextColor(...DIM)
        _doc.text('Confusion Matrix', ML, _y)
        _y += 5
        tbl(
          trainResult.confusion_matrix[0].map((_, i) => `Class ${i}`),
          trainResult.confusion_matrix.map((row, i) => [`[${i}]`, ...row])
        )
      }
    }
  } else if (trainResult?.error) {
    bul(`Training error: ${trainResult.error}`)
  } else {
    bul('ML model training was not completed during this session.')
  }

  // ── § 8 Feature Importance ──────────────────────────────────────────────
  newPage()
  secHeader('§8 Feature Importance', 'Top predictive features ranked by importance score')

  if (trainResult?.feature_importance) {
    const fi  = trainResult.feature_importance
    const rows = fi.features.slice(0, 20).map((f, i) => [
      i + 1,
      f,
      fi.scores[i].toFixed(4),
      `${(fi.scores[i] * 100).toFixed(1)}%`,
      fi.cumulative ? `${(fi.cumulative[i] * 100).toFixed(1)}%` : '—',
    ])
    tbl(['Rank', 'Feature', 'Score', 'Importance %', 'Cumulative %'], rows)

    chk(10)
    const top3 = fi.features.slice(0, 3)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(8)
    _doc.setTextColor(...DIM)
    _doc.text('Key Findings', ML, _y)
    _y += 5
    bul(`The top predictor is "${top3[0]}" — prioritize this feature in further analysis and data collection.`)
    if (top3[1]) bul(`Second most important: "${top3[1]}". Consider its interaction with the top feature.`)
    if (top3[2]) bul(`Third: "${top3[2]}". Together, the top 3 features drive most model decisions.`)
    if (fi.cumulative && fi.cumulative[4] != null) {
      bul(`Top 5 features account for ${(fi.cumulative[4] * 100).toFixed(1)}% of total importance.`)
    }
  } else {
    bul('Feature importance was not computed (no model trained or algorithm does not support it).')
  }

  // ── § 9 Insights & Recommendations ─────────────────────────────────────
  newPage()
  secHeader('§9 Insights & Recommendations', 'Actionable findings based on full analysis')

  // Dataset quality insights
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(8.5)
  _doc.setTextColor(...ACC2)
  _doc.text('Data Quality', ML, _y)
  _y += 5

  const missingPct = data.missing_total / (data.shape[0] * data.shape[1]) * 100
  bul(`Dataset completeness: ${(100 - missingPct).toFixed(1)}% — ${missingPct < 5 ? 'Excellent quality, suitable for modeling.' : missingPct < 20 ? 'Moderate missing data; imputation recommended.' : 'High missing rate — validate source data.'}`)
  bul(`${data.duplicates} duplicate rows found. ${data.duplicates === 0 ? 'No deduplication needed.' : 'Remove duplicates before modeling.'}`)
  bul(`${data.numeric_cols.length} numeric and ${data.cat_cols.length} categorical features provide a ${data.numeric_cols.length > data.cat_cols.length ? 'numerically rich' : 'feature-diverse'} dataset.`)

  _y += 3
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(8.5)
  _doc.setTextColor(...ACC2)
  chk(10)
  _doc.text('Correlation Insights', ML, _y)
  _y += 5

  if (corrResult && !corrResult.error && corrResult.pairs.length) {
    const strongPairs = corrResult.pairs
      .filter(p => Math.abs(p.correlation) >= 0.7 && p.feature1 !== p.feature2)
      .slice(0, 4)
    if (strongPairs.length) {
      strongPairs.forEach(p => {
        bul(`${p.feature1} and ${p.feature2} are strongly correlated (r=${p.correlation.toFixed(2)}). ${p.correlation > 0 ? 'They move together — consider using just one in regression.' : 'Strong inverse relationship — investigate causality.'}`)
      })
    } else {
      bul('No strongly correlated feature pairs found. Features appear largely independent.')
    }
  } else {
    bul('Run correlation analysis for feature relationship insights.')
  }

  _y += 3
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(8.5)
  _doc.setTextColor(...ACC2)
  chk(10)
  _doc.text('Modeling Recommendations', ML, _y)
  _y += 5

  if (trainResult && !trainResult.error) {
    const m = trainResult.metrics
    if (trainResult.problem_type === 'regression') {
      const r2 = m.r2 ?? 0
      bul(`Model R² = ${r2.toFixed(4)}. ${r2 >= 0.9 ? 'Excellent fit.' : r2 >= 0.7 ? 'Good fit — consider feature engineering for improvement.' : r2 >= 0.5 ? 'Moderate fit — explore more features or different algorithms.' : 'Poor fit — check for data issues or try non-linear models.'}`)
      if (m.rmse != null) bul(`RMSE of ${m.rmse.toFixed(4)} represents the typical prediction error.`)
    } else {
      const acc = m.accuracy ?? 0
      bul(`Classification accuracy = ${(acc * 100).toFixed(2)}%. ${acc >= 0.9 ? 'Excellent performance.' : acc >= 0.75 ? 'Good — consider hyperparameter tuning.' : 'Moderate — investigate class imbalance or feature engineering.'}`)
    }
    if (trainResult.feature_importance) {
      const topF = trainResult.feature_importance.features[0]
      bul(`Focus data collection efforts on "${topF}" — it is the strongest predictor.`)
    }
  } else {
    bul('Train an ML model to receive specific modeling recommendations.')
  }

  if (preprocessResult) {
    _y += 3
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(8.5)
    _doc.setTextColor(...ACC2)
    chk(10)
    _doc.text('Preprocessing Notes', ML, _y)
    _y += 5
    const retention = (preprocessResult.rows_after / preprocessResult.rows_before * 100).toFixed(1)
    bul(`${retention}% of rows retained after preprocessing — ${parseFloat(retention) >= 95 ? 'minimal data loss.' : 'consider revisiting cleaning parameters.'}`)
    const totalFilled = preprocessResult.filled_numeric + preprocessResult.filled_categorical
    if (totalFilled > 0) {
      bul(`${totalFilled} cells were imputed. Review imputation strategy if model performance is suboptimal.`)
    }
  }

  // ── Finalize ─────────────────────────────────────────────────────────────
  footers(_doc.getNumberOfPages())

  const name = filename.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_')
  _doc.save(`${name}_analysis_report.pdf`)
}
