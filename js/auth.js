const CONFIG = {
  COGNITO_DOMAIN: "https://us-east-1dwpegiyop.auth.us-east-1.amazoncognito.com",
  CLIENT_ID: "2bsg8fgsbuked557t3op6kr5i0",
  REDIRECT_URI: "https://abhimanyurajoriya.github.io/AI-Consultant/callback.html",
  LOGOUT_URI: "https://abhimanyurajoriya.github.io/AI-Consultant/index.html"
};

function isLoggedIn() {
  return !!localStorage.getItem("id_token");
}

function login() {
  const url =
    `${CONFIG.COGNITO_DOMAIN}/login` +
    `?client_id=${encodeURIComponent(CONFIG.CLIENT_ID)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent("openid email")}` +
    `&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`;

  window.location.href = url;
}

function logout() {
  localStorage.removeItem("id_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_exp");
  localStorage.removeItem("home_latest_prediction");
  localStorage.removeItem("home_prediction_history");

  const url =
    `${CONFIG.COGNITO_DOMAIN}/logout` +
    `?client_id=${encodeURIComponent(CONFIG.CLIENT_ID)}` +
    `&logout_uri=${encodeURIComponent(CONFIG.LOGOUT_URI)}`;

  window.location.href = url;
}

window.login = login;
window.logout = logout;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (loginBtn) loginBtn.onclick = login;
if (logoutBtn) logoutBtn.onclick = logout;

if (loginBtn && logoutBtn) {
  if (isLoggedIn()) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  }
}