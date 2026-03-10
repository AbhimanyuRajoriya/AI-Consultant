const form = document.getElementById("whatIfForm");
const simScore = document.getElementById("simScore");
const simRisk = document.getElementById("simRisk");
const simCards = document.getElementById("simCards");
const comparisonText = document.getElementById("comparisonText");
const resultPlaceholder = document.getElementById("resultPlaceholder");
const resultContent = document.getElementById("resultContent");

function getToken() {
  return localStorage.getItem("id_token");
}

function isTokenExpired() {
  const exp = localStorage.getItem("token_exp");
  if (!exp) return false;
  return Date.now() > Number(exp);
}

function clearAuthAndRedirect(message) {
  localStorage.removeItem("id_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_exp");
  alert(message || "Session expired. Please login again.");
  location.href = "index.html";
}

function requireAuth() {
  const token = getToken();

  if (!token) {
    alert("Please login first.");
    location.href = "index.html";
    return false;
  }

  if (isTokenExpired()) {
    clearAuthAndRedirect("Session expired. Please login again.");
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

function setRiskBadge(text) {
  simRisk.textContent = text || "--";
  simRisk.className = "score-badge";

  if (!text) return;

  const t = text.toLowerCase();
  if (t.includes("low")) {
    simRisk.style.backgroundColor = "#d9f7d9";
    simRisk.style.color = "#145214";
    simRisk.style.border = "1px solid #1a1a1a";
  } else if (t.includes("medium")) {
    simRisk.style.backgroundColor = "#fff1b8";
    simRisk.style.color = "#6b4f00";
    simRisk.style.border = "1px solid #1a1a1a";
  } else {
    simRisk.style.backgroundColor = "#ffd6d6";
    simRisk.style.color = "#7a1111";
    simRisk.style.border = "1px solid #1a1a1a";
  }
}

function createCard(label, value) {
  const div = document.createElement("div");
  div.style.border = "1px solid #dcdcdc";
  div.style.padding = "10px";
  div.style.background = "#fafafa";

  div.innerHTML = `
    <div style="font-size:12px; color:#636363; margin-bottom:4px;">${label}</div>
    <div style="font-size:18px; font-weight:700;">${value}</div>
  `;
  return div;
}

async function fetchLatestDashboard() {
  const res = await fetch(`${window.API_BASE}/me/dashboard`, {
    headers: {
      "Authorization": `Bearer ${getToken()}`
    }
  });

  const data = await res.json();

  if (res.status === 401) {
    clearAuthAndRedirect("Your session expired. Please login again.");
    return null;
  }

  if (!res.ok || data.message) {
    return null;
  }

  return data.latest || null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireAuth()) return;

  const payload = {};

  const study = document.getElementById("w_study").value.trim();
  const att = document.getElementById("w_att").value.trim();
  const sleep = document.getElementById("w_sleep").value.trim();
  const mental = document.getElementById("w_mental").value.trim();
  const social = document.getElementById("w_social").value.trim();
  const netflix = document.getElementById("w_netflix").value.trim();
  const diet = document.getElementById("w_diet").value;

  if (study !== "") payload.study_hours_per_day = parseFloat(study);
  if (att !== "") payload.attendance_percentage = parseFloat(att);
  if (sleep !== "") payload.sleep_hours = parseFloat(sleep);
  if (mental !== "") payload.mental_health_rating = parseInt(mental, 10);
  if (social !== "") payload.social_media_hours = parseFloat(social);
  if (netflix !== "") payload.netflix_hours = parseFloat(netflix);
  if (diet !== "") payload.diet_quality = diet;

  try {
    const latest = await fetchLatestDashboard();

    const res = await fetch(`${window.API_BASE}/me/what_if`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.status === 401) {
      clearAuthAndRedirect("Your session expired. Please login again.");
      return;
    }

    if (!res.ok) {
      alert(data.detail || "What-if simulation failed");
      return;
    }

    resultPlaceholder.style.display = "none";
    resultContent.style.display = "block";

    simScore.textContent = data.predicted_exam_score;
    setRiskBadge(data.risk_level);

    const simulated = data.what_if_input || {};
    simCards.innerHTML = "";

    simCards.appendChild(createCard("Study Hours", simulated.study_hours_per_day ?? "--"));
    simCards.appendChild(createCard("Attendance %", simulated.attendance_percentage ?? "--"));
    simCards.appendChild(createCard("Sleep Hours", simulated.sleep_hours ?? "--"));
    simCards.appendChild(createCard("Mental Health", simulated.mental_health_rating ?? "--"));
    simCards.appendChild(createCard("Social Media", simulated.social_media_hours ?? "--"));
    simCards.appendChild(createCard("Netflix", simulated.netflix_hours ?? "--"));
    simCards.appendChild(createCard("Diet Quality", simulated.diet_quality ?? "--"));

    const currentScore = latest?.predicted_exam_score;
    const newScore = Number(data.predicted_exam_score);

    if (currentScore !== undefined && currentScore !== null) {
      const diff = +(newScore - Number(currentScore)).toFixed(2);
      let text = `Current saved score: ${currentScore}. `;

      if (diff > 0) {
        text += `This simulation improves your score by ${diff}.`;
      } else if (diff < 0) {
        text += `This simulation reduces your score by ${Math.abs(diff)}.`;
      } else {
        text += `This simulation keeps your score unchanged.`;
      }

      comparisonText.textContent = text;
    } else {
      comparisonText.textContent = "No previous saved score found for comparison.";
    }

  } catch (err) {
    console.error(err);
    alert("Error connecting to server");
  }
});