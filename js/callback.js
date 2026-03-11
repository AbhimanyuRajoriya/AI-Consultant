function parseHashParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const params = new URLSearchParams(hash);
  return {
    id_token: params.get("id_token"),
    access_token: params.get("access_token"),
    expires_in: params.get("expires_in"),
  };
}

const data = parseHashParams();

localStorage.removeItem("id_token");
localStorage.removeItem("access_token");
localStorage.removeItem("token_exp");

if (!data.id_token) {
  document.body.innerHTML = "<h3>Login failed: no id_token received.</h3>";
} else {
  localStorage.setItem("id_token", data.id_token);

  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
  }

  const exp = Date.now() + (parseInt(data.expires_in || "3600", 10) * 1000);
  localStorage.setItem("token_exp", String(exp));

  window.location.href = `${window.location.origin}/AI-Consultant/index.html`;
}