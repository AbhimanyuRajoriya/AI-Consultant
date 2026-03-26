from sentence_transformers import SentenceTransformer, util
import numpy as np
from consultant_dataset import consultation_data

model = SentenceTransformer("all-MiniLM-L6-v2")

patterns = [item["pattern"] for item in consultation_data]
responses = [item["response"] for item in consultation_data]
domains = [item["domain"] for item in consultation_data]

pattern_embeddings = model.encode(patterns, convert_to_tensor=True, normalize_embeddings=True)

_DOMAIN_WEIGHT = {
    "general": 1.00,
    "study": 1.05,
    "sleep": 1.05,
    "screen": 1.05,
    "attendance": 1.05,
    "mental_health": 1.05
}

def _clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.strip().lower()
    text = " ".join(text.split())
    return text

def _safe_float(d, key, default=0.0) -> float:
    try:
        v = d.get(key, default)
        return float(v)
    except Exception:
        return float(default)

def _safe_int(d, key, default=0) -> int:
    try:
        v = d.get(key, default)
        return int(v)
    except Exception:
        return int(default)

def _weak_domains(student_data: dict):
    """Detect weak areas to slightly bias matching when similarities are close."""
    study = _safe_float(student_data, "study_hours_per_day", 0.0)
    sleep = _safe_float(student_data, "sleep_hours", 0.0)
    attendance = _safe_float(student_data, "attendance_percentage", 0.0)
    social = _safe_float(student_data, "social_media_hours", 0.0)
    netflix = _safe_float(student_data, "netflix_hours", 0.0)
    mh = _safe_int(student_data, "mental_health_rating", 5)

    weak = set()
    if study < 3:
        weak.add("study")
    if sleep < 6:
        weak.add("sleep")
    if (social + netflix) > 5:
        weak.add("screen")
    if attendance < 75:
        weak.add("attendance")
    if mh <= 3:
        weak.add("mental_health")
    return weak

def _risk_label(score: float) -> str:
    if score < 40:
        return "High Risk"
    if score < 60:
        return "Medium Risk"
    return "Low Risk"

def _action_plan(student_data: dict):
    study = _safe_float(student_data, "study_hours_per_day", 0.0)
    sleep = _safe_float(student_data, "sleep_hours", 0.0)
    attendance = _safe_float(student_data, "attendance_percentage", 0.0)
    screen = _safe_float(student_data, "social_media_hours", 0.0) + _safe_float(student_data, "netflix_hours", 0.0)

    actions = []

    if attendance < 75:
        actions.append("Increase attendance to 75%+ (this has a big impact).")
    if study < 3:
        actions.append("Raise study time to at least 3 hours/day with focused sessions.")
    if sleep < 6:
        actions.append("Fix sleep to 6–7 hours for memory and focus.")
    if screen > 5:
        actions.append("Reduce screen time below 5 hours/day, especially before studying.")

    return actions[:3]

def consult(student_data, user_question):
    user_question = _clean_text(user_question)

    question_embedding = model.encode(user_question, convert_to_tensor=True, normalize_embeddings=True)

    scores = util.cos_sim(question_embedding, pattern_embeddings)
    scores_np = scores.cpu().numpy().reshape(-1)

    top_k = min(5, len(scores_np))
    top_indices = np.argsort(scores_np)[::-1][:top_k]

    best_raw_idx = int(top_indices[0])
    best_raw_score = float(scores_np[best_raw_idx])

    if best_raw_score < 0.40:
        weak = _weak_domains(student_data)
        if weak:
            if "study" in weak:
                return "I couldn't match your exact question. Based on your data, increase consistent daily study time and revise with a plan."
            if "sleep" in weak:
                return "I couldn't match your exact question. Based on your data, improve sleep duration and keep a fixed sleep schedule."
            if "screen" in weak:
                return "I couldn't match your exact question. Based on your data, reduce screen time and keep distraction-free study blocks."
            if "attendance" in weak:
                return "I couldn't match your exact question. Based on your data, improve attendance to strengthen concepts and consistency."
            if "mental_health" in weak:
                return "I couldn't match your exact question. Based on your data, balance workload, sleep well, and take short breaks to avoid burnout."
        return "Based on available data, focus on improving study habits and lifestyle balance."

    weak = _weak_domains(student_data)

    best_idx = best_raw_idx
    best_weighted = best_raw_score

    for idx in top_indices:
        raw = float(scores_np[int(idx)])
        dom = domains[int(idx)]
        weight = _DOMAIN_WEIGHT.get(dom, 1.0)

        if dom in weak:
            weight += 0.03

        weighted = raw * weight

        if weighted > best_weighted + 0.01:
            best_weighted = weighted
            best_idx = int(idx)

    base_answer = responses[best_idx]
    matched_domain = domains[best_idx]

    advice = []

    study_hours = _safe_float(student_data, "study_hours_per_day", 0.0)
    sleep_hours = _safe_float(student_data, "sleep_hours", 0.0)
    attendance = _safe_float(student_data, "attendance_percentage", 0.0)
    screen_time = _safe_float(student_data, "social_media_hours", 0.0) + _safe_float(student_data, "netflix_hours", 0.0)
    mh_rating = _safe_int(student_data, "mental_health_rating", 5)

    if matched_domain in ["study", "general"]:
        if study_hours < 2:
            advice.append("Your study time is very low. Aim for 2–3 focused hours daily first, then increase gradually.")
        elif study_hours < 3:
            advice.append("Increase daily study hours to at least 3 with a fixed timetable and short breaks.")
        elif study_hours < 4:
            advice.append("You’re close—push to 4 hours with revision + practice questions.")

    if matched_domain in ["sleep", "general"]:
        if sleep_hours < 5:
            advice.append("Your sleep is too low. Try moving to 6–7 hours quickly; it will improve memory and focus.")
        elif sleep_hours < 6:
            advice.append("Increase sleep to 6–7 hours to support concentration.")
 
    if matched_domain in ["screen", "general"]:
        if screen_time > 7:
            advice.append("Your screen time is very high. Cut it down by 2 hours and use app limits during study time.")
        elif screen_time > 5:
            advice.append("Reduce screen time; it’s likely hurting focus and consistency.")

    if matched_domain in ["attendance", "general"]:
        if attendance < 60:
            advice.append("Attendance is very low. Try to reach 75% first—regular classes reduce backlog stress.")
        elif attendance < 75:
            advice.append("Improve attendance to 75%+ for better understanding and performance.")

    if matched_domain in ["mental_health", "general"]:
        if mh_rating <= 3:
            advice.append("Your mental health rating looks low. Reduce overload, take breaks, and keep sleep and routine stable.")

    final_advice = " ".join(advice)

    predicted = _safe_float(student_data, "exam_score", 0.0)
    header = f"Your predicted score is {round(predicted, 2)} ({_risk_label(predicted)}). "

    plan = _action_plan(student_data)
    if plan:
        plan_text = " Action plan: " + " ".join([f"{i+1}) {p}" for i, p in enumerate(plan)])
    else:
        plan_text = ""

    return header + base_answer + (" " + final_advice if final_advice else "") + plan_text