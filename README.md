# CSV Analyzer

A general-purpose data analysis tool. Upload any CSV file and get statistical analysis, data quality checks, correlation maps, ML model training, feature importance ranking, and a downloadable PDF report — no code required.

**Live demo:** https://csv--analysis.pages.dev/

## What it does

| Feature | Description |
|---------|-------------|
| Data Preview | Auto column type detection (numerical/categorical), row and column filtering |
| Data Quality | Missing value counts, duplicate row detection, overall quality rating |
| Preprocessing | Fill missing values (numeric + categorical), encode categoricals for ML |
| Correlation Heatmap | Feature-to-feature correlation with plain-English interpretation |
| Distributions | Histograms for numeric columns, bar charts for categorical columns |
| ML Training | Auto task detection (classification or regression), algorithm auto-selection |
| Feature Importance | Top 10 features ranked by contribution, cumulative importance chart |
| PDF Export | Full downloadable report with all charts and recommendations |

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS — dark glassmorphic theme |
| Charts | Recharts |
| PDF | jsPDF |
| Backend | Python + FastAPI |
| Hosting | Cloudflare Pages |

## Project structure

```
csv-analysis/
├── frontend/    # React + Vite + TypeScript SPA
└── backend/     # Python FastAPI — ML training, correlation computation
```

## Running locally

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Related

- [Business Analyzer](https://github.com/Kanishk1217/business-analysis) — extends this tool with business-specific KPI tracking, forecasting, and segmentation
