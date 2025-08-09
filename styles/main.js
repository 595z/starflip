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

    users[username] = {
      password: pass1,
      balance: 1000,
      minesHighScore: 0,
      towersHighScore: 0,
    };
    saveUsers(users);

    saveSession(username);
    window.location.href = 'dashboard.html';
  });
}
  
// === Dashboard Page Logic ===
if (document.body.classList.contains('dashboard-container') || document.querySelector('.dashboard-container')) {
  const logoutBtn = $('#logoutBtn');
  const balanceAmount = $('#balanceAmount');
  const depositBtn = $('#depositBtn');
  const withdrawBtn = $('#withdrawBtn');
  const depositInput = $('#depositInput');
  const withdrawInput = $('#withdrawInput');
  const gamesCards = $all('.game-card');
  const games = $all('.game');
  const profitDisplay = $('#profitDisplay');

  let currentUser = loadSession();
  if (!currentUser) {
    window.location.href = 'login.html';
  }
  let users = loadUsers();
  let balance = users[currentUser].balance || 1000;
  balanceAmount.textContent = '$' + balance.toLocaleString();

  logoutBtn.onclick = () => {
    clearSession();
    window.location.href = 'login.html';
  };

  depositBtn.onclick = () => {
    let amount = parseInt(depositInput.value);
    if (isNaN(amount) || amount <= 0) return alert('Enter a valid deposit amount.');
    balance += amount;
    users[currentUser].balance = balance;
    saveUsers(users);
    balanceAmount.textContent = '$' + balance.toLocaleString();
    depositInput.value = '';
  };

  withdrawBtn.onclick = () => {
    let amount = parseInt(withdrawInput.value);
    if (isNaN(amount) || amount <= 0) return alert('Enter a valid withdrawal amount.');
    if (amount > balance) return alert('Insufficient balance.');
    balance -= amount;
    users[currentUser].balance = balance;
    saveUsers(users);
    balanceAmount.textContent = '$' + balance.toLocaleString();
    withdrawInput.value = '';
  };

  gamesCards.forEach(card => {
    card.onclick = () => {
      gamesCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const gameName = card.dataset.game;
      games.forEach(g => {
        if (g.id === gameName) g.classList.add('active');
        else g.classList.remove('active');
      });
      profitDisplay.textContent = '';
    };
  });

  // === Mines Game ===
  const minesGrid = $('#minesGrid');
  const minesProfitDisplay = $('#minesProfit');
  const minesPlayBtn = $('#minesPlayBtn');
  const minesBetInput = $('#minesBet');

  let minesGameState = null;

  function generateMinesGrid(size = 5, bombsCount = 5) {
    let cells = [];
    let bombPositions = new Set();
    while (bombPositions.size < bombsCount) {
      bombPositions.add(Math.floor(Math.random() * (size * size)));
    }
    for (let i = 0; i < size * size; i++) {
      cells.push({
        index: i,
        bomb: bombPositions.has(i),
        revealed: false,
      });
    }
    return cells;
  }

  function renderMinesGrid() {
    minesGrid.innerHTML = '';
    minesGameState.cells.forEach(cell => {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'cell';
      if (cell.revealed) {
        if (cell.bomb) {
          cellDiv.classList.add('revealed-bomb');
          cellDiv.textContent = '💣';
        } else {
          cellDiv.classList.add('revealed-safe');
          cellDiv.textContent = '✔️';
        }
        cellDiv.style.cursor = 'default';
      } else {
        cellDiv.textContent = '';
        cellDiv.onclick = () => {
          if (cell.revealed) return;
          cell.revealed = true;
          if (cell.bomb) {
            // Game over - lose
            endMinesGame(false);
          } else {
            // Calculate profit and continue
            minesGameState.safeCount++;
            let profit = calculateMinesProfit(minesGameState.bet, minesGameState.safeCount);
            minesProfitDisplay.textContent = `Potential Profit: $${profit.toLocaleString()}`;
            if (minesGameState.safeCount === (25 - 5)) {
              endMinesGame(true);
            }
          }
          renderMinesGrid();
        };
      }
      minesGrid.appendChild(cellDiv);
    });
  }

  function calculateMinesProfit(bet, safeCount) {
    // Example profit curve - can be tuned for fairness
    let multipliers = [
      0, 1.1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7, 10,
      13, 16, 20, 25, 30, 40, 50, 75, 100, 150, 200,
      300, 500, 1000,
    ];
    return Math.floor(bet * (multipliers[safeCount] || multipliers[multipliers.length - 1]));
  }

  function endMinesGame(won) {
    if (won) {
      let profit = calculateMinesProfit(minesGameState.bet, minesGameState.safeCount);
      balance += profit;
      alert(`Congratulations! You won $${profit.toLocaleString()}.`);
    } else {
      alert('Boom! You hit a bomb. You lost your bet.');
    }
    users[currentUser].balance = balance;
    saveUsers(users);
    balanceAmount.textContent = '$' + balance.toLocaleString();
    resetMinesGame();
  }

  function resetMinesGame() {
    minesGameState = null;
    minesGrid.innerHTML = '';
    minesProfitDisplay.textContent = '';
    minesBetInput.disabled = false;
    minesPlayBtn.disabled = false;
  }

  minesPlayBtn.onclick = () => {
    let bet = parseInt(minesBetInput.value);
    if (isNaN(bet) || bet <= 0) return alert('Enter a valid bet amount.');
    if (bet > balance) return alert('Insufficient balance.');
    balance -= bet;
    users[currentUser].balance = balance;
    saveUsers(users);
    balanceAmount.textContent = '$' + balance.toLocaleString();

    minesGameState = {
      bet,
      cells: generateMinesGrid(),
      safeCount: 0,
    };
    minesBetInput.disabled = true;
    minesPlayBtn.disabled = true;
    renderMinesGrid();
  };

  // === Towers Game ===
  const towersGrid = $('#towersGrid');
  const towersPlayBtn = $('#towersPlayBtn');
  const towersBetInput = $('#towersBet');
  const towersProfitDisplay = $('#towersProfit');

  let towersGameState = null;

  function generateTowersGrid(size = 5) {
    let cells = [];
    for (let i = 0; i < size * size; i++) {
      cells.push({
        index: i,
        active: false,
      });
    }
    return cells;
  }

  function renderTowersGrid() {
    towersGrid.innerHTML = '';
    towersGameState.cells.forEach(cell => {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'step';
      if (cell.active) {
        cellDiv.classList.add('active-step');
      }
      cellDiv.onclick = () => {
        if (cell.active) return;
        cell.active = true;
        towersGameState.activeCount++;
        updateTowersProfit();
        renderTowersGrid();
        if (towersGameState.activeCount === towersGameState.cells.length) {
          endTowersGame(true);
        }
      };
      towersGrid.appendChild(cellDiv);
    });
  }

  function calculateTowersProfit(bet, activeCount) {
    // Example linear multiplier
    return bet * (1 + activeCount * 0.25);
  }

  function updateTowersProfit() {
    let profit = calculateTowersProfit(towersGameState.bet, towersGameState.activeCount);
    towersProfitDisplay.textContent = `Potential Profit: $${profit.toLocaleString()}`;
  }

  function endTowersGame(won) {
    if (won) {
      let profit = calculateTowersProfit(towersGameState.bet, towersGameState.activeCount);
      balance += profit;
      alert(`Amazing! You activated all towers and won $${profit.toLocaleString()}.`);
    } else {
      alert('Game over.');
    }
    users[currentUser].balance = balance;
    saveUsers(users);
    balanceAmount.textContent = '$' + balance.toLocaleString();
    resetTowersGame();
  }

  function resetTowersGame() {
    towersGameState = null;
    towersGrid.innerHTML = '';
    towersProfitDisplay.textContent = '';
    towersBetInput.disabled = false;
    towersPlayBtn.disabled = false;
  }

  towersPlayBtn.onclick = () => {
    let bet = parseInt(towersBetInput.value);
    if (isNaN(bet) || bet <= 0) return alert('Enter a valid bet amount.');
    if (bet > balance) return alert('Insufficient balance.');
    balance -= bet;
    users[currentUser].balance = balance;
    saveUsers(users);
    balanceAmount.textContent = '$' + balance.toLocaleString();

    towersGameState = {
      bet,
      cells: generateTowersGrid(),
      activeCount: 0,
    };
    towersBetInput.disabled = true;
    towersPlayBtn.disabled = true;
    renderTowersGrid();
  };
}
