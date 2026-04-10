import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  UploadResponse, CorrelationResponse, TrainResponse, PreprocessResponse
} from '../../types/index'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:     [8,   8,   8]   as [number,number,number],
  card:   [18,  18,  18]  as [number,number,number],
  card2:  [24,  24,  24]  as [number,number,number],
  line:   [38,  38,  38]  as [number,number,number],
  dim:    [80,  80,  80]  as [number,number,number],
  body:   [170, 170, 170] as [number,number,number],
  white:  [238, 238, 238] as [number,number,number],
  sky:    [56,  189, 248] as [number,number,number],   // sky-400
  indigo: [99,  102, 241] as [number,number,number],   // indigo-500
  green:  [52,  211, 153] as [number,number,number],
  yellow: [251, 191, 36]  as [number,number,number],
  red:    [251, 113, 133] as [number,number,number],
}
const W = 210, H = 297, ML = 14, MR = 14, CW = W - ML - MR

let _y  = 0
let _doc: jsPDF

// ── Page helpers ─────────────────────────────────────────────────────────────
function bgFill() {
  _doc.setFillColor(...C.bg)
  _doc.rect(0, 0, W, H, 'F')
}

function newPage() {
  _doc.addPage()
  bgFill()
  _y = 18
}

function chk(needed: number) {
  if (_y + needed > H - 18) newPage()
}

// ── Layout primitives ─────────────────────────────────────────────────────────
function secHeader(title: string, sub?: string) {
  chk(sub ? 20 : 16)
  // accent bar
  _doc.setFillColor(...C.sky)
  _doc.rect(ML, _y, 3, sub ? 10 : 8, 'F')
  // title
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(10.5)
  _doc.setTextColor(...C.white)
  _doc.text(title, ML + 6, _y + (sub ? 4.5 : 5.5))
  if (sub) {
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...C.dim)
    _doc.text(sub, ML + 6, _y + 9)
  }
  _y += sub ? 14 : 11
  // rule
  _doc.setFillColor(...C.line)
  _doc.rect(ML, _y, CW, 0.25, 'F')
  _y += 5
}

function label(text: string, accent = false) {
  chk(6)
  _doc.setFont('helvetica', accent ? 'bold' : 'normal')
  _doc.setFontSize(8)
  _doc.setTextColor(...(accent ? C.indigo : C.dim))
  _doc.text(text, ML, _y)
  _y += 5
}

function bul(text: string) {
  const lines = _doc.splitTextToSize(text, CW - 6) as string[]
  chk(lines.length * 4.5 + 2)
  _doc.setFillColor(...C.sky)
  _doc.circle(ML + 1.2, _y - 0.6, 0.85, 'F')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(8)
  _doc.setTextColor(...C.body)
  _doc.text(lines, ML + 5, _y)
  _y += lines.length * 4.5 + 1.5
}

function statRow(items: { label: string; value: string; hi?: boolean; warn?: boolean }[]) {
  const cols = Math.min(items.length, 4)
  const cw   = CW / cols
  chk(16)
  items.slice(0, cols).forEach((item, i) => {
    const x = ML + i * cw
    _doc.setFillColor(...C.card)
    _doc.roundedRect(x, _y, cw - 1.5, 14, 1.5, 1.5, 'F')
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...C.dim)
    _doc.text(item.label.toUpperCase(), x + (cw - 1.5) / 2, _y + 4.5, { align: 'center' })
    const col = item.hi ? C.green : item.warn ? C.yellow : C.sky
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9.5)
    _doc.setTextColor(...col)
    _doc.text(item.value, x + (cw - 1.5) / 2, _y + 11, { align: 'center' })
  })
  _y += 17
}

function tbl(
  head: string[],
  body: (string | number)[][],
  opts?: { colWidths?: number[]; compact?: boolean }
) {
  if (!body.length) return
  chk(16)
  autoTable(_doc, {
    startY: _y,
    head:   [head],
    body:   body.map(r => r.map(c => String(c))),
    margin: { left: ML, right: MR },
    styles: {
      font:         'helvetica',
      fontSize:     opts?.compact ? 7 : 7.5,
      cellPadding:  opts?.compact ? 2 : 2.5,
      fillColor:    C.card,
      textColor:    C.body,
      lineColor:    C.line,
      lineWidth:    0.2,
    },
    headStyles: {
      fillColor:  C.card2,
      textColor:  C.sky,
      fontStyle:  'bold',
      fontSize:   7,
      lineColor:  C.line,
      lineWidth:  0.25,
    },
    alternateRowStyles: { fillColor: [13, 13, 13] as [number,number,number] },
    columnStyles: opts?.colWidths
      ? Object.fromEntries(opts.colWidths.map((w, i) => [i, { cellWidth: w }]))
      : {},
    tableLineColor: C.line,
    tableLineWidth: 0.2,
    // Draw background on CONTINUATION pages only (before table content renders)
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        bgFill()
      }
    },
  })
  _y = (_doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
}

// ── Cover page ────────────────────────────────────────────────────────────────
function cover(filename: string, data: UploadResponse) {
  bgFill()

  // Decorative circles (top-right)
  for (let i = 0; i < 4; i++) {
    const r = 45 + i * 22
    _doc.setDrawColor(C.sky[0], C.sky[1], C.sky[2])
    _doc.setLineWidth(0.25 + i * 0.1)
    _doc.circle(W + 5, -5, r, 'S')
  }

  // Left accent strip
  _doc.setFillColor(...C.indigo)
  _doc.rect(0, 0, 4, H, 'F')
  _doc.setFillColor(...C.sky)
  _doc.rect(4, 0, 2, H, 'F')

  // Badge
  _doc.setFillColor(...C.card)
  _doc.roundedRect(ML, 52, 64, 8, 2, 2, 'F')
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(6.5)
  _doc.setTextColor(...C.sky)
  _doc.text('CSV  /  DATA ANALYSIS REPORT', ML + 4, 57)

  // Large title
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(30)
  _doc.setTextColor(...C.white)
  _doc.text('Data', ML, 83)
  _doc.setTextColor(...C.sky)
  _doc.text('Analysis', ML, 100)
  _doc.setTextColor(...C.white)
  _doc.text('Report', ML, 117)

  // Divider
  _doc.setFillColor(...C.indigo)
  _doc.rect(ML, 121, 70, 0.6, 'F')

  // Meta
  const cleanName = filename.replace(/\.csv$/i, '')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(8.5)
  _doc.setTextColor(...C.dim)
  _doc.text(`Dataset: ${cleanName}`, ML, 129)
  _doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, ML, 136)

  // Stat cards
  const missingPct = data.missing_total / Math.max(data.shape[0] * data.shape[1], 1) * 100
  const quality = missingPct < 1 ? 'Excellent' : missingPct < 10 ? 'Good' : 'Fair'
  const cstats = [
    { label: 'ROWS',     value: data.shape[0].toLocaleString() },
    { label: 'COLUMNS',  value: data.shape[1].toString() },
    { label: 'MISSING',  value: data.missing_total.toString() },
    { label: 'QUALITY',  value: quality },
  ]
  const sw = CW / 4
  _doc.setFillColor(...C.card)
  _doc.roundedRect(ML, 148, CW, 22, 2, 2, 'F')
  cstats.forEach((s, i) => {
    const x = ML + i * sw + sw / 2
    if (i > 0) {
      _doc.setFillColor(...C.line)
      _doc.rect(ML + i * sw, 152, 0.25, 14, 'F')
    }
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...C.dim)
    _doc.text(s.label, x, 154, { align: 'center' })
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(10)
    _doc.setTextColor(...C.sky)
    _doc.text(s.value, x, 164, { align: 'center' })
  })

  // TOC
  _doc.setFillColor(...C.card)
  _doc.roundedRect(ML, 182, CW, 84, 2, 2, 'F')
  _doc.setFillColor(...C.sky)
  _doc.rect(ML, 182, 3, 84, 'F')
  _doc.setFont('helvetica', 'bold')
  _doc.setFontSize(7)
  _doc.setTextColor(...C.sky)
  _doc.text('TABLE OF CONTENTS', ML + 7, 190)
  _doc.setFillColor(...C.line)
  _doc.rect(ML + 7, 192, CW - 10, 0.2, 'F')

  const toc = [
    '1  Dataset Summary',
    '2  Column Landscape & Data Preview',
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
    _doc.setTextColor(...C.body)
    _doc.text(t, ML + 7, 198 + i * 7)
  })

  // Footer
  _doc.setFillColor(...C.card)
  _doc.rect(0, H - 12, W, 12, 'F')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(6.5)
  _doc.setTextColor(...C.dim)
  _doc.text('Powered by CSV Analysis Platform', ML, H - 4)
  _doc.text('Page 1', W - MR, H - 4, { align: 'right' })
}

// ── Page footers ──────────────────────────────────────────────────────────────
function footers() {
  const total = _doc.getNumberOfPages()
  for (let i = 2; i <= total; i++) {
    _doc.setPage(i)
    _doc.setFillColor(...C.card)
    _doc.rect(0, H - 10, W, 10, 'F')
    _doc.setFillColor(...C.line)
    _doc.rect(0, H - 10, W, 0.25, 'F')
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...C.dim)
    _doc.text('CSV Analysis Report', ML, H - 4)
    _doc.text(`Page ${i} of ${total}`, W - MR, H - 4, { align: 'right' })
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generateCSVPDF(params: {
  filename:         string
  data:             UploadResponse
  corrResult:       CorrelationResponse | null
  trainResult:      TrainResponse | null
  preprocessResult: PreprocessResponse | null
}) {
  const { filename, data, corrResult, trainResult, preprocessResult } = params
  _doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  bgFill()

  // ── Cover ──────────────────────────────────────────────────────────────────
  cover(filename, data)

  // ── §1 Dataset Summary ─────────────────────────────────────────────────────
  newPage()
  secHeader('§1  Dataset Summary', 'Shape, quality metrics and data health')

  statRow([
    { label: 'Total Rows',    value: data.shape[0].toLocaleString() },
    { label: 'Total Columns', value: data.shape[1].toString() },
    { label: 'Missing Values',value: data.missing_total.toString(),
      warn: data.missing_total > 0 },
    { label: 'Duplicate Rows',value: data.duplicates.toString(),
      warn: data.duplicates > 0 },
  ])

  statRow([
    { label: 'Complete Rows',    value: data.complete_rows.toLocaleString(),
      hi: data.complete_rows === data.shape[0] },
    { label: 'Memory (MB)',      value: (data.memory_mb ?? 0).toFixed(2) },
    { label: 'Numeric Cols',     value: data.numeric_cols.length.toString() },
    { label: 'Categorical Cols', value: data.cat_cols.length.toString() },
  ])

  const missingEntries = Object.entries(data.missing).filter(([, v]) => v > 0)
  if (missingEntries.length > 0) {
    label('Missing Values by Column')
    tbl(
      ['Column', 'Missing Count', '% of Rows', 'Type'],
      missingEntries.map(([col, cnt]) => [
        col,
        cnt,
        `${((cnt / data.shape[0]) * 100).toFixed(1)}%`,
        data.numeric_cols.includes(col) ? 'Numeric' : 'Categorical',
      ])
    )
  } else {
    bul('No missing values detected — dataset is complete.')
  }

  bul(`${data.numeric_cols.length} numeric column(s): ${data.numeric_cols.slice(0, 5).join(', ')}${data.numeric_cols.length > 5 ? '...' : ''}.`)
  if (data.cat_cols.length)
    bul(`${data.cat_cols.length} categorical column(s): ${data.cat_cols.slice(0, 5).join(', ')}${data.cat_cols.length > 5 ? '...' : ''}.`)

  // ── §2 Column Landscape & Preview ─────────────────────────────────────────
  newPage()
  secHeader('§2  Column Landscape & Preview', 'Data types and sample rows')

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

  const previewRows = (data.preview ?? data.sample ?? []).slice(0, 8)
  if (previewRows.length > 0) {
    const previewCols = data.columns.slice(0, 6)
    _y += 2
    label('Sample Data (first 8 rows)')
    tbl(
      previewCols,
      previewRows.map(row =>
        previewCols.map(col => {
          const v = row[col]
          if (v === null || v === undefined) return '—'
          const s = String(v)
          return s.length > 16 ? s.slice(0, 14) + '...' : s
        })
      )
    )
  }

  // ── §3 Descriptive Statistics ──────────────────────────────────────────────
  newPage()
  secHeader('§3  Descriptive Statistics', 'Summary statistics for numeric columns')

  const statCols = data.numeric_cols.slice(0, 10)
  if (statCols.length) {
    const statKeys = ['mean', 'std', 'min', '25%', '50%', '75%', 'max']
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
      }),
      { compact: statCols.length > 5 }
    )
  }

  if (data.cat_cols.length) {
    _y += 2
    label('Categorical Column Frequencies')
    const catRows: (string | number)[][] = []
    data.cat_cols.slice(0, 8).forEach(col => {
      const freq = data.cat_summary?.[col] ?? {}
      Object.entries(freq)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .forEach(([val, cnt], idx) => {
          catRows.push([
            idx === 0 ? col : '',
            val,
            (cnt as number).toLocaleString(),
            `${(((cnt as number) / data.shape[0]) * 100).toFixed(1)}%`,
          ])
        })
    })
    if (catRows.length) tbl(['Column', 'Top Value', 'Count', 'Share'], catRows)
  }

  // ── §4 Correlation Analysis ────────────────────────────────────────────────
  newPage()
  secHeader('§4  Correlation Analysis', 'Feature relationships ranked by absolute correlation')

  if (corrResult && !corrResult.error) {
    const topPairs = [...corrResult.pairs]
      .filter(p => p.feature1 !== p.feature2)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 20)

    if (topPairs.length) {
      tbl(
        ['Feature A', 'Feature B', 'Correlation', 'Strength', 'Direction'],
        topPairs.map(p => {
          const r   = p.correlation
          const abs = Math.abs(r)
          const str = abs >= 0.7 ? 'Strong' : abs >= 0.4 ? 'Moderate' : 'Weak'
          return [p.feature1, p.feature2, r.toFixed(4), str, r >= 0 ? 'Positive' : 'Negative']
        })
      )

      const strong = topPairs.filter(p => Math.abs(p.correlation) >= 0.7)
      if (strong.length) {
        _y += 2
        label('Key Correlation Findings', true)
        strong.slice(0, 5).forEach(p => {
          bul(`${p.feature1} and ${p.feature2}: r = ${p.correlation.toFixed(3)} — strong ${p.correlation > 0 ? 'positive' : 'negative'} relationship.`)
        })
      }
    }
  } else {
    bul('Correlation analysis results unavailable.')
  }

  // ── §5 Data Distributions ──────────────────────────────────────────────────
  chk(30)
  _y += 4
  secHeader('§5  Data Distributions', 'Statistical spread and shape for each numeric column')

  if (data.numeric_cols.length) {
    tbl(
      ['Column', 'Mean', 'Std Dev', 'Min', 'Max', 'IQR', 'Skew Est.'],
      data.numeric_cols.slice(0, 15).map(col => {
        const s   = data.statistics[col] ?? {}
        const mn  = s['mean'] as number | null
        const sd  = s['std']  as number | null
        const p25 = s['25%']  as number | null
        const p75 = s['75%']  as number | null
        const iqr = (p25 != null && p75 != null) ? (p75 - p25) : null
        const mid = (p25 != null && p75 != null) ? (p25 + p75) / 2 : null
        const skew = (mn != null && sd != null && sd > 0 && mid != null)
          ? ((mn - mid) / sd).toFixed(2) : '—'
        return [
          col,
          mn  != null ? mn.toFixed(2)  : '—',
          sd  != null ? sd.toFixed(2)  : '—',
          s['min'] != null ? Number(s['min']).toFixed(2) : '—',
          s['max'] != null ? Number(s['max']).toFixed(2) : '—',
          iqr != null ? iqr.toFixed(2) : '—',
          skew,
        ]
      }),
      { compact: data.numeric_cols.length > 6 }
    )
  }

  // ── §6 Preprocessing Results ───────────────────────────────────────────────
  newPage()
  secHeader('§6  Preprocessing Results', 'Cleaning and transformation summary')

  if (preprocessResult) {
    statRow([
      { label: 'Rows Before', value: preprocessResult.rows_before.toLocaleString() },
      { label: 'Rows After',  value: preprocessResult.rows_after.toLocaleString(),
        hi: preprocessResult.rows_after === preprocessResult.rows_before },
      { label: 'Cols',        value: preprocessResult.cols.toString() },
      { label: 'Rows Removed',value: (preprocessResult.rows_before - preprocessResult.rows_after).toString(),
        warn: preprocessResult.rows_before !== preprocessResult.rows_after },
    ])

    statRow([
      { label: 'Numeric Imputed',     value: preprocessResult.filled_numeric.toString() },
      { label: 'Categorical Imputed', value: preprocessResult.filled_categorical.toString() },
      { label: 'Retention Rate',      value: `${((preprocessResult.rows_after / preprocessResult.rows_before) * 100).toFixed(1)}%`,
        hi: preprocessResult.rows_after / preprocessResult.rows_before >= 0.95 },
      { label: 'Total Cells Filled',  value: (preprocessResult.filled_numeric + preprocessResult.filled_categorical).toString() },
    ])

    bul(`Final dataset: ${preprocessResult.rows_after.toLocaleString()} rows x ${preprocessResult.cols} columns.`)
    if (preprocessResult.filled_numeric > 0)
      bul(`${preprocessResult.filled_numeric} numeric cells imputed via median imputation.`)
    if (preprocessResult.filled_categorical > 0)
      bul(`${preprocessResult.filled_categorical} categorical cells imputed via mode imputation.`)
    if (preprocessResult.rows_before === preprocessResult.rows_after)
      bul('No rows were removed — all records passed cleaning checks.')

    if (preprocessResult.columns?.length) {
      _y += 2
      label('Columns in Cleaned Dataset')
      const cols = preprocessResult.columns
      const rows: (string|number)[][] = []
      for (let i = 0; i < cols.length; i += 4)
        rows.push(cols.slice(i, i + 4).concat(['','','','']).slice(0, 4))
      tbl(['Column 1','Column 2','Column 3','Column 4'], rows)
    }
  } else {
    bul('Preprocessing was not run during this session.')
  }

  // ── §7 ML Model Training ───────────────────────────────────────────────────
  newPage()
  secHeader('§7  ML Model Training', 'Algorithm performance and evaluation metrics')

  if (trainResult && !trainResult.error) {
    statRow([
      { label: 'Algorithm',    value: trainResult.algorithm },
      { label: 'Problem Type', value: trainResult.problem_type === 'regression' ? 'Regression' : 'Classification' },
      { label: 'Train Samples',value: trainResult.train_samples.toLocaleString() },
      { label: 'Test Samples', value: trainResult.test_samples.toLocaleString() },
    ])

    const m = trainResult.metrics
    if (trainResult.problem_type === 'regression') {
      const r2 = m.r2 ?? 0
      statRow([
        { label: 'R² Score', value: m.r2  != null ? m.r2.toFixed(4)  : '—',
          hi: r2 >= 0.8, warn: r2 < 0.5 },
        { label: 'RMSE',     value: m.rmse != null ? m.rmse.toFixed(4) : '—' },
        { label: 'MAE',      value: m.mae  != null ? m.mae.toFixed(4)  : '—' },
        { label: 'Features', value: trainResult.features.toString() },
      ])
      bul(`R2 of ${r2.toFixed(4)}: model explains ${(r2 * 100).toFixed(1)}% of variance in the target variable.`)
      bul(r2 >= 0.8 ? 'Excellent fit — model is production-ready.' :
          r2 >= 0.6 ? 'Good fit — consider feature engineering for improvement.' :
          r2 >= 0.4 ? 'Moderate fit — explore more features or different algorithms.' :
          'Weak fit — check data quality or try a non-linear approach.')
    } else {
      const acc = m.accuracy ?? 0
      statRow([
        { label: 'Accuracy', value: m.accuracy != null ? `${(acc * 100).toFixed(2)}%` : '—',
          hi: acc >= 0.85, warn: acc < 0.65 },
        { label: 'Features', value: trainResult.features.toString() },
        { label: 'Train',    value: trainResult.train_samples.toLocaleString() },
        { label: 'Test',     value: trainResult.test_samples.toLocaleString() },
      ])
      bul(`Accuracy: ${(acc * 100).toFixed(2)}% on the held-out test set.`)

      if (trainResult.confusion_matrix) {
        _y += 2
        label('Confusion Matrix')
        const cm = trainResult.confusion_matrix
        tbl(
          ['', ...cm[0].map((_, j) => `Pred ${j}`)],
          cm.map((row, i) => [`Actual ${i}`, ...row])
        )
      }
    }
  } else if (trainResult?.error) {
    bul(`Training error: ${trainResult.error}`)
  } else {
    bul('ML model training was not completed during this session.')
  }

  // ── §8 Feature Importance ──────────────────────────────────────────────────
  chk(40)
  _y += 4
  secHeader('§8  Feature Importance', 'Top predictors ranked by contribution to model accuracy')

  if (trainResult?.feature_importance) {
    const fi = trainResult.feature_importance
    // Detect cumulative scale: if first value > 1, it's already 0-100
    const cumScale = (fi.cumulative?.[0] ?? 0) > 1 ? 1 : 100

    tbl(
      ['Rank', 'Feature', 'Score', 'Importance %', 'Cumulative %'],
      fi.features.slice(0, 20).map((f, i) => [
        i + 1,
        f,
        fi.scores[i].toFixed(4),
        `${(fi.scores[i] * 100).toFixed(1)}%`,
        fi.cumulative?.[i] != null
          ? `${(fi.cumulative[i] * cumScale).toFixed(1)}%`
          : '—',
      ])
    )

    _y += 2
    label('Key Findings', true)
    const top3 = fi.features.slice(0, 3)
    bul(`Top predictor: "${top3[0]}" (${(fi.scores[0] * 100).toFixed(1)}% importance). Prioritize this feature in data collection and future modeling.`)
    if (top3[1]) bul(`2nd: "${top3[1]}" (${(fi.scores[1] * 100).toFixed(1)}%). Examine its relationship with the top feature.`)
    if (top3[2]) bul(`3rd: "${top3[2]}" (${(fi.scores[2] * 100).toFixed(1)}%). Together the top 3 features account for most predictive signal.`)
  } else {
    bul('Feature importance not computed — train a model that supports it (e.g. Random Forest, Gradient Boosting).')
  }

  // ── §9 Insights & Recommendations ─────────────────────────────────────────
  newPage()
  secHeader('§9  Insights & Recommendations', 'Actionable findings from the full analysis')

  // Data quality
  label('Data Quality', true)
  const missingPct = data.missing_total / (data.shape[0] * data.shape[1]) * 100
  bul(`Dataset completeness: ${(100 - missingPct).toFixed(1)}% — ${missingPct < 1 ? 'Excellent — no issues found.' : missingPct < 10 ? 'Good — minor missing data handled by imputation.' : 'Moderate missing data — verify source quality.'}`)
  bul(`${data.duplicates === 0 ? 'No duplicate rows — clean data.' : `${data.duplicates} duplicate rows detected — remove before modeling.`}`)
  bul(`${data.numeric_cols.length} numeric and ${data.cat_cols.length} categorical columns. ${data.numeric_cols.length >= data.cat_cols.length ? 'Numerically rich dataset suitable for regression and clustering.' : 'Feature-diverse dataset — encode categoricals before ML modeling.'}`)

  _y += 3
  label('Correlation Insights', true)
  if (corrResult && !corrResult.error && corrResult.pairs.length) {
    const strong = corrResult.pairs
      .filter(p => Math.abs(p.correlation) >= 0.7 && p.feature1 !== p.feature2)
      .slice(0, 4)
    if (strong.length) {
      strong.forEach(p => {
        bul(`"${p.feature1}" and "${p.feature2}": r=${p.correlation.toFixed(2)} — ${p.correlation > 0 ? 'move together' : 'move inversely'}. ${p.correlation > 0 ? 'Consider using just one in regression to avoid multicollinearity.' : 'Strong inverse relationship — investigate causality.'}`)
      })
    } else {
      bul('No strongly correlated pairs (r >= 0.7). Features appear largely independent — good for modeling.')
    }
  } else {
    bul('Run correlation analysis for feature relationship insights.')
  }

  _y += 3
  label('Modeling Recommendations', true)
  if (trainResult && !trainResult.error) {
    const m = trainResult.metrics
    if (trainResult.problem_type === 'regression') {
      const r2 = m.r2 ?? 0
      bul(`Model R2 = ${r2.toFixed(4)}. ${r2 >= 0.8 ? 'Strong predictive performance.' : r2 >= 0.6 ? 'Good performance — consider hyperparameter tuning.' : r2 >= 0.4 ? 'Moderate — try feature engineering or ensemble methods.' : 'Weak — investigate data issues or try non-linear models.'}`)
      if (m.rmse != null) bul(`Average prediction error (RMSE): ${m.rmse.toFixed(2)}. Aim to reduce this with more training data or better features.`)
    } else {
      const acc = m.accuracy ?? 0
      bul(`Classification accuracy: ${(acc * 100).toFixed(2)}%. ${acc >= 0.9 ? 'Excellent.' : acc >= 0.75 ? 'Good — consider class balancing or more features.' : 'Below expectations — investigate class distribution and feature quality.'}`)
    }
    if (trainResult.feature_importance) {
      bul(`Focus data collection on "${trainResult.feature_importance.features[0]}" — it is the strongest predictor.`)
    }
  } else {
    bul('Train an ML model to receive specific performance-based recommendations.')
  }

  if (preprocessResult) {
    _y += 3
    label('Preprocessing Notes', true)
    bul(`${((preprocessResult.rows_after / preprocessResult.rows_before) * 100).toFixed(1)}% of rows retained after cleaning.`)
    const filled = preprocessResult.filled_numeric + preprocessResult.filled_categorical
    if (filled > 0)
      bul(`${filled} cells were imputed. If model performance is below expectations, revisit imputation strategy.`)
    else
      bul('No imputation required — dataset had no missing values.')
  }

  // Finalize
  footers()
  const safeName = filename.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_')
  _doc.save(`${safeName}_analysis_report.pdf`)
}
