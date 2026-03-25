const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const startBtn = document.getElementById("startBtn");
const startSection = document.getElementById("startSection");
const chatSection = document.getElementById("chatSection");
const typingIndicator = document.getElementById("typingIndicator");

let sessionId = null;

function getToken() {
  return localStorage.getItem("id_token");
}

function authHeaders() {
  const token = getToken();
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    alert("Please login first.");
    return false;
  }
  return true;
}

startBtn.addEventListener("click", async () => {
  if (!requireAuth()) return;

  try {
    const headers = authHeaders();
    const res = await fetch(`${window.API_BASE}/me/start_session`, {
      method: "POST",
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Unable to start session. Predict once first.");
      return;
    }

    sessionId = data.session_id;
    startSection.style.display = "none";
    chatSection.style.display = "flex";
    appendMessage("ai", "Consultation started. Ask your questions.");
  } catch (err) {
    alert("Server error");
    console.error(err);
  }
});

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || !sessionId) return;
  if (!requireAuth()) return;

  appendMessage("user", message);
  userInput.value = "";
  typingIndicator.classList.add("active");

  try {
    const headers = authHeaders();

    const res = await fetch(`${window.API_BASE}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        session_id: sessionId,
        question: message
      })
    });

    const raw = await res.text();
    console.log("Raw /chat response:", raw);

    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      throw new Error("Invalid JSON from /chat: " + raw);
    }

    typingIndicator.classList.remove("active");

    if (!res.ok) {
      appendMessage("ai", data.detail || "Error contacting consultant");
      return;
    }

    appendMessage("ai", data.answer || "No answer returned");
  } catch (err) {
    typingIndicator.classList.remove("active");
    console.error("Chat error:", err);
    appendMessage("ai", "Error contacting consultant");
  }
}