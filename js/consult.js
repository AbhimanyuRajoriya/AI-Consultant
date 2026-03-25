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
    "Authorization": "Bearer " + token
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

function appendMessage(sender, message) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + sender + "-message";

  const senderSpan = document.createElement("div");
  senderSpan.className = "message-sender";
  senderSpan.textContent = sender === "ai" ? "AI Consultant" : "You";

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = message;

  const timestamp = document.createElement("div");
  timestamp.className = "timestamp";
  timestamp.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  msgDiv.appendChild(senderSpan);
  msgDiv.appendChild(contentDiv);
  msgDiv.appendChild(timestamp);

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function startSession() {
  if (!requireAuth()) return;

  try {
    const headers = authHeaders();

    const res = await fetch(window.API_BASE + "/me/start_session", {
      method: "POST",
      headers: headers
    });

    const raw = await res.text();
    console.log("Raw /me/start_session response:", raw);

    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      alert("Invalid response from start session");
      return;
    }

    if (!res.ok) {
      alert(data.detail || "Unable to start session. Predict once first.");
      return;
    }

    sessionId = data.session_id;
    startSection.style.display = "none";
    chatSection.style.display = "flex";
    appendMessage("ai", "Consultation started. Ask your questions.");
  } catch (err) {
    console.error("Start session error:", err);
    alert("Server error");
  }
}

async function sendMessage() {
  const message = userInput.value.trim();

  if (message === "" || !sessionId) return;
  if (!requireAuth()) return;

  appendMessage("user", message);
  userInput.value = "";

  if (typingIndicator) {
    typingIndicator.classList.add("active");
  }

  try {
    const headers = authHeaders();

    const res = await fetch(window.API_BASE + "/chat", {
      method: "POST",
      headers: headers,
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

    if (typingIndicator) {
      typingIndicator.classList.remove("active");
    }

    if (!res.ok) {
      appendMessage("ai", data.detail || "Error contacting consultant");
      return;
    }

    appendMessage("ai", data.answer || "No answer returned");
  } catch (err) {
    if (typingIndicator) {
      typingIndicator.classList.remove("active");
    }

    console.error("Chat error:", err);
    appendMessage("ai", "Error contacting consultant");
  }
}

if (startBtn) {
  startBtn.addEventListener("click", startSession);
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

if (userInput) {
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

console.log("consult.js loaded");
console.log("appendMessage type:", typeof appendMessage);
console.log("startBtn found:", !!startBtn);
console.log("sendBtn found:", !!sendBtn);
console.log("userInput found:", !!userInput);