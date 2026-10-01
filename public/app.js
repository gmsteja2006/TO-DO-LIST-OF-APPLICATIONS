/**
 * AURA TASKFLOW - Client Application
 * Premium Task & Deadline Management Engine
 */

// Application Configuration & State
const API_BASE = '/api';

const state = {
  token: localStorage.getItem('aura_token') || null,
  user: JSON.parse(localStorage.getItem('aura_user') || 'null'),
  tasks: [],
  filter: 'all', // 'all' | 'pending' | 'today' | 'overdue' | 'completed'
  searchQuery: '',
  sortBy: 'created_desc', // 'created_desc' | 'deadline_asc' | 'title_asc'
  pendingUserId: null,
  theme: localStorage.getItem('aura_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  deadlineInterval: null,
  editingTaskId: null,
};

// ==========================================================================
// DOM ELEMENT SELECTORS
// ==========================================================================
const DOM = {
  // Theme & Profile
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  authSection: document.getElementById('authSection'),
  dashboardSection: document.getElementById('dashboardSection'),
  navProfile: document.getElementById('navProfile'),
  userAvatar: document.getElementById('userAvatar'),
  userNameDisplay: document.getElementById('userNameDisplay'),
  dashGreetingName: document.getElementById('dashGreetingName'),
  dashCurrentDate: document.getElementById('dashCurrentDate'),
  logoutBtn: document.getElementById('logoutBtn'),
  
  // Auth Tabs & Forms
  tabLogin: document.getElementById('tabLogin'),
  tabRegister: document.getElementById('tabRegister'),
  tabOtp: document.getElementById('tabOtp'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  otpForm: document.getElementById('otpForm'),
  loginFeedback: document.getElementById('loginFeedback'),
  registerFeedback: document.getElementById('registerFeedback'),
  otpFeedback: document.getElementById('otpFeedback'),
  demoUserBtn: document.getElementById('demoUserBtn'),
  resendOtpBtn: document.getElementById('resendOtpBtn'),
  
  // Dashboard & Task Input
  taskTitleInput: document.getElementById('taskTitleInput'),
  taskDeadlineInput: document.getElementById('taskDeadlineInput'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  searchInput: document.getElementById('searchInput'),
  filterChips: document.querySelectorAll('.filter-chip-btn'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  
  // Metrics & Stats
  statTotal: document.getElementById('statTotal'),
  statPending: document.getElementById('statPending'),
  statToday: document.getElementById('statToday'),
  statCompleted: document.getElementById('statCompleted'),
  progressPercent: document.getElementById('progressPercent'),
  progressFillBar: document.getElementById('progressFillBar'),
  radarList: document.getElementById('radarList'),
  radarEmptyState: document.getElementById('radarEmptyState'),
  
  // Automated Actions
  triggerJobBtn: document.getElementById('triggerJobBtn'),
  
  // Edit Modal
  editModal: document.getElementById('editModal'),
  editTaskTitle: document.getElementById('editTaskTitle'),
  editTaskDeadline: document.getElementById('editTaskDeadline'),
  editTaskCompleted: document.getElementById('editTaskCompleted'),
  saveEditBtn: document.getElementById('saveEditBtn'),
  closeEditBtn: document.getElementById('closeEditBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  
  // Toasts
  toastContainer: document.getElementById('toastContainer'),
};

// ==========================================================================
// TOAST NOTIFICATION SYSTEM
// ==========================================================================
function showToast(message, type = 'info', duration = 3500) {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const iconSvg = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || '';

  toast.innerHTML = `
    ${iconSvg}
    <div class="toast-content">${message}</div>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ==========================================================================
// THEME MANAGEMENT
// ==========================================================================
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('aura_theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  if (!DOM.themeIcon) return;
  if (state.theme === 'dark') {
    DOM.themeIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  } else {
    DOM.themeIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
}

// ==========================================================================
// API CLIENT
// ==========================================================================
async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(API_BASE + path, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && state.token) {
        logout();
        throw new Error('Your session has expired. Please sign in again.');
      }
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// ==========================================================================
// AUTHENTICATION CONTROLLERS
// ==========================================================================
function switchAuthTab(tab) {
  [DOM.tabLogin, DOM.tabRegister, DOM.tabOtp].forEach(btn => btn && btn.classList.remove('active'));
  [DOM.loginForm, DOM.registerForm, DOM.otpForm].forEach(form => form && form.classList.remove('active'));

  if (tab === 'login') {
    DOM.tabLogin.classList.add('active');
    DOM.loginForm.classList.add('active');
  } else if (tab === 'register') {
    DOM.tabRegister.classList.add('active');
    DOM.registerForm.classList.add('active');
  } else if (tab === 'otp') {
    DOM.tabOtp.classList.add('active');
    DOM.otpForm.classList.add('active');
  }
}

function setFeedback(element, message, type = 'error') {
  if (!element) return;
  if (!message) {
    element.textContent = '';
    element.className = 'form-feedback-msg';
    return;
  }
  element.textContent = message;
  element.className = `form-feedback-msg ${type}`;
}

async function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  setFeedback(DOM.loginFeedback, '');

  if (!identifier || !password) {
    setFeedback(DOM.loginFeedback, 'Please enter both username/email and password.');
    return;
  }

  const submitBtn = DOM.loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Signing in...</span>`;

  try {
    const res = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('aura_token', res.token);
    localStorage.setItem('aura_user', JSON.stringify(res.user));

    showToast(`Welcome back, ${res.user.username}!`, 'success');
    renderSessionState();
  } catch (err) {
    setFeedback(DOM.loginFeedback, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Sign In to Workspace</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    `;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  setFeedback(DOM.registerFeedback, '');

  if (!username || !email || !password) {
    setFeedback(DOM.registerFeedback, 'All fields are required.');
    return;
  }

  const submitBtn = DOM.registerForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Creating account...</span>`;

  try {
    const res = await api('/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    state.pendingUserId = res.userId;
    document.getElementById('otpTargetEmail').textContent = email;
    if (res.devOtp) {
      document.getElementById('otpCodeInput').value = res.devOtp;
    }
    switchAuthTab('otp');
    setFeedback(DOM.otpFeedback, 'Verification code ready. Enter below to activate your account.', 'success');
    showToast('Verification code ready.', 'info');
  } catch (err) {
    setFeedback(DOM.registerFeedback, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Create Free Account</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    `;
  }
}

async function handleVerifyOtp(e) {
  e.preventDefault();
  const otp = document.getElementById('otpCodeInput').value.trim();

  setFeedback(DOM.otpFeedback, '');

  if (!otp) {
    setFeedback(DOM.otpFeedback, 'Please enter the 6-digit OTP code.');
    return;
  }

  if (!state.pendingUserId) {
    setFeedback(DOM.otpFeedback, 'Session expired. Please register again.');
    switchAuthTab('register');
    return;
  }

  const submitBtn = DOM.otpForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Verifying...</span>`;

  try {
    await api('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ userId: state.pendingUserId, otp })
    });

    showToast('Email verified successfully! You can now sign in.', 'success');
    switchAuthTab('login');
    setFeedback(DOM.loginFeedback, 'Account verified! Please sign in with your credentials.', 'success');
  } catch (err) {
    setFeedback(DOM.otpFeedback, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Verify & Continue</span>`;
  }
}

async function handleResendOtp() {
  if (!state.pendingUserId) return;
  DOM.resendOtpBtn.disabled = true;
  DOM.resendOtpBtn.textContent = 'Sending...';

  try {
    await api('/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ userId: state.pendingUserId })
    });
    showToast('A fresh verification code has been dispatched.', 'info');
    setFeedback(DOM.otpFeedback, 'New OTP code sent to your inbox.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    setFeedback(DOM.otpFeedback, err.message, 'error');
  } finally {
    setTimeout(() => {
      DOM.resendOtpBtn.disabled = false;
      DOM.resendOtpBtn.textContent = 'Resend Code';
    }, 15000);
  }
}

function prefillDemoAccount() {
  document.getElementById('loginIdentifier').value = 'demoUser';
  document.getElementById('loginPassword').value = 'Demo@123';
  showToast('Demo credentials loaded into form.', 'info');
}

function logout() {
  state.token = null;
  state.user = null;
  state.tasks = [];
  localStorage.removeItem('aura_token');
  localStorage.removeItem('aura_user');

  if (state.deadlineInterval) {
    clearInterval(state.deadlineInterval);
    state.deadlineInterval = null;
  }

  showToast('You have signed out.', 'info');
  renderSessionState();
}

function renderSessionState() {
  if (state.token && state.user) {
    DOM.authSection.style.display = 'none';
    DOM.dashboardSection.style.display = 'flex';
    DOM.navProfile.style.display = 'flex';

    DOM.userAvatar.textContent = (state.user.username || 'U')[0].toUpperCase();
    DOM.userNameDisplay.textContent = state.user.username;
    DOM.dashGreetingName.textContent = state.user.username;

    updateHeaderTime();
    fetchTasks();

    if (!state.deadlineInterval) {
      state.deadlineInterval = setInterval(checkDeadlineAlerts, 60000);
    }
  } else {
    DOM.authSection.style.display = 'grid';
    DOM.dashboardSection.style.display = 'none';
    DOM.navProfile.style.display = 'none';
    switchAuthTab('login');
  }
}

function updateHeaderTime() {
  const now = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  DOM.dashCurrentDate.textContent = now.toLocaleDateString(undefined, options);
}

// ==========================================================================
// TASK MANAGEMENT (CRUD & FILTERING)
// ==========================================================================
async function fetchTasks() {
  try {
    const tasks = await api('/tasks');
    state.tasks = Array.isArray(tasks) ? tasks : [];
    renderTasks();
    updateMetrics();
    renderRadar();
    checkDeadlineAlerts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAddTask() {
  const title = DOM.taskTitleInput.value.trim();
  const deadline = DOM.taskDeadlineInput.value || null;

  if (!title) {
    showToast('Please provide a task description.', 'warning');
    DOM.taskTitleInput.focus();
    return;
  }

  DOM.addTaskBtn.disabled = true;

  try {
    const newTask = await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, deadline })
    });

    state.tasks.unshift(newTask);
    DOM.taskTitleInput.value = '';
    DOM.taskDeadlineInput.value = '';
    renderTasks();
    updateMetrics();
    renderRadar();
    showToast('Task added to your board.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    DOM.addTaskBtn.disabled = false;
  }
}

async function toggleTaskCompleted(taskId) {
  const task = state.tasks.find(t => t._id === taskId);
  if (!task) return;

  const newCompletedState = !task.completed;

  // Optimistic UI update
  task.completed = newCompletedState;
  renderTasks();
  updateMetrics();
  renderRadar();

  try {
    const updated = await api(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: newCompletedState })
    });
    // Replace with authoritative server response
    const index = state.tasks.findIndex(t => t._id === taskId);
    if (index !== -1) state.tasks[index] = updated;
    
    if (newCompletedState) {
      showToast('Task completed! Keep the momentum going.', 'success');
    }
  } catch (err) {
    // Revert optimistic update
    task.completed = !newCompletedState;
    renderTasks();
    updateMetrics();
    renderRadar();
    showToast(err.message, 'error');
  }
}

function openEditModal(taskId) {
  const task = state.tasks.find(t => t._id === taskId);
  if (!task) return;

  state.editingTaskId = taskId;
  DOM.editTaskTitle.value = task.title;
  DOM.editTaskDeadline.value = task.deadline ? task.deadline.slice(0, 10) : '';
  DOM.editTaskCompleted.checked = !!task.completed;

  DOM.editModal.classList.add('open');
  DOM.editTaskTitle.focus();
}

function closeEditModal() {
  DOM.editModal.classList.remove('open');
  state.editingTaskId = null;
}

async function handleSaveEdit() {
  if (!state.editingTaskId) return;

  const title = DOM.editTaskTitle.value.trim();
  const deadline = DOM.editTaskDeadline.value || null;
  const completed = DOM.editTaskCompleted.checked;

  if (!title) {
    showToast('Task title cannot be empty.', 'warning');
    return;
  }

  DOM.saveEditBtn.disabled = true;

  try {
    const updated = await api(`/tasks/${state.editingTaskId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, deadline, completed })
    });

    const index = state.tasks.findIndex(t => t._id === state.editingTaskId);
    if (index !== -1) state.tasks[index] = updated;

    closeEditModal();
    renderTasks();
    updateMetrics();
    renderRadar();
    showToast('Task details updated.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    DOM.saveEditBtn.disabled = false;
  }
}

async function handleDeleteTask(taskId) {
  const confirmed = confirm('Are you sure you want to delete this task?');
  if (!confirmed) return;

  try {
    await api(`/tasks/${taskId}`, { method: 'DELETE' });
    state.tasks = state.tasks.filter(t => t._id !== taskId);
    renderTasks();
    updateMetrics();
    renderRadar();
    showToast('Task removed.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Quick Date Pill Helpers
function setQuickDeadline(type) {
  const date = new Date();
  if (type === 'today') {
    // Today
  } else if (type === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (type === 'next_week') {
    date.setDate(date.getDate() + 7);
  }
  DOM.taskDeadlineInput.value = date.toISOString().slice(0, 10);
  DOM.taskTitleInput.focus();
}

// ==========================================================================
// RENDER & FILTER ENGINE
// ==========================================================================
function getDeadlineStatus(deadlineStr, isCompleted) {
  if (!deadlineStr) return { label: 'No deadline', className: 'future' };
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineStr);
  const deadlineDay = new Date(deadline);
  deadlineDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((deadlineDay - now) / (1000 * 60 * 60 * 24));

  if (isCompleted) {
    return { label: `Due: ${deadline.toLocaleDateString()}`, className: 'future' };
  }

  if (diffDays < 0) {
    return { label: `Overdue by ${Math.abs(diffDays)}d`, className: 'overdue' };
  } else if (diffDays === 0) {
    return { label: 'Due Today', className: 'today' };
  } else if (diffDays === 1) {
    return { label: 'Due Tomorrow', className: 'tomorrow' };
  } else {
    return { label: `Due in ${diffDays}d (${deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`, className: 'future' };
  }
}

function getFilteredTasks() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return state.tasks.filter(task => {
    // Search match
    if (state.searchQuery) {
      if (!task.title.toLowerCase().includes(state.searchQuery.toLowerCase())) {
        return false;
      }
    }

    // Status filter
    if (state.filter === 'pending') return !task.completed;
    if (state.filter === 'completed') return task.completed;
    
    if (state.filter === 'today') {
      if (task.completed || !task.deadline) return false;
      const d = new Date(task.deadline);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === now.getTime();
    }

    if (state.filter === 'overdue') {
      if (task.completed || !task.deadline) return false;
      const d = new Date(task.deadline);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < now.getTime();
    }

    return true;
  });
}

function renderTasks() {
  const filtered = getFilteredTasks();
  DOM.taskList.innerHTML = '';

  if (filtered.length === 0) {
    DOM.emptyState.style.display = 'flex';
  } else {
    DOM.emptyState.style.display = 'none';
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item-card ${task.completed ? 'is-completed' : ''}`;
    li.setAttribute('data-id', task._id);

    const deadlineInfo = getDeadlineStatus(task.deadline, task.completed);
    const createdDate = new Date(task.createdAt || Date.now()).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

    li.innerHTML = `
      <div class="task-left-section">
        <div class="custom-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTaskCompleted('${task._id}')" title="${task.completed ? 'Mark pending' : 'Mark done'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="task-content-details">
          <div class="task-title-text">${escapeHtml(task.title)}</div>
          <div class="task-meta-tags-row">
            ${task.deadline ? `
              <span class="deadline-badge ${deadlineInfo.className}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${deadlineInfo.label}
              </span>
            ` : ''}
            <span class="created-time-tag">Created ${createdDate}</span>
          </div>
        </div>
      </div>
      <div class="task-actions-group">
        <button class="btn-task-action" onclick="openEditModal('${task._id}')" title="Edit task" aria-label="Edit task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-task-action btn-delete" onclick="handleDeleteTask('${task._id}')" title="Delete task" aria-label="Delete task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;

    DOM.taskList.appendChild(li);
  });
}

function updateMetrics() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pending = total - completed;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dueToday = state.tasks.filter(t => {
    if (t.completed || !t.deadline) return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  }).length;

  DOM.statTotal.textContent = total;
  DOM.statPending.textContent = pending;
  DOM.statToday.textContent = dueToday;
  DOM.statCompleted.textContent = completed;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  DOM.progressPercent.textContent = `${percent}%`;
  DOM.progressFillBar.style.width = `${percent}%`;

  // Update chip count badges
  document.getElementById('chipAllCount').textContent = total;
  document.getElementById('chipPendingCount').textContent = pending;
  document.getElementById('chipTodayCount').textContent = dueToday;
  document.getElementById('chipCompletedCount').textContent = completed;
}

function renderRadar() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = state.tasks
    .filter(t => !t.completed && t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  DOM.radarList.innerHTML = '';

  if (upcoming.length === 0) {
    DOM.radarEmptyState.style.display = 'block';
  } else {
    DOM.radarEmptyState.style.display = 'none';

    upcoming.forEach(task => {
      const deadlineInfo = getDeadlineStatus(task.deadline, false);
      const row = document.createElement('div');
      row.className = 'radar-item-row';
      row.innerHTML = `
        <span class="radar-item-title">${escapeHtml(task.title)}</span>
        <span class="deadline-badge ${deadlineInfo.className}">${deadlineInfo.label}</span>
      `;
      DOM.radarList.appendChild(row);
    });
  }
}

function checkDeadlineAlerts() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dueTasks = state.tasks.filter(t => {
    if (t.completed || !t.deadline) return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  });

  const overdueTasks = state.tasks.filter(t => {
    if (t.completed || !t.deadline) return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < now.getTime();
  });

  if (dueTasks.length > 0) {
    showToast(`⚡ You have ${dueTasks.length} task(s) scheduled for completion today!`, 'warning', 5000);
  } else if (overdueTasks.length > 0) {
    showToast(`⚠️ You have ${overdueTasks.length} overdue task(s) needing attention.`, 'error', 5000);
  }
}

// Trigger Due Task Email automation job endpoint
async function handleTriggerDueJob() {
  DOM.triggerJobBtn.disabled = true;
  DOM.triggerJobBtn.innerHTML = `<span>Checking deadlines...</span>`;

  try {
    const res = await api('/run-due-task-job');
    showToast(res.message || 'Due task email service executed.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    DOM.triggerJobBtn.disabled = false;
    DOM.triggerJobBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      <span>Trigger Deadline Dispatcher</span>
    `;
  }
}

// Helper Utilities
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Password toggle helper
function setupPasswordToggles() {
  document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  });
}

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupPasswordToggles();

  // Theme Toggle Button
  if (DOM.themeToggleBtn) {
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Auth Tab Navigation
  if (DOM.tabLogin) DOM.tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (DOM.tabRegister) DOM.tabRegister.addEventListener('click', () => switchAuthTab('register'));
  if (DOM.tabOtp) DOM.tabOtp.addEventListener('click', () => switchAuthTab('otp'));

  // Auth Form Submits
  if (DOM.loginForm) DOM.loginForm.addEventListener('submit', handleLogin);
  if (DOM.registerForm) DOM.registerForm.addEventListener('submit', handleRegister);
  if (DOM.otpForm) DOM.otpForm.addEventListener('submit', handleVerifyOtp);

  // Demo user & OTP resend
  if (DOM.demoUserBtn) DOM.demoUserBtn.addEventListener('click', prefillDemoAccount);
  if (DOM.resendOtpBtn) DOM.resendOtpBtn.addEventListener('click', handleResendOtp);
  if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', logout);

  // Add Task
  if (DOM.addTaskBtn) DOM.addTaskBtn.addEventListener('click', handleAddTask);
  if (DOM.taskTitleInput) {
    DOM.taskTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddTask();
    });
  }

  // Search Input
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderTasks();
    });
  }

  // Filter Chips
  DOM.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Modal Listeners
  if (DOM.closeEditBtn) DOM.closeEditBtn.addEventListener('click', closeEditModal);
  if (DOM.cancelEditBtn) DOM.cancelEditBtn.addEventListener('click', closeEditModal);
  if (DOM.saveEditBtn) DOM.saveEditBtn.addEventListener('click', handleSaveEdit);
  if (DOM.editModal) {
    DOM.editModal.addEventListener('click', (e) => {
      if (e.target === DOM.editModal) closeEditModal();
    });
  }

  // Escape key for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.editModal.classList.contains('open')) {
      closeEditModal();
    }
  });

  // Trigger automation job
  if (DOM.triggerJobBtn) {
    DOM.triggerJobBtn.addEventListener('click', handleTriggerDueJob);
  }

  // Initialize session view
  renderSessionState();
});

// Export globals for inline HTML event triggers
window.setQuickDeadline = setQuickDeadline;
window.toggleTaskCompleted = toggleTaskCompleted;
window.openEditModal = openEditModal;
window.handleDeleteTask = handleDeleteTask;
window.switchAuthTab = switchAuthTab;
