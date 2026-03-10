const form = document.getElementById("predictForm");
const scoreDisplay = document.getElementById("scoreDisplay");
const scoreBadge = document.getElementById("scoreBadge");
const extraInfo = document.getElementById("extraInfo");

function getToken() {
  return localStorage.getItem("id_token");
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    alert("Please login first.");
    return false;
  }
  return true;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

function badgeFromScore(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "At Risk";
}

function riskTextFromScore(score) {
  if (score >= 60) return "Low Risk";
  if (score >= 40) return "Medium Risk";
  return "High Risk";
}

function cacheHomePreview(data, score, backendRisk) {
  const latest = {
    study_hours_per_day: data.study_hours_per_day,
    attendance_percentage: data.attendance_percentage,
    sleep_hours: data.sleep_hours,
    mental_health_rating: data.mental_health_rating,
    social_media_hours: data.social_media_hours,
    netflix_hours: data.netflix_hours,
    diet_quality: data.diet_quality,
    predicted_exam_score: score,
    risk_level: backendRisk || "Not available",
    created_at: new Date().toISOString()
  };

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("home_prediction_history") || "[]");
  } catch {
    history = [];
  }

  history.push({
    score: score,
    created_at: new Date().toISOString()
  });

  if (history.length > 10) {
    history = history.slice(-10);
  }

  localStorage.setItem("home_latest_prediction", JSON.stringify(latest));
  localStorage.setItem("home_prediction_history", JSON.stringify(history));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireAuth()) return;

  const data = {
    student_id: "me",
    study_hours_per_day: parseFloat(document.getElementById("study_hours").value),
    attendance_percentage: parseFloat(document.getElementById("attendance").value),
    sleep_hours: parseFloat(document.getElementById("sleep_hours").value),
    mental_health_rating: parseInt(document.getElementById("mental_health").value, 10),
    social_media_hours: parseFloat(document.getElementById("social_media").value),
    netflix_hours: parseFloat(document.getElementById("netflix").value),
    diet_quality: document.getElementById("diet_quality").value
  };

  try {
    const response = await fetch(`${window.API_BASE}/me/predict_score`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      const msg =
        typeof result.detail === "string"
          ? result.detail
          : JSON.stringify(result.detail || result);
      alert(msg || "Prediction failed");
      return;
    }

    const score = result.predicted_exam_score;

    const placeholder = document.querySelector(".result-placeholder");
    const resultContent = document.getElementById("resultContent");

    if (placeholder) placeholder.style.display = "none";
    if (resultContent) resultContent.style.display = "block";

    scoreDisplay.textContent = score;
    scoreBadge.textContent = badgeFromScore(score);

    if (extraInfo) {
      extraInfo.textContent = `Risk Level: ${result.risk_level || "--"}`;
    }

    cacheHomePreview(data, score, result.risk_level);

  } catch (err) {
    console.error(err);
    alert("Error connecting to server");
  }
});