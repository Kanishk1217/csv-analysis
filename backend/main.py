from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
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
    allow_origins=["*"],  # Replace with your Cloudflare domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

REGRESSION_MODELS = {
    "Linear Regression":  LinearRegression(),
    "Ridge Regression":   Ridge(),
    "Decision Tree":      DecisionTreeRegressor(random_state=42),
    "Random Forest":      RandomForestRegressor(n_estimators=100, random_state=42),
    "Gradient Boosting":  GradientBoostingRegressor(random_state=42),
}
CLASSIFICATION_MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Decision Tree":       DecisionTreeClassifier(random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting":   GradientBoostingClassifier(random_state=42),
}


def read_csv(file: UploadFile) -> pd.DataFrame:
    contents = file.file.read()
    return pd.read_csv(io.BytesIO(contents))


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    num_cols = out.select_dtypes(include="number").columns
    cat_cols = out.select_dtypes(include="object").columns
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


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    df_raw = read_csv(file)
    df = clean_df(df_raw)

    num_cols = df.columns[df.dtypes != "object"].tolist()
    cat_cols = df.columns[df.dtypes == "object"].tolist()
    stats = df.describe().replace({np.nan: None}).to_dict()
    cat_summary = {
        col: df[col].value_counts().head(10).to_dict()
        for col in cat_cols
    }

    return {
        "shape":         list(df_raw.shape),
        "columns":       df.columns.tolist(),
        "dtypes":        df.dtypes.astype(str).to_dict(),
        "preview":       df.head(10).replace({np.nan: None}).to_dict(orient="records"),
        "missing":       df_raw.isnull().sum().to_dict(),
        "missing_total": int(df_raw.isnull().sum().sum()),
        "duplicates":    int(df_raw.duplicated().sum()),
        "complete_rows": int((~df_raw.isnull().any(axis=1)).sum()),
        "memory_mb":     round(df.memory_usage(deep=True).sum() / 1024**2, 4),
        "numeric_cols":  num_cols,
        "cat_cols":      cat_cols,
        "statistics":    stats,
        "cat_summary":   cat_summary,
    }


@app.post("/correlations")
async def correlations(file: UploadFile = File(...)):
    df_raw = read_csv(file)
    df = clean_df(df_raw)

    num_raw = df_raw.select_dtypes("number")
    num_cln = df.select_dtypes("number")

    if num_cln.empty:
        return {"error": "No numeric columns found"}

    def matrix(d):
        corr = d.corr().replace({np.nan: None})
        return {"columns": d.columns.tolist(), "matrix": corr.values.tolist()}

    corr = num_cln.corr()
    pairs = []
    cols = corr.columns.tolist()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            val = corr.iloc[i, j]
            if not np.isnan(val):
                pairs.append({"feature1": cols[i], "feature2": cols[j], "correlation": round(val, 4)})
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    return {"original": matrix(num_raw), "cleaned": matrix(num_cln), "pairs": pairs[:10]}


@app.post("/train")
async def train(
    file:      UploadFile = File(...),
    target:    str        = Form(...),
    algorithm: str        = Form(...),
    test_size: float      = Form(0.2),
):
    df = clean_df(read_csv(file))

    if target not in df.columns:
        return {"error": f"Column '{target}' not found"}

    is_reg = is_numeric_dtype(df[target])
    problem_type = "regression" if is_reg else "classification"

    X = df.drop(columns=[target])
    y = df[target].copy()
    X_enc = pd.get_dummies(X, drop_first=True)

    le = None
    if not is_reg and y.dtype == "object":
        le = LabelEncoder()
        y = pd.Series(le.fit_transform(y), index=y.index)

    X_train, X_test, y_train, y_test = train_test_split(
        X_enc, y, test_size=test_size, random_state=42
    )

    registry = REGRESSION_MODELS if is_reg else CLASSIFICATION_MODELS
    if algorithm not in registry:
        return {"error": f"Unknown algorithm '{algorithm}'"}

    model = registry[algorithm]
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    result = {
        "algorithm":     algorithm,
        "problem_type":  problem_type,
        "train_samples": len(X_train),
        "test_samples":  len(X_test),
        "features":      X_enc.shape[1],
    }

    if is_reg:
        result["metrics"] = {
            "r2":   round(r2_score(y_test, y_pred), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "mae":  round(float(mean_absolute_error(y_test, y_pred)), 4),
        }
        sample = min(200, len(y_test))
        result["actual_vs_predicted"] = {
            "actual":    y_test.tolist()[:sample],
            "predicted": y_pred.tolist()[:sample],
        }
    else:
        result["metrics"] = {"accuracy": round(float(accuracy_score(y_test, y_pred)), 4)}
        report = classification_report(y_test, y_pred, output_dict=True)
        result["classification_report"] = {
            k: {m: round(v, 4) for m, v in vals.items()} if isinstance(vals, dict) else round(vals, 4)
            for k, vals in report.items()
        }
        result["confusion_matrix"] = confusion_matrix(y_test, y_pred).tolist()

    imp = get_feature_importance(model, X_enc.columns)
    if imp is not None:
        cum = np.cumsum(imp.values)
        result["feature_importance"] = {
            "features":   imp.index.tolist(),
            "scores":     imp.values.round(6).tolist(),
            "cumulative": (cum / cum[-1] * 100).round(2).tolist(),
        }

    return result


@app.get("/health")
async def health():
    return {"status": "ok"}
