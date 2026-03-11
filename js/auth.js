let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;

  try {
    const res = await fetch(`${window.API_BASE}/auth/config`);

    if (!res.ok) {
      throw new Error(`Config fetch failed: ${res.status}`);
    }

    CONFIG = await res.json();
    console.log("Loaded config:", CONFIG);
    return CONFIG;
  } catch (err) {
    console.error("Failed to load auth config:", err);
    alert("Login config could not be loaded. Check backend URL and HTTPS setup.");
    throw err;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem("id_token");
}

async function login() {
  try {
    const cfg = await loadConfig();

    const url =
      `${cfg.COGNITO_DOMAIN}/login` +
      `?client_id=${encodeURIComponent(cfg.CLIENT_ID)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent("openid email")}` +
      `&redirect_uri=${encodeURIComponent(cfg.REDIRECT_URI)}`;

    console.log("Redirecting to:", url);
    window.location.href = url;
  } catch (err) {
    console.error("Login failed:", err);
  }
}

async function logout() {
  try {
    const cfg = await loadConfig();

    localStorage.removeItem("id_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_exp");
    localStorage.removeItem("home_latest_prediction");
    localStorage.removeItem("home_prediction_history");

    const url =
      `${cfg.COGNITO_DOMAIN}/logout` +
      `?client_id=${encodeURIComponent(cfg.CLIENT_ID)}` +
      `&logout_uri=${encodeURIComponent(cfg.LOGOUT_URI)}`;

    window.location.href = url;
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", login);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  if (loginBtn && logoutBtn) {
    if (isLoggedIn()) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    } else {
      logoutBtn.style.display = "none";
      loginBtn.style.display = "inline-block";
    }
  }
});