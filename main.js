const APIBASE = "https://to-do-list-of-applications-production.up.railway.app/api";


let token = null;
let currentUsername = null;
let cachedTasks = [];
let pendingUserId = null;

// Toast helper
function showToast(message, type = "info") {
  const c = document.getElementById("toastContainer");
  const div = document.createElement("div");
  div.textContent = message;
  div.style.margin = "4px";
  div.style.padding = "6px 10px";
  div.style.borderRadius = "6px";
  div.style.fontSize = "12px";
  div.style.color = "#fff";
  div.style.background =
    type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#2563eb";
  c.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// API helper
async function apiFetch(path, options = {}) {
  const finalOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };
  if (token) finalOptions.headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_BASE + path, finalOptions);
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function setAuthMessage(msg) {
  document.getElementById("authMessage").textContent = msg || "";
}
function setOtpMessage(msg) {
  document.getElementById("otpMessage").textContent = msg || "";
}

// Register
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  setAuthMessage("");
  setOtpMessage("");

  if (!username || !email || !password) {
    setAuthMessage("Username, email and password are required.");
    return;
  }

  try {
    const data = await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    pendingUserId = data.userId;
    setAuthMessage("Account created. Check email for OTP.");
    setOtpMessage("OTP sent. Enter it below.");
    showToast("OTP sent to your email.", "success");
  } catch (err) {
    setAuthMessage(err.message);
  }
}

// Verify OTP
async function handleVerifyOtp() {
  const otp = document.getElementById("otpInput").value.trim();
  setOtpMessage("");
  if (!otp || !pendingUserId) {
    setOtpMessage("Missing OTP or user.");
    return;
  }
  try {
    const data = await apiFetch("/verify-email", {
      method: "POST",
      body: JSON.stringify({ userId: pendingUserId, otp }),
    });
    setOtpMessage(data.message || "Email verified.");
    showToast("Email verified. You can login now.", "success");
  } catch (err) {
    setOtpMessage(err.message);
  }
}

// Resend OTP
async function resendOtp() {
  setOtpMessage("");
  if (!pendingUserId) {
    setOtpMessage("No user to resend OTP for.");
    return;
  }
  try {
    const data = await apiFetch("/resend-otp", {
      method: "POST",
      body: JSON.stringify({ userId: pendingUserId }),
    });
    setOtpMessage(data.message || "OTP resent.");
    showToast("OTP resent.", "info");
  } catch (err) {
    setOtpMessage(err.message);
  }
}

// Login
async function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  setAuthMessage("");
  if (!identifier || !password) {
    setAuthMessage("Identifier and password are required.");
    return;
  }
  try {
    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    token = data.token;
    currentUsername = data.user.username;
    document.getElementById("welcomeUser").textContent =
      "Welcome, " + currentUsername;
    showToast("Logged in.", "success");
    loadTasks();
  } catch (err) {
    setAuthMessage(err.message);
  }
}

// Tasks
async function addTask() {
  const title = document.getElementById("newTaskTitle").value.trim();
  const deadline = document.getElementById("newTaskDeadline").value;
  if (!token) {
    showToast("Login first.", "error");
    return;
  }
  if (!title) {
    showToast("Enter task title.", "error");
    return;
  }
  try {
    const t = await apiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, deadline }),
    });
    document.getElementById("newTaskTitle").value = "";
    document.getElementById("newTaskDeadline").value = "";
    cachedTasks.push(t);
    renderTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadTasks() {
  if (!token) return;
  try {
    const data = await apiFetch("/tasks");
    cachedTasks = data;
    renderTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleCompleted(task) {
  if (!token) return;
  try {
    const updated = await apiFetch("/tasks/" + task._id, {
      method: "PUT",
      body: JSON.stringify({ completed: !task.completed }),
    });
    cachedTasks = cachedTasks.map((t) => (t._id === task._id ? updated : t));
    renderTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteTask(task) {
  if (!token) return;
  if (!confirm("Delete this task?")) return;
  try {
    await apiFetch("/tasks/" + task._id, { method: "DELETE" });
    cachedTasks = cachedTasks.filter((t) => t._id !== task._id);
    renderTasks();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderTasks() {
  const ul = document.getElementById("taskList");
  ul.innerHTML = "";
  cachedTasks.forEach((task) => {
    const li = document.createElement("li");
    li.textContent = task.title + (task.completed ? " (done)" : "");
    const btn = document.createElement("button");
    btn.textContent = task.completed ? "Undo" : "Done";
    btn.onclick = () => toggleCompleted(task);
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.onclick = () => deleteTask(task);
    li.append(" ", btn, " ", del);
    ul.appendChild(li);
  });
}

// Hook up events
window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("registerForm")
    .addEventListener("submit", handleRegister);
  document
    .getElementById("loginForm")
    .addEventListener("submit", handleLogin);
  document
    .getElementById("verifyOtpBtn")
    .addEventListener("click", handleVerifyOtp);
  document
    .getElementById("resendOtpBtn")
    .addEventListener("click", resendOtp);
  document
    .getElementById("addTaskBtn")
    .addEventListener("click", addTask);
});
