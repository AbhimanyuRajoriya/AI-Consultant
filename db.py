import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DB_URL)

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            student_id TEXT PRIMARY KEY,
            study_hours_per_day REAL,
            attendance_percentage REAL,
            sleep_hours REAL,
            mental_health_rating INTEGER,
            social_media_hours REAL,
            netflix_hours REAL,
            diet_quality TEXT,
            exam_score REAL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id BIGSERIAL PRIMARY KEY,
            user_sub TEXT NOT NULL,
            study_hours_per_day REAL,
            attendance_percentage REAL,
            sleep_hours REAL,
            mental_health_rating INTEGER,
            social_media_hours REAL,
            netflix_hours REAL,
            diet_quality TEXT,
            predicted_exam_score REAL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_predictions_user_sub ON predictions(user_sub)")

    conn.commit()
    conn.close()

def save_student(student):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO students (
            student_id,
            study_hours_per_day,
            attendance_percentage,
            sleep_hours,
            mental_health_rating,
            social_media_hours,
            netflix_hours,
            diet_quality,
            exam_score
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (student_id) DO UPDATE SET
            study_hours_per_day=EXCLUDED.study_hours_per_day,
            attendance_percentage=EXCLUDED.attendance_percentage,
            sleep_hours=EXCLUDED.sleep_hours,
            mental_health_rating=EXCLUDED.mental_health_rating,
            social_media_hours=EXCLUDED.social_media_hours,
            netflix_hours=EXCLUDED.netflix_hours,
            diet_quality=EXCLUDED.diet_quality,
            exam_score=EXCLUDED.exam_score
    """, (
        student["student_id"],
        student["study_hours_per_day"],
        student["attendance_percentage"],
        student["sleep_hours"],
        student["mental_health_rating"],
        student["social_media_hours"],
        student["netflix_hours"],
        student["diet_quality"],
        student["exam_score"],
    ))
    conn.commit()
    conn.close()

def get_student(student_id: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM students WHERE student_id=%s", (student_id,))
    row = cur.fetchone()
    conn.close()
    return row

def save_prediction(user_sub: str, profile: dict, predicted_score: float):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO predictions (
            user_sub,
            study_hours_per_day,
            attendance_percentage,
            sleep_hours,
            mental_health_rating,
            social_media_hours,
            netflix_hours,
            diet_quality,
            predicted_exam_score
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        user_sub,
        profile.get("study_hours_per_day"),
        profile.get("attendance_percentage"),
        profile.get("sleep_hours"),
        profile.get("mental_health_rating"),
        profile.get("social_media_hours"),
        profile.get("netflix_hours"),
        profile.get("diet_quality"),
        predicted_score
    ))
    conn.commit()
    conn.close()

def get_latest_prediction(user_sub: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            study_hours_per_day,
            attendance_percentage,
            sleep_hours,
            mental_health_rating,
            social_media_hours,
            netflix_hours,
            diet_quality,
            predicted_exam_score,
            created_at
        FROM predictions
        WHERE user_sub=%s
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_sub,))
    row = cur.fetchone()
    conn.close()
    return row

def get_prediction_history(user_sub: str, limit: int = 10):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT predicted_exam_score, created_at
        FROM predictions
        WHERE user_sub=%s
        ORDER BY created_at DESC
        LIMIT %s
    """, (user_sub, limit))
    rows = cur.fetchall()
    conn.close()
    return rows