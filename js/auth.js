let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;

  const res = await fetch(`${window.API_BASE}/auth/config`);
  CONFIG = await res.json();
  return CONFIG;
}

function isLoggedIn() {
  return !!localStorage.getItem("id_token");
}

async function login() {
  const cfg = await loadConfig();

  const url =
    `${cfg.COGNITO_DOMAIN}/login` +
    `?client_id=${encodeURIComponent(cfg.CLIENT_ID)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent("openid email")}` +
    `&redirect_uri=${encodeURIComponent(cfg.REDIRECT_URI)}`;

  window.location.href = url;
}

async function logout() {
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
}

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (loginBtn) loginBtn.addEventListener("click", login);
if (logoutBtn) logoutBtn.addEventListener("click", logout);

window.addEventListener("DOMContentLoaded", () => {
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