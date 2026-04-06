from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
from sklearn.base import clone
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    GradientBoostingClassifier, GradientBoostingRegressor,
)
from sklearn.metrics import (
    mean_squared_error, r2_score, accuracy_score,
    mean_absolute_error, classification_report, confusion_matrix,
)
from pandas.api.types import is_numeric_dtype
import warnings

warnings.filterwarnings("ignore")

app = FastAPI(title="CSV Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
    expose_headers=["*"],
)

# Ensure CORS headers are present even on unhandled 500 errors
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

# Prototypes — cloned fresh per request so state never leaks between calls
_REGRESSION_MODELS = {
    "Linear Regression":  LinearRegression(),
    "Ridge Regression":   Ridge(),
    "Decision Tree":      DecisionTreeRegressor(random_state=42),
    "Random Forest":      RandomForestRegressor(n_estimators=100, random_state=42),
    "Gradient Boosting":  GradientBoostingRegressor(random_state=42),
}
_CLASSIFICATION_MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Decision Tree":       DecisionTreeClassifier(random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting":   GradientBoostingClassifier(random_state=42),
}


def read_csv_safe(file: UploadFile) -> pd.DataFrame:
    try:
        contents = file.file.read()
        return pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    num_cols = out.select_dtypes(include="number").columns
    cat_cols = out.select_dtypes(include="object").columns
    if len(num_cols):
        out[num_cols] = out[num_cols].fillna(out[num_cols].mean())
    for col in cat_cols:
        mode = out[col].mode()
        out[col] = out[col].fillna(mode[0] if len(mode) else "Unknown")
    return out


def get_feature_importance(model, feature_names):
    if hasattr(model, "feature_importances_"):
        imp = model.feature_importances_
    elif hasattr(model, "coef_"):
        coef = np.abs(model.coef_)
        imp = coef.mean(axis=0) if coef.ndim > 1 else coef
    else:
        return None
    series = pd.Series(imp, index=feature_names).sort_values(ascending=False)
    return series


def safe_json(obj):
    """Replace NaN/Inf with None so JSON serialisation never fails."""
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    return obj


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        df_raw = read_csv_safe(file)
        df = clean_df(df_raw)

        num_cols = df.select_dtypes(include="number").columns.tolist()
        cat_cols = df.select_dtypes(include="object").columns.tolist()

        # Safe stats — only numeric columns, replace all bad values
        try:
            stats_df = df[num_cols].describe() if num_cols else pd.DataFrame()
            stats = {}
            for col in stats_df.columns:
                stats[col] = {}
                for idx in stats_df.index:
                    v = stats_df.loc[idx, col]
                    stats[col][idx] = None if (v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v)))) else float(v)
        except Exception:
            stats = {}

        cat_summary = {}
        for col in cat_cols:
            try:
                cat_summary[col] = df[col].value_counts().head(10).to_dict()
            except Exception:
                cat_summary[col] = {}

        # 500 rows for charts
        def safe_records(frame: pd.DataFrame):
            rows = []
            for row in frame.to_dict(orient="records"):
                safe_row = {}
                for k, v in row.items():
                    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                        safe_row[k] = None
                    else:
                        safe_row[k] = v
                rows.append(safe_row)
            return rows

        sample_rows = safe_records(df.head(500))
        preview_rows = sample_rows[:10]

        return {
            "shape":         list(df_raw.shape),
            "columns":       df.columns.tolist(),
            "dtypes":        df.dtypes.astype(str).to_dict(),
            "preview":       preview_rows,
            "sample":        sample_rows,
            "missing":       {k: int(v) for k, v in df_raw.isnull().sum().to_dict().items()},
            "missing_total": int(df_raw.isnull().sum().sum()),
            "duplicates":    int(df_raw.duplicated().sum()),
            "complete_rows": int((~df_raw.isnull().any(axis=1)).sum()),
            "memory_mb":     round(df.memory_usage(deep=True).sum() / 1024**2, 4),
            "numeric_cols":  num_cols,
            "cat_cols":      cat_cols,
            "statistics":    stats,
            "cat_summary":   cat_summary,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/correlations")
async def correlations(file: UploadFile = File(...)):
    try:
        df_raw = read_csv_safe(file)
        df = clean_df(df_raw)

        num_raw = df_raw.select_dtypes("number")
        num_cln = df.select_dtypes("number")

        if num_cln.empty:
            return {"error": "No numeric columns found"}

        def matrix(d):
            corr = d.corr()
            # replace NaN with None for JSON
            corr_list = [[None if (v is None or (isinstance(v, float) and np.isnan(v))) else round(v, 4)
                          for v in row] for row in corr.values.tolist()]
            return {"columns": d.columns.tolist(), "matrix": corr_list}

        corr = num_cln.corr()
        pairs = []
        cols = corr.columns.tolist()
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                val = corr.iloc[i, j]
                if not np.isnan(val):
                    pairs.append({"feature1": cols[i], "feature2": cols[j], "correlation": round(float(val), 4)})
        pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

        return {"original": matrix(num_raw), "cleaned": matrix(num_cln), "pairs": pairs[:10]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preprocess")
async def preprocess(
    file:             UploadFile = File(...),
    fill_numeric:     str        = Form("mean"),
    fill_categorical: str        = Form("mode"),
    scale_strategy:   str        = Form("none"),
    drop_duplicates:  str        = Form("false"),
):
    try:
        df = read_csv_safe(file)
        rows_before = len(df)
        filled_numeric     = 0
        filled_categorical = 0

        # Drop duplicates
        if drop_duplicates.lower() == "true":
            df = df.drop_duplicates()

        num_cols = df.select_dtypes(include="number").columns.tolist()
        cat_cols = df.select_dtypes(include="object").columns.tolist()

        # Fill numeric missing
        if fill_numeric == "drop":
            df = df.dropna(subset=num_cols)
        else:
            for col in num_cols:
                n = df[col].isnull().sum()
                if n > 0:
                    if fill_numeric == "mean":
                        df[col] = df[col].fillna(df[col].mean())
                    elif fill_numeric == "median":
                        df[col] = df[col].fillna(df[col].median())
                    elif fill_numeric == "zero":
                        df[col] = df[col].fillna(0)
                    filled_numeric += int(n)

        # Fill categorical missing
        if fill_categorical == "drop":
            df = df.dropna(subset=cat_cols)
        else:
            for col in cat_cols:
                n = df[col].isnull().sum()
                if n > 0:
                    if fill_categorical == "mode":
                        mode = df[col].mode()
                        df[col] = df[col].fillna(mode[0] if len(mode) else "Unknown")
                    elif fill_categorical == "unknown":
                        df[col] = df[col].fillna("Unknown")
                    filled_categorical += int(n)

        # Scale numeric
        if scale_strategy != "none" and num_cols:
            from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
            scaler = {"standard": StandardScaler(), "minmax": MinMaxScaler(), "robust": RobustScaler()}[scale_strategy]
            df[num_cols] = scaler.fit_transform(df[num_cols])

        # Build preview
        def safe_val(v):
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                return None
            if hasattr(v, 'item'):
                return v.item()
            return v

        preview = [{k: safe_val(v) for k, v in row.items()} for row in df.head(10).to_dict(orient="records")]

        # CSV export
        csv_str = df.to_csv(index=False)

        return {
            "rows_before":         rows_before,
            "rows_after":          len(df),
            "cols":                len(df.columns),
            "filled_numeric":      filled_numeric,
            "filled_categorical":  filled_categorical,
            "columns":             df.columns.tolist(),
            "preview":             preview,
            "csv":                 csv_str,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
async def train(
    file:      UploadFile = File(...),
    target:    str        = Form(...),
    algorithm: str        = Form(...),
    test_size: float      = Form(0.2),
):
    try:
        df = clean_df(read_csv_safe(file))

        if target not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{target}' not found")

        is_reg = is_numeric_dtype(df[target])
        problem_type = "regression" if is_reg else "classification"

        X = df.drop(columns=[target])
        y = df[target].copy()
        X_enc = pd.get_dummies(X, drop_first=True)

        if not is_reg and y.dtype == "object":
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y), index=y.index)

        if len(X_enc) < 10:
            raise HTTPException(status_code=400, detail="Need at least 10 rows to train a model")

        X_train, X_test, y_train, y_test = train_test_split(
            X_enc, y, test_size=test_size, random_state=42
        )

        registry = _REGRESSION_MODELS if is_reg else _CLASSIFICATION_MODELS
        if algorithm not in registry:
            raise HTTPException(status_code=400, detail=f"Unknown algorithm '{algorithm}'")

        # Clone so the global prototype is never mutated
        model = clone(registry[algorithm])
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        result: dict = {
            "algorithm":     algorithm,
            "problem_type":  problem_type,
            "train_samples": len(X_train),
            "test_samples":  len(X_test),
            "features":      int(X_enc.shape[1]),
        }

        if is_reg:
            result["metrics"] = {
                "r2":   round(float(r2_score(y_test, y_pred)), 4),
                "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
                "mae":  round(float(mean_absolute_error(y_test, y_pred)), 4),
            }
            sample = min(200, len(y_test))
            result["actual_vs_predicted"] = {
                "actual":    [float(v) for v in y_test.tolist()[:sample]],
                "predicted": [float(v) for v in y_pred.tolist()[:sample]],
            }
        else:
            result["metrics"] = {"accuracy": round(float(accuracy_score(y_test, y_pred)), 4)}
            report = classification_report(y_test, y_pred, output_dict=True)
            result["classification_report"] = {
                k: {m: round(float(v), 4) for m, v in vals.items()} if isinstance(vals, dict) else round(float(vals), 4)
                for k, vals in report.items()
            }
            result["confusion_matrix"] = confusion_matrix(y_test, y_pred).tolist()

        imp = get_feature_importance(model, X_enc.columns)
        if imp is not None:
            cum = np.cumsum(imp.values)
            total = cum[-1] if cum[-1] != 0 else 1
            result["feature_importance"] = {
                "features":   imp.index.tolist(),
                "scores":     [round(float(v), 6) for v in imp.values],
                "cumulative": [round(float(v / total * 100), 2) for v in cum],
            }

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
