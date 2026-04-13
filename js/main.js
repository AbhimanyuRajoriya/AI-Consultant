let homeHistoryChart = null;
const x =
function getToken() {
  return localStorage.getItem("id_token");
}

function isLoggedInHome() {
  return !!getToken();
}

function setRiskStyle(text) {
  const el = document.getElementById("homeRisk");
  if (!el) return;

  el.textContent = text || "Not available";
  el.className = "risk-pill";

  if (!text) return;

  const t = text.toLowerCase();
  if (t.includes("low")) {
    el.classList.add("risk-low");
  } else if (t.includes("medium")) {
    el.classList.add("risk-medium");
  } else {
    el.classList.add("risk-high");
  }
}

function resetHomeState(message = "Login and make a prediction to see your latest score and graph here.") {
  const homeScore = document.getElementById("homeScore");
  const homeStudy = document.getElementById("homeStudy");
  const homeAttendance = document.getElementById("homeAttendance");
  const homeSleep = document.getElementById("homeSleep");
  const homeScreen = document.getElementById("homeScreen");
  const homeMessage = document.getElementById("homeMessage");

  if (homeScore) homeScore.textContent = "--";
  if (homeStudy) homeStudy.textContent = "--";
  if (homeAttendance) homeAttendance.textContent = "--";
  if (homeSleep) homeSleep.textContent = "--";
  if (homeScreen) homeScreen.textContent = "--";

  setRiskStyle("Not available");

  if (homeMessage) {
    homeMessage.textContent = message;
  }

  if (homeHistoryChart) {
    homeHistoryChart.destroy();
    homeHistoryChart = null;
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`
  };
}

function updateHomeCards(latest, historyCount = 0) {
  const homeScore = document.getElementById("homeScore");
  const homeStudy = document.getElementById("homeStudy");
  const homeAttendance = document.getElementById("homeAttendance");
  const homeSleep = document.getElementById("homeSleep");
  const homeScreen = document.getElementById("homeScreen");
  const homeMessage = document.getElementById("homeMessage");

  if (homeScore) {
    homeScore.textContent = latest.predicted_exam_score ?? "--";
  }

  setRiskStyle(latest.risk_level);

  if (homeStudy) {
    homeStudy.textContent = latest.study_hours_per_day ?? "--";
  }

  if (homeAttendance) {
    homeAttendance.textContent = latest.attendance_percentage ?? "--";
  }

  if (homeSleep) {
    homeSleep.textContent = latest.sleep_hours ?? "--";
  }

  const screenTime =
    Number(latest.social_media_hours || 0) + Number(latest.netflix_hours || 0);

  if (homeScreen) {
    homeScreen.textContent = screenTime;
  }

  if (homeMessage) {
    homeMessage.textContent =
      historyCount > 0
        ? `Showing your latest ${historyCount} saved prediction records.`
        : "Showing your latest saved prediction.";
  }
}

function renderHomeChart(history) {
  const canvas = document.getElementById("homeHistoryChart");

  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  const safeHistory = Array.isArray(history) ? history : [];
  const reversed = [...safeHistory].reverse();

  if (reversed.length === 0) {
    if (homeHistoryChart) {
      homeHistoryChart.destroy();
      homeHistoryChart = null;
    }
    return;
  }

  if (homeHistoryChart) {
    homeHistoryChart.destroy();
    homeHistoryChart = null;
  }

  const ctx = canvas.getContext("2d");

  homeHistoryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: reversed.map((item, i) => {
        const d = new Date(item.created_at);
        return isNaN(d.getTime())
          ? `P${i + 1}`
          : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }),
      datasets: [{
        label: "Predicted Score",
        data: reversed.map(item =>
          Number(item.predicted_exam_score ?? item.score ?? 0)
        ),
        borderColor: "#1a1a1a",
        backgroundColor: "rgba(255, 229, 76, 0.35)",
        borderWidth: 3,
        pointBackgroundColor: "#ffe54c",
        pointBorderColor: "#1a1a1a",
        pointRadius: 4,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          labels: {
            color: "#1a1a1a",
            font: { family: "Ubuntu", size: 13 }
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

function cacheHomeData(latest, history) {
  localStorage.setItem("home_latest_prediction", JSON.stringify(latest || {}));
  localStorage.setItem("home_prediction_history", JSON.stringify(history || []));
}

async function loadHomePreview() {
  if (!isLoggedInHome()) {
    resetHomeState();
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/me/dashboard`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (res.status === 401) {
      resetHomeState("Please login again.");
      return;
    }

    if (!res.ok || data.message) {
      resetHomeState(data.message || "No prediction data found yet.");
      return;
    }

    const latest = data.latest || {};
    const history = data.history || [];

    updateHomeCards(latest, history.length);
    renderHomeChart(history);
    cacheHomeData(latest, history);
  } catch (err) {
    console.error("Home preview error:", err);

    try {
      const latest = JSON.parse(localStorage.getItem("home_latest_prediction") || "null");
      const history = JSON.parse(localStorage.getItem("home_prediction_history") || "[]");

      if (latest) {
        updateHomeCards(latest, history.length);
        renderHomeChart(history);

        const homeMessage = document.getElementById("homeMessage");
        if (homeMessage) {
          homeMessage.textContent = "Showing cached preview right now.";
        }
      } else {
        resetHomeState("Unable to load preview right now.");
      }
    } catch {
      resetHomeState("Unable to load preview right now.");
    }
  }
}

document.addEventListener("DOMContentLoaded", loadHomePreview);
