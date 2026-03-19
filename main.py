from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import pandas as pd
import uuid
import time
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os

from model import load_and_prepare_data, train_model, get_model_report
from db import init_db, save_student, get_student, save_prediction, get_latest_prediction, get_prediction_history
from consultant import consult
from auth import get_current_user

app = FastAPI(title="AI Student Consultant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://abhimanyurajoriya.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

df, X, y, diet_encoder = load_and_prepare_data()
score_model = train_model(X, y)

init_db()

consultation_sessions = {}
SESSION_TIMEOUT = 1800


class StudentProfile(BaseModel):
    student_id: str
    study_hours_per_day: float
    attendance_percentage: float
    sleep_hours: float
    mental_health_rating: int
    social_media_hours: float
    netflix_hours: float
    diet_quality: str


class StartSession(BaseModel):
    student_id: str


class ChatMessage(BaseModel):
    session_id: str
    question: str


class WhatIfRequest(BaseModel):
    study_hours_per_day: Optional[float] = None
    attendance_percentage: Optional[float] = None
    sleep_hours: Optional[float] = None
    mental_health_rating: Optional[int] = None
    social_media_hours: Optional[float] = None
    netflix_hours: Optional[float] = None
    diet_quality: Optional[str] = None


def _risk_level(predicted_score: float) -> str:
    if predicted_score < 40:
        return "High Risk"
    if predicted_score < 60:
        return "Medium Risk"
    return "Low Risk"


@app.post("/predict_score")
def predict_score(profile: StudentProfile):
    screen_time = profile.social_media_hours + profile.netflix_hours

    input_data = pd.DataFrame([{
        "study_hours_per_day": profile.study_hours_per_day,
        "attendance_percentage": profile.attendance_percentage,
        "sleep_hours": profile.sleep_hours,
        "mental_health_rating": profile.mental_health_rating,
        "screen_time": screen_time,
        "diet_quality": diet_encoder.transform([profile.diet_quality])[0]
    }])

    predicted_score = float(score_model.predict(input_data)[0])
    predicted_score = max(0.0, min(100.0, predicted_score))

    save_student({
        **profile.dict(),
        "exam_score": predicted_score
    })

    report = get_model_report()

    return {
        "student_id": profile.student_id,
        "predicted_exam_score": round(predicted_score, 2),
        "risk_level": _risk_level(predicted_score),
        "model_used": report.get("model", "unknown"),
        "model_metrics": report.get("metrics", {}),
        "top_factors": report.get("feature_importance", [])[:3]
    }


@app.post("/start_session")
def start_session(data: StartSession):
    student_row = get_student(data.student_id)
    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")

    student_data = {
        "student_id": student_row[0],
        "study_hours_per_day": student_row[1],
        "attendance_percentage": student_row[2],
        "sleep_hours": student_row[3],
        "mental_health_rating": student_row[4],
        "social_media_hours": student_row[5],
        "netflix_hours": student_row[6],
        "diet_quality": student_row[7],
        "exam_score": student_row[8]
    }

    session_id = str(uuid.uuid4())
    consultation_sessions[session_id] = {
        "student_data": student_data,
        "created_at": time.time()
    }

    return {
        "message": "Consultation session started",
        "session_id": session_id
    }


@app.post("/chat")
def chat_consultant(data: ChatMessage):
    session = consultation_sessions.get(data.session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Invalid session")

    if time.time() - session["created_at"] > SESSION_TIMEOUT:
        del consultation_sessions[data.session_id]
        raise HTTPException(status_code=403, detail="Session expired")

    answer = consult(session["student_data"], data.question)
    return {
        "question": data.question,
        "answer": answer
    }


@app.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "sub": user["sub"],
        "email": user.get("email"),
        "username": user.get("username")
    }


@app.post("/me/predict_score")
def predict_score_me(profile: StudentProfile, user=Depends(get_current_user)):
    screen_time = profile.social_media_hours + profile.netflix_hours

    input_data = pd.DataFrame([{
        "study_hours_per_day": profile.study_hours_per_day,
        "attendance_percentage": profile.attendance_percentage,
        "sleep_hours": profile.sleep_hours,
        "mental_health_rating": profile.mental_health_rating,
        "screen_time": screen_time,
        "diet_quality": diet_encoder.transform([profile.diet_quality])[0]
    }])

    predicted_score = float(score_model.predict(input_data)[0])
    predicted_score = max(0.0, min(100.0, predicted_score))

    save_prediction(user["sub"], profile.dict(), predicted_score)

    save_student({
        "student_id": user["sub"],
        "study_hours_per_day": profile.study_hours_per_day,
        "attendance_percentage": profile.attendance_percentage,
        "sleep_hours": profile.sleep_hours,
        "mental_health_rating": profile.mental_health_rating,
        "social_media_hours": profile.social_media_hours,
        "netflix_hours": profile.netflix_hours,
        "diet_quality": profile.diet_quality,
        "exam_score": predicted_score
    })

    report = get_model_report()

    return {
        "predicted_exam_score": round(predicted_score, 2),
        "risk_level": _risk_level(predicted_score),
        "model_used": report.get("model", "unknown"),
        "model_metrics": report.get("metrics", {}),
        "top_factors": report.get("feature_importance", [])[:3]
    }


@app.get("/me/dashboard")
def dashboard(user=Depends(get_current_user)):
    latest = get_latest_prediction(user["sub"])

    if not latest:
        return {"message": "No predictions yet. Predict once to see dashboard."}

    history = get_prediction_history(user["sub"], limit=10)

    latest_score = float(latest[7])

    return {
        "latest": {
            "study_hours_per_day": float(latest[0]),
            "attendance_percentage": float(latest[1]),
            "sleep_hours": float(latest[2]),
            "mental_health_rating": int(latest[3]),
            "social_media_hours": float(latest[4]),
            "netflix_hours": float(latest[5]),
            "diet_quality": str(latest[6]),
            "predicted_exam_score": round(latest_score, 2),
            "risk_level": _risk_level(latest_score),
            "created_at": str(latest[8]),
        },
        "history": [
            {"score": float(s), "created_at": str(t)}
            for (s, t) in history
        ],
        "model_report": get_model_report(),
    }


@app.post("/me/what_if")
def what_if(req: WhatIfRequest, user=Depends(get_current_user)):
    latest = get_latest_prediction(user["sub"])

    if not latest:
        raise HTTPException(status_code=400, detail="Predict once before using what-if")

    base = {
        "study_hours_per_day": float(latest[0]),
        "attendance_percentage": float(latest[1]),
        "sleep_hours": float(latest[2]),
        "mental_health_rating": int(latest[3]),
        "social_media_hours": float(latest[4]),
        "netflix_hours": float(latest[5]),
        "diet_quality": str(latest[6]),
    }

    updates = req.dict()
    for k, v in updates.items():
        if v is not None:
            base[k] = v

    screen_time = float(base["social_media_hours"]) + float(base["netflix_hours"])

    input_data = pd.DataFrame([{
        "study_hours_per_day": float(base["study_hours_per_day"]),
        "attendance_percentage": float(base["attendance_percentage"]),
        "sleep_hours": float(base["sleep_hours"]),
        "mental_health_rating": int(base["mental_health_rating"]),
        "screen_time": screen_time,
        "diet_quality": diet_encoder.transform([str(base["diet_quality"])])[0]
    }])

    predicted_score = float(score_model.predict(input_data)[0])
    predicted_score = max(0.0, min(100.0, predicted_score))

    return {
        "what_if_input": base,
        "predicted_exam_score": round(predicted_score, 2),
        "risk_level": _risk_level(predicted_score),
    }


@app.post("/me/start_session")
def start_session_me(user=Depends(get_current_user)):
    latest = get_latest_prediction(user["sub"])

    if not latest:
        raise HTTPException(status_code=400, detail="Predict once before consulting")

    student_data = {
        "student_id": user["sub"],
        "study_hours_per_day": float(latest[0]),
        "attendance_percentage": float(latest[1]),
        "sleep_hours": float(latest[2]),
        "mental_health_rating": int(latest[3]),
        "social_media_hours": float(latest[4]),
        "netflix_hours": float(latest[5]),
        "diet_quality": str(latest[6]),
        "exam_score": float(latest[7]),
    }

    session_id = str(uuid.uuid4())
    consultation_sessions[session_id] = {
        "student_data": student_data,
        "created_at": time.time()
    }

    return {
        "message": "Consultation session started",
        "session_id": session_id
    }


@app.get("/model_report")
def model_report():
    return get_model_report()


@app.get("/auth/config")
def get_auth_config():
    return {
        "COGNITO_DOMAIN": os.getenv("COGNITO_DOMAIN"),
        "CLIENT_ID": os.getenv("COGNITO_APP_CLIENT_ID"),
        "REDIRECT_URI": f"{os.getenv('COGNITO_REDIRECT_URI')}",
        "LOGOUT_URI": f"{os.getenv('COGNITO_LOGOUT_URI')}"
    }


@app.get("/auth/debug")
def auth_debug():
    region = os.getenv("COGNITO_REGION")
    pool = os.getenv("COGNITO_USER_POOL_ID")
    client = os.getenv("COGNITO_APP_CLIENT_ID")
    issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool}" if region and pool else None
    jwks = f"{issuer}/.well-known/jwks.json" if issuer else None

    return {
        "COGNITO_REGION": region,
        "COGNITO_USER_POOL_ID": pool,
        "COGNITO_APP_CLIENT_ID": client,
        "ISSUER": issuer,
        "JWKS_URL": jwks,
    }
from fastapi import Request
@app.options("/{full_path:path}")
async def preflight_handler(request: Request):
    return {}