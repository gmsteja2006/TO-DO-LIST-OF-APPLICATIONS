// main.js - Final Master Frontend Code
const APIBASE = "/api";

let token = localStorage.getItem("todo-token") || null;
let currentUsername = localStorage.getItem("todo-username") || null;
let isDark = localStorage.getItem("todo-theme") === "dark" || true;
let deadlineCheckIntervalId = null;
let currentFilter = "all";
let cachedTasks = [];
let pendingUserId = null;

// ---------- Theme handling ----------
function applyTheme() {
  const body = document.body;
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;
  const icon = toggle.querySelector(".icon");
  const label = toggle.querySelector(".label");

  body.setAttribute("data-theme", isDark ? "dark" : "light");

  if (isDark) {
    if (icon) icon.textContent = "🌙";
    if (label) label.textContent = "Dark";
  } else {
    if (icon) icon.textContent = "☀️";
    if (label) label.textContent = "Light";
  }
}

function toggleTheme() {
  isDark = !isDark;
  localStorage.setItem("todo-theme", isDark ? "dark" : "light");
  applyTheme();
}

// ---------- Toasts ----------
function showToast(message, type = "info", duration = 2600) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(4px)";
    setTimeout(() => toast.remove(), 180);
  }, duration);
}

// ---------- API helper ----------
async function apiFetch(path, options = {}) {
  const finalOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };
  if (token) finalOptions.headers["Authorization"] = "Bearer " + token;

  const res = await fetch(APIBASE + path, finalOptions);
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ---------- Auth helpers ----------
function setAuthMessage(text, type) {
  const el = document.getElementById("authMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "";
  if (!text) return;
  el.classList.add(type === "error" ? "error" : "success");
}

function setOtpMessage(text, type) {
  const el = document.getElementById("otpMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "";
  if (!text) return;
  el.classList.add(type === "error" ? "error" : "success");
}

function toggleAuthLoading(isLoading) {
  const btns = ["registerBtn", "loginBtn", "verifyOtpBtn", "resendOtpBtn"];
  btns.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = isLoading;
  });
}

function prefillDemoUser() {
  document.getElementById("regUsername").value = "demoUser";
  document.getElementById("regEmail").value = "demo@example.com";
  document.getElementById("regPassword").value = "Demo@123";
}

// ---------- Auth actions ----------
async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  setAuthMessage("", "");
  setOtpMessage("", "");
  toggleAuthLoading(true);

  if (!username || !email || !password) {
    setAuthMessage("Username, email and password are required.", "error");
    toggleAuthLoading(false);
    return;
  }

  try {
    const data = await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    pendingUserId = data.userId;
    document.getElementById("otpSection").style.display = "block";
    document.getElementById("resendOtpBtn").style.display = "inline-flex";
    setAuthMessage("Account created. Check email for OTP.", "success");
    showToast("OTP sent to your email.", "success");
  } catch (err) {
    setAuthMessage(err.message, "error");
  } finally {
    toggleAuthLoading(false);
  }
}

async function handleVerifyOtp() {
  const otp = document.getElementById("otpInput").value.trim();
  setOtpMessage("", "");
  if (!otp || !pendingUserId) {
    setOtpMessage("Missing OTP or user.", "error");
    return;
  }
  toggleAuthLoading(true);
  try {
    await apiFetch("/verify-email", { // Fixed endpoint
      method: "POST",
      body: JSON.stringify({ userId: pendingUserId, otp }),
    });
    setOtpMessage("Email verified! You can sign in now.", "success");
    showToast("Verified! Please Login.", "success");
  } catch (err) {
    setOtpMessage(err.message, "error");
  } finally {
    toggleAuthLoading(false);
  }
}

async function resendOtp() {
  if (!pendingUserId) return;
  toggleAuthLoading(true);
  try {
    await apiFetch("/resend-otp", {
      method: "POST",
      body: JSON.stringify({ userId: pendingUserId }),
    });
    setOtpMessage("OTP resent to email.", "success");
    showToast("OTP resent.", "info");
  } catch (err) {
    setOtpMessage(err.message, "error");
  } finally {
    toggleAuthLoading(false);
  }
}

async function handleLogin(event) {
  if (event) event.preventDefault();
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  setAuthMessage("", "");
  toggleAuthLoading(true);

  try {
    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    token = data.token;
    currentUsername = data.user.username;
    localStorage.setItem("todo-token", token);
    localStorage.setItem("todo-username", currentUsername);
    showTodo();
    showToast("Logged in.", "success");
  } catch (err) {
    setAuthMessage(err.message, "error");
  } finally {
    toggleAuthLoading(false);
  }
}

// ---------- Session view handling ----------
function logout() {
  token = null;
  currentUsername = null;
  localStorage.removeItem("todo-token");
  localStorage.removeItem("todo-username");
  location.reload();
}

function showAuth() {
  document.getElementById("authCard").style.display = "block";
  document.getElementById("todoCard").style.display = "none";
}

function showTodo() {
  document.getElementById("authCard").style.display = "none";
  document.getElementById("todoCard").style.display = "block";
  document.getElementById("welcomeUser").textContent = `Welcome, ${currentUsername}`;
  loadTasks();
  if (!deadlineCheckIntervalId) {
    deadlineCheckIntervalId = setInterval(loadTasks, 60000);
  }
}

// ---------- Task actions ----------
async function loadTasks() {
  if (!token) return;
  try {
    const data = await apiFetch("/tasks");
    cachedTasks = data;
    renderTasks();
    checkDeadlines(data);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll(".chip-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === f);
  });
  renderTasks();
}

async function addTask() {
  const title = document.getElementById("newTaskTitle").value.trim();
  const deadline = document.getElementById("newTaskDeadline").value;
  if (!title) return showToast("Enter title", "error");
  try {
    const t = await apiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, deadline }),
    });
    document.getElementById("newTaskTitle").value = "";
    cachedTasks.unshift(t);
    renderTasks();
    showToast("Added", "success");
  } catch (err) { showToast(err.message, "error"); }
}

async function toggleCompleted(task) {
  try {
    const updated = await apiFetch(`/tasks/${task._id}`, { // Fixed .id to ._id
      method: "PUT",
      body: JSON.stringify({ completed: !task.completed }),
    });
    cachedTasks = cachedTasks.map(t => t._id === task._id ? updated : t);
    renderTasks();
  } catch (err) { showToast(err.message, "error"); }
}

async function deleteTask(task) {
  if (!confirm("Delete?")) return;
  try {
    await apiFetch(`/tasks/${task._id}`, { method: "DELETE" }); // Fixed .id to ._id
    cachedTasks = cachedTasks.filter(t => t._id !== task._id);
    renderTasks();
  } catch (err) { showToast(err.message, "error"); }
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  const filtered = cachedTasks.filter(t => {
    if (currentFilter === "pending") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  document.getElementById("totalCount").textContent = cachedTasks.length;
  document.getElementById("completedCount").textContent = cachedTasks.filter(t => t.completed).length;
  updateMiniMetrics(cachedTasks);

  filtered.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
      <div class="task-main">
        <span class="task-title ${task.completed ? 'completed' : ''}">${task.title}</span>
        <div class="task-meta-row">
          <span class="deadline-label">Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'None'}</span>
          <span class="task-status-pill ${task.completed ? 'done' : 'pending'}">${task.completed ? 'Done' : 'Pending'}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-small btn-outline" onclick='toggleCompleted(${JSON.stringify(task)})'>${task.completed ? 'Undo' : 'Done'}</button>
        <button class="btn btn-small btn-danger" onclick='deleteTask(${JSON.stringify(task)})'>Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function updateMiniMetrics(tasks) {
  const today = new Date().setHours(0,0,0,0);
  document.getElementById("metricToday").textContent = tasks.filter(t => t.deadline && new Date(t.deadline).setHours(0,0,0,0) === today && !t.completed).length;
  document.getElementById("metricCompleted").textContent = tasks.filter(t => t.completed).length;
  document.getElementById("metricOverdue").textContent = tasks.filter(t => t.deadline && new Date(t.deadline).setHours(0,0,0,0) < today && !t.completed).length;
}

function checkDeadlines(tasks) {
  const today = new Date().setHours(0,0,0,0);
  tasks.forEach(t => {
    if (!t.completed && t.deadline && new Date(t.deadline).setHours(0,0,0,0) === today) {
      showToast(`Task "${t.title}" is due today!`, "warning");
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  if (token) showTodo(); else showAuth();
});
