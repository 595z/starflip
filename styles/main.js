// === Utils ===
function $(selector) { return document.querySelector(selector); }
function $all(selector) { return [...document.querySelectorAll(selector)]; }

// === Storage keys & helpers ===
const USERS_KEY = 'pulseflip_users';
const SESSION_KEY = 'pulseflip_session';

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function loadUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
}
function saveSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}
function loadSession() {
  return localStorage.getItem(SESSION_KEY);
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// === Auth Page Logic ===
if (document.body.classList.contains('auth-container') || document.querySelector('.auth-container')) {
  const loginTab = $('#loginTab');
  const signupTab = $('#signupTab');
  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');
  const authMessage = $('#authMessage');

  loginTab.onclick = () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    authMessage.textContent = '';
  };
  signupTab.onclick = () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    authMessage.textContent = '';
  };

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = $('#loginUsername').value.trim().toLowerCase();
    const password = $('#loginPassword').value;

    const users = loadUsers();
    if (!users[username]) {
      authMessage.textContent = 'User does not exist.';
      return;
    }
    if (users[username].password !== password) {
      authMessage.textContent = 'Incorrect password.';
      return;
    }

    saveSession(username);
    window.location.href = 'dashboard.html';
  });

  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = $('#signupUsername').value.trim().toLowerCase();
    const pass1 = $('#signupPassword').value;
    const pass2 = $('#signupPasswordConfirm').value;

    if (!username.match(/^[a-z0-9_-]{3,16}$/)) {
      authMessage.textContent = 'Username 3-16 chars, a-z, 0-9, _ or - only.';
      return;
    }
    if (pass1 !== pass2) {
      authMessage.textContent = 'Passwords do not match.';
      return;
    }
    if (pass1.length < 4) {
      authMessage.textContent = 'Password must be at least 4 characters.';
      return;
    }

    const users = loadUsers();
    if (users[username]) {
      authMessage.textContent = 'Username already taken.';
      return;
    }

    users[username] =
