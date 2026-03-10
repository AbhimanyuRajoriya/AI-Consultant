const refreshBtn = document.getElementById("refreshBtn");
const messageBox = document.getElementById("messageBox");
const dashboardContent = document.getElementById("dashboardContent");

let historyChart = null;
let importanceChart = null;

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
    "Authorization": `Bearer ${getToken()}`
  };
}

function showMessage(text) {
  messageBox.style.display = "block";
  messageBox.textContent = text;
}

function hideMessage() {
  messageBox.style.display = "none";
  messageBox.textContent = "";
}

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString();
}

function setRiskBadge(riskText) {
  const el = document.getElementById("latestRisk");
  el.textContent = riskText || "--";
  el.className = "score-badge";

  if (!riskText) return;

  const risk = riskText.toLowerCase();
  if (risk.includes("low")) {
    el.classList.add("risk-low");
  } else if (risk.includes("medium")) {
    el.classList.add("risk-medium");
  } else {
    el.classList.add("risk-high");
  }
}

function updateCards(latest, history, modelReport) {
  document.getElementById("latestScore").textContent =
    latest.predicted_exam_score ?? "--";

  setRiskBadge(latest.risk_level);
  document.getElementById("latestMeta").textContent =
    `Updated: ${formatDate(latest.created_at)}`;

  document.getElementById("studyHours").textContent = latest.study_hours_per_day ?? "--";
  document.getElementById("attendance").textContent = latest.attendance_percentage ?? "--";
  document.getElementById("sleepHours").textContent = latest.sleep_hours ?? "--";
  document.getElementById("mentalHealth").textContent = latest.mental_health_rating ?? "--";
  document.getElementById("dietQuality").textContent = latest.diet_quality ?? "--";

  const screenTime =
    Number(latest.social_media_hours || 0) + Number(latest.netflix_hours || 0);
  document.getElementById("screenTime").textContent = screenTime;

  document.getElementById("modelName").textContent =
    modelReport?.model || "--";

  document.getElementById("maeValue").textContent =
    modelReport?.metrics?.mae ?? "--";

  document.getElementById("rmseValue").textContent =
    modelReport?.metrics?.rmse ?? "--";

  document.getElementById("r2Value").textContent =
    modelReport?.metrics?.r2 ?? "--";

  document.getElementById("historyCount").textContent = history.length;
}

function renderHistoryChart(history) {
  const ctx = document.getElementById("historyChart").getContext("2d");

  if (historyChart) historyChart.destroy();

  const reversed = [...history].reverse();

  historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: reversed.map((_, i) => `P${i + 1}`),
      datasets: [{
        label: "Predicted Score",
        data: reversed.map(item => Number(item.score).toFixed(2)),
        borderColor: "#1a1a1a",
        backgroundColor: "rgba(255, 229, 76, 0.35)",
        borderWidth: 3,
        pointBackgroundColor: "#ffe54c",
        pointBorderColor: "#1a1a1a",
        pointRadius: 4,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#1a1a1a",
            font: { family: "Ubuntu" }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#2a2a2a" },
          grid: { color: "rgba(0,0,0,0.08)" }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: "#2a2a2a" },
          grid: { color: "rgba(0,0,0,0.08)" }
        }
      }
    }
  });
}

function renderImportanceChart(featureImportance) {
  const ctx = document.getElementById("importanceChart").getContext("2d");

  if (importanceChart) importanceChart.destroy();

  importanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: featureImportance.map(item => item.feature),
      datasets: [{
        label: "Importance",
        data: featureImportance.map(item => Number(item.importance).toFixed(4)),
        backgroundColor: "#ffe54c",
        borderColor: "#1a1a1a",
        borderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#1a1a1a",
            font: { family: "Ubuntu" }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#2a2a2a",
            maxRotation: 35,
            minRotation: 20
          },
          grid: { color: "rgba(0,0,0,0.08)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#2a2a2a" },
          grid: { color: "rgba(0,0,0,0.08)" }
        }
      }
    }
  });
}

async function loadDashboard() {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${window.API_BASE}/me/dashboard`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (res.status === 401) {
      clearAuthAndRedirect("Your session expired. Please login again.");
      return;
    }

    if (!res.ok) {
      showMessage(data.detail || "Failed to load dashboard");
      return;
    }

    if (data.message) {
      showMessage(data.message);
      dashboardContent.style.display = "none";
      return;
    }

    hideMessage();
    dashboardContent.style.display = "flex";

    const latest = data.latest || {};
    const history = data.history || [];
    const modelReport = data.model_report || {};
    const featureImportance = modelReport.feature_importance || [];

    updateCards(latest, history, modelReport);
    renderHistoryChart(history);
    renderImportanceChart(featureImportance);

  } catch (err) {
    console.error(err);
    showMessage("Error connecting to server");
  }
}

refreshBtn.addEventListener("click", loadDashboard);
loadDashboard();