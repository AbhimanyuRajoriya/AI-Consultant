import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from xgboost import XGBRegressor
    _HAS_XGB = True
except Exception:
    _HAS_XGB = False
    from sklearn.ensemble import RandomForestRegressor


MODEL_REPORT = {}


def load_and_prepare_data(csv_path="students.csv"):
    df = pd.read_csv(csv_path)

    num_cols = [
        "study_hours_per_day",
        "attendance_percentage",
        "sleep_hours",
        "mental_health_rating",
        "social_media_hours",
        "netflix_hours",
        "exam_score"
    ]

    for col in num_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["screen_time"] = df["social_media_hours"] + df["netflix_hours"]

    features = [
        "study_hours_per_day",
        "attendance_percentage",
        "sleep_hours",
        "mental_health_rating",
        "screen_time",
        "diet_quality"
    ]

    X = df[features].copy()
    y = df["exam_score"].copy()

    diet_encoder = LabelEncoder()
    X["diet_quality"] = diet_encoder.fit_transform(X["diet_quality"].astype(str))

    X = X.astype(float)

    X = X.fillna(X.median(numeric_only=True))
    y = y.fillna(y.median())

    return df, X, y, diet_encoder


def _compute_feature_importance(model, feature_names):
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        pairs = list(zip(feature_names, importances))
        pairs.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                "feature": feature,
                "importance": round(float(importance), 4)
            }
            for feature, importance in pairs
        ]

    return [
        {
            "feature": feature,
            "importance": 0.0
        }
        for feature in feature_names
    ]


def train_model(X, y):
    global MODEL_REPORT

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    if _HAS_XGB:
        model = XGBRegressor(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            tree_method="hist"
        )
        model_name = "XGBoostRegressor"
    else:
        model = RandomForestRegressor(
            n_estimators=300,
            random_state=42
        )
        model_name = "RandomForestRegressor (fallback)"

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)
    rmse = mse ** 0.5
    r2 = r2_score(y_test, predictions)

    MODEL_REPORT = {
        "model": model_name,
        "metrics": {
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "r2": round(float(r2), 3)
        },
        "feature_importance": _compute_feature_importance(model, list(X.columns))
    }

    return model


def get_model_report():
    return MODEL_REPORT