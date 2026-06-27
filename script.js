import { sound } from './js/sound.js';
import { storage } from './js/storage.js';
import { getStats, recordMatch, getLeaderboard, clearAllData } from './js/stats.js';
import { achievements, checkAchievements, getUnlockProgress } from './js/achievements.js';
import { Board } from './js/board.js';
import { getAIMove } from './js/ai.js';
import { initConfetti, triggerWinConfetti } from './js/animation.js';

// ============================================================================
// GLOBAL APPLICATION STATE
// ============================================================================
let board = new Board();
let gameMode = 'ai'; // 'ai' or 'pvp'
let activeDifficulty = 'medium';
let seriesTarget = 1;
let p1Wins = 0;
let p2Wins = 0;
let matchStartTime = Date.now();
let timerInterval = null;
let p1Seconds = 0;
let p2Seconds = 0;

// History Table Pagination State
let historyCurrentPage = 1;
const HISTORY_ITEMS_PER_PAGE = 8;
let filteredHistoryCache = [];

// Charts instances
let dashWinChart = null;
let dashOpeningsChart = null;
let statsOpeningsChart = null;

// ============================================================================
// INITIALIZATION ON DOM LOAD
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Immediately display dashboard without blocking
  try {
    switchView('dashboard');
  } catch (err) {
    console.error('Non-blocking switchView error:', err);
  }

  // Background initialization of UI components and preferences
  setTimeout(() => {
    try {
      if (window.lucide) window.lucide.createIcons();
      initConfetti();

      // Load saved preferences
      const settings = storage.getSettings();
      if (settings.theme === 'light') {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        const themeSel = document.getElementById('setting-theme-select');
        if (themeSel) themeSel.value = 'light';
      }
      if (settings.soundMuted) {
        sound.setMute(true);
        const muteToggle = document.getElementById('setting-sound-toggle');
        if (muteToggle) muteToggle.checked = false;
        updateQuickMuteIcon();
      }
      if (settings.animationSpeed) {
        const speedSel = document.getElementById('setting-speed-select');
        if (speedSel) speedSel.value = settings.animationSpeed;
      }

      // Bind all interactive listeners
      bindNavigation();
      bindGameControls();
      bindHistoryControls();
      bindSettingsAndModals();
      
      // Refresh active view after bindings
      switchView('dashboard');
    } catch (err) {
      console.error('Non-blocking background initialization error:', err);
    }
  }, 10);
});

// ============================================================================
// VIEW ROUTER ENGINE
// ============================================================================
window.switchView = function(viewId) {
  sound.playClick();
  
  // Hide all views
  document.querySelectorAll('.app-view').forEach(v => {
    v.classList.remove('view-active');
  });

  // Show target view
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add('view-active');
  }

  // Update Sidebar buttons active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
  });

  // Update Bottom Nav buttons active state
  document.querySelectorAll('.app-bottom-nav .bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
  });

  // Render dynamic view data
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'play') renderPlayArena();
  if (viewId === 'statistics') renderStatistics();
  if (viewId === 'history') {
    historyCurrentPage = 1;
    renderHistoryTable();
  }
  if (viewId === 'achievements') renderAchievements('all');
  if (viewId === 'profile') renderProfile();

  if (window.lucide) window.lucide.createIcons();
};

function bindNavigation() {
  // Sidebar items
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // Bottom nav items
  document.querySelectorAll('.app-bottom-nav .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // Sidebar toggle collapse
  const sidebarToggle = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sound.playClick();
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) sidebar.classList.toggle('collapsed');
    });
  }

  // Quick action footer buttons
  const quickMute = document.getElementById('quick-mute-btn');
  if (quickMute) {
    quickMute.addEventListener('click', () => {
      sound.playClick();
      const isMuted = sound.toggleMute();
      storage.saveSettings({ soundMuted: isMuted });
      const toggle = document.getElementById('setting-sound-toggle');
      if (toggle) toggle.checked = !isMuted;
      updateQuickMuteIcon();
    });
  }

  const quickTheme = document.getElementById('quick-theme-btn');
  if (quickTheme) {
    quickTheme.addEventListener('click', () => {
      sound.playClick();
      const isDark = document.body.classList.contains('theme-dark');
      if (isDark) {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        storage.saveSettings({ theme: 'light' });
        const sel = document.getElementById('setting-theme-select');
        if (sel) sel.value = 'light';
      } else {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
        storage.saveSettings({ theme: 'dark' });
        const sel = document.getElementById('setting-theme-select');
        if (sel) sel.value = 'dark';
      }
      updateQuickThemeIcon();
    });
  }
}

function updateQuickMuteIcon() {
  const icon = document.getElementById('quick-mute-icon');
  if (!icon) return;
  if (sound.isMuted) {
    icon.setAttribute('data-lucide', 'volume-x');
  } else {
    icon.setAttribute('data-lucide', 'volume-2');
  }
  if (window.lucide) window.lucide.createIcons();
}

function updateQuickThemeIcon() {
  const icon = document.getElementById('quick-theme-icon');
  if (!icon) return;
  if (document.body.classList.contains('theme-light')) {
    icon.setAttribute('data-lucide', 'sun');
  } else {
    icon.setAttribute('data-lucide', 'moon');
  }
  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// COUNT-UP ANIMATION UTILITY
// ============================================================================
function animateCountUp(elementId, targetValue, suffix = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  let current = 0;
  const duration = 800; // ms
  const stepTime = 20;
  const steps = duration / stepTime;
  const increment = targetValue / steps;

  if (targetValue === 0) {
    el.textContent = '0' + suffix;
    return;
  }

  const timer = setInterval(() => {
    current += increment;
    if (current >= targetValue) {
      clearInterval(timer);
      el.textContent = Math.round(targetValue) + suffix;
    } else {
      el.textContent = Math.round(current) + suffix;
    }
  }, stepTime);
}

// ============================================================================
// VIEW RENDERERS
// ============================================================================

// 1. DASHBOARD
function renderDashboard() {
  const stats = getStats();
  const history = storage.getHistory();
  const profile = storage.getProfile();
  const unlockProg = getUnlockProgress();

  // Sidebar User Info
  const sideName = document.getElementById('sidebar-username');
  const sideLevel = document.getElementById('sidebar-userlevel');
  if (sideName) sideName.textContent = profile.username;
  if (sideLevel) sideLevel.textContent = `Level ${profile.level} • ${profile.rankTitle}`;

  // Hero Banner
  document.getElementById('dash-username').textContent = profile.username;
  document.getElementById('dash-level-badge').textContent = `LVL ${profile.level}`;
  document.getElementById('dash-rank-tag').textContent = profile.rankTitle;
  document.getElementById('dash-xp-label').textContent = `XP: ${profile.xp} / ${profile.xpNeeded}`;
  const xpPct = Math.min(100, Math.round((profile.xp / profile.xpNeeded) * 100));
  document.getElementById('dash-xp-percent').textContent = `${xpPct}%`;
  document.getElementById('dash-xp-fill').style.width = `${xpPct}%`;

  // Streaks
  animateCountUp('dash-streak-val', stats.currentStreak);
  document.getElementById('dash-longest-val').textContent = stats.longestStreak;

  // Metrics
  animateCountUp('dash-games-val', stats.gamesPlayed);
  animateCountUp('dash-wins-val', stats.wins);
  animateCountUp('dash-losses-val', stats.losses);
  animateCountUp('dash-draws-val', stats.draws);
  
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  animateCountUp('dash-winrate-val', winRate, '%');
  
  const avgTime = stats.gamesPlayed > 0 ? Math.round(stats.totalMatchTime / stats.gamesPlayed) : 0;
  document.getElementById('dash-avgtime-val').textContent = `${avgTime}s`;

  // Recent Matches List
  const recentContainer = document.getElementById('dashboard-recent-matches');
  if (recentContainer) {
    if (history.length === 0) {
      recentContainer.innerHTML = `<div class="empty-state">No recent matches recorded yet.</div>`;
    } else {
      recentContainer.innerHTML = history.slice(0, 4).map(m => {
        let dotClass = 'draw';
        if (m.winnerId === 1) dotClass = 'win';
        if (m.winnerId === 2) dotClass = 'loss';
        return `
          <div class="match-item">
            <div class="match-left">
              <span class="match-outcome-dot ${dotClass}"></span>
              <div>
                <div class="match-opp">${m.opponent}</div>
                <div class="match-time">${m.date} at ${m.time}</div>
              </div>
            </div>
            <span class="match-badge">${m.winnerId === 1 ? 'VICTORY' : (m.winnerId === 2 ? 'DEFEAT' : 'DRAW')}</span>
          </div>
        `;
      }).join('');
    }
  }

  // Achievement Teaser
  document.getElementById('dash-ach-count').textContent = `${unlockProg.unlocked} / ${unlockProg.total} Unlocked`;
  const achPct = Math.round((unlockProg.unlocked / unlockProg.total) * 100);
  document.getElementById('dash-ach-pct').textContent = `${achPct}%`;
  document.getElementById('dash-ach-fill').style.width = `${achPct}%`;

  // Next locked achievement
  const nextAchBox = document.getElementById('dashboard-next-achievement');
  if (nextAchBox) {
    const nextLocked = achievements.find(a => !a.unlocked);
    if (nextLocked) {
      nextAchBox.innerHTML = `
        <div class="next-ach-icon"><i data-lucide="${nextLocked.icon}"></i></div>
        <div class="next-ach-details">
          <span class="next-ach-title">${nextLocked.title}</span>
          <span class="next-ach-desc">${nextLocked.description}</span>
        </div>
      `;
    } else {
      nextAchBox.innerHTML = `<div class="empty-state">All achievements mastered!</div>`;
    }
  }

  // Render Charts
  renderDashboardCharts(stats);
  if (window.lucide) window.lucide.createIcons();
}

function renderDashboardCharts(stats) {
  const winCtx = document.getElementById('dashboardChart');
  const openCtx = document.getElementById('openingsChart');

  if (winCtx) {
    if (dashWinChart) dashWinChart.destroy();
    dashWinChart = new Chart(winCtx, {
      type: 'doughnut',
      data: {
        labels: ['Victories', 'Defeats', 'Draws'],
        datasets: [{
          data: [stats.wins, stats.losses, stats.draws],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
          borderColor: 'rgba(15, 23, 42, 0.8)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter' } } }
        }
      }
    });
  }

  if (openCtx) {
    if (dashOpeningsChart) dashOpeningsChart.destroy();
    dashOpeningsChart = new Chart(openCtx, {
      type: 'bar',
      data: {
        labels: ['Col 1', 'Col 2', 'Col 3', 'Col 4', 'Col 5', 'Col 6', 'Col 7'],
        datasets: [{
          label: 'Openings Played',
          data: stats.openingCols || [0,0,0,0,0,0,0],
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// 2. PLAY ARENA
function renderPlayArena() {
  renderBoardDOM();
  updateScoreboardDisplay();
  updateMoveHistoryLog();
  startMatchTimers();
}

function bindGameControls() {
  // Mode Selection
  const aiBtn = document.getElementById('mode-ai-btn');
  const pvpBtn = document.getElementById('mode-pvp-btn');
  const diffSection = document.getElementById('ai-difficulty-section');

  if (aiBtn && pvpBtn) {
    aiBtn.addEventListener('click', () => {
      sound.playClick();
      gameMode = 'ai';
      aiBtn.classList.add('active');
      pvpBtn.classList.remove('active');
      if (diffSection) diffSection.classList.remove('hidden');
      startNewSeries();
    });
    pvpBtn.addEventListener('click', () => {
      sound.playClick();
      gameMode = 'pvp';
      pvpBtn.classList.add('active');
      aiBtn.classList.remove('active');
      if (diffSection) diffSection.classList.add('hidden');
      startNewSeries();
    });
  }

  // Difficulty Select
  const diffSel = document.getElementById('ai-difficulty-select');
  if (diffSel) {
    diffSel.addEventListener('change', (e) => {
      activeDifficulty = e.target.value;
      startNewSeries();
    });
  }

  // Series Target Select
  const seriesSel = document.getElementById('series-target-select');
  if (seriesSel) {
    seriesSel.addEventListener('change', (e) => {
      seriesTarget = parseInt(e.target.value, 10);
      startNewSeries();
    });
  }

  // Action Buttons
  const newMatchBtn = document.getElementById('new-match-btn');
  if (newMatchBtn) newMatchBtn.addEventListener('click', () => { sound.playClick(); startNewMatch(); });

  const resetSeriesBtn = document.getElementById('reset-series-btn');
  if (resetSeriesBtn) resetSeriesBtn.addEventListener('click', () => { sound.playClick(); startNewSeries(); });

  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      sound.playClick();
      if (gameMode === 'ai') {
        board.undo();
        board.undo();
      } else {
        board.undo();
      }
      renderBoardDOM();
      updateScoreboardDisplay();
      updateMoveHistoryLog();
    });
  }

  const redoBtn = document.getElementById('redo-btn');
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      sound.playClick();
      board.redo();
      renderBoardDOM();
      updateScoreboardDisplay();
      updateMoveHistoryLog();
    });
  }
}

function startNewSeries() {
  p1Wins = 0;
  p2Wins = 0;
  startNewMatch();
}

function startNewMatch() {
  board.reset();
  matchStartTime = Date.now();
  p1Seconds = 0;
  p2Seconds = 0;
  renderBoardDOM();
  updateScoreboardDisplay();
  updateMoveHistoryLog();
  startMatchTimers();

  const analysis = document.getElementById('analysis-content');
  if (analysis) analysis.innerHTML = `<p>Waiting for move analysis...</p>`;
}

function renderBoardDOM() {
  const container = document.getElementById('game-board');
  if (!container) return;
  container.innerHTML = '';

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      const val = board.grid[r][c];
      if (val === 1) cell.classList.add('p1');
      if (val === 2) cell.classList.add('p2');

      // Highlight winning line
      if (board.winningCells && board.winningCells.some(wc => wc.r === r && wc.c === c)) {
        cell.classList.add('win-pulse');
      }

      cell.addEventListener('click', () => handleCellClick(c));
      container.appendChild(cell);
    }
  }

  // Undo/Redo button states
  const undo = document.getElementById('undo-btn');
  const redo = document.getElementById('redo-btn');
  if (undo) undo.disabled = (board.historyStack.length === 0 || board.isGameOver);
  if (redo) redo.disabled = (board.redoStack.length === 0 || board.isGameOver);
}

function handleCellClick(col) {
  if (board.isGameOver) return;
  if (gameMode === 'ai' && board.currentPlayer === 2) return; // AI turn

  if (!board.isValidMove(col)) {
    sound.playInvalid();
    return;
  }

  executeDrop(col);

  // Trigger AI turn if game mode is AI
  if (!board.isGameOver && gameMode === 'ai' && board.currentPlayer === 2) {
    triggerAITurn();
  }
}

function executeDrop(col) {
  const row = board.dropDisc(col);
  if (row !== -1) {
    sound.playDrop();
    renderBoardDOM();
    updateScoreboardDisplay();
    updateMoveHistoryLog();

    // Analysis evaluation update
    const analysis = document.getElementById('analysis-content');
    if (analysis) {
      const colName = col + 1;
      analysis.innerHTML = `<p>Player dropped in Column <strong>#${colName}</strong>. Controlling center diagonals.</p>`;
    }

    // Check game over
    if (board.isGameOver) {
      handleMatchGameOver();
    }
  }
}

function triggerAITurn() {
  const spinner = document.getElementById('ai-thinking-spinner');
  const turnBox = document.getElementById('status-turn-box');
  if (spinner) spinner.classList.remove('hidden');
  if (turnBox) turnBox.classList.add('hidden');

  const speedSel = document.getElementById('setting-speed-select');
  const delay = speedSel && speedSel.value === 'fast' ? 200 : (speedSel && speedSel.value === 'slow' ? 1000 : 500);

  setTimeout(() => {
    const aiMove = getAIMove(board, activeDifficulty);
    if (spinner) spinner.classList.add('hidden');
    if (turnBox) turnBox.classList.remove('hidden');

    if (aiMove !== null && board.isValidMove(aiMove)) {
      executeDrop(aiMove);
    }
  }, delay);
}

function updateScoreboardDisplay() {
  document.getElementById('p1-name-display').textContent = storage.getProfile().username;
  document.getElementById('p2-name-display').textContent = gameMode === 'ai' ? `AI (${activeDifficulty.toUpperCase()})` : 'Player 2';
  
  document.getElementById('score-p1').textContent = p1Wins;
  document.getElementById('score-p2').textContent = p2Wins;

  const cardP1 = document.getElementById('card-p1');
  const cardP2 = document.getElementById('card-p2');
  const statusDisc = document.getElementById('status-disc');
  const statusText = document.getElementById('status-text');

  if (board.currentPlayer === 1) {
    if (cardP1) cardP1.classList.add('active-turn');
    if (cardP2) cardP2.classList.remove('active-turn');
    if (statusDisc) { statusDisc.className = 'turn-disc p1'; }
    if (statusText) statusText.textContent = `${storage.getProfile().username.toUpperCase()}'S TURN`;
  } else {
    if (cardP2) cardP2.classList.add('active-turn');
    if (cardP1) cardP1.classList.remove('active-turn');
    if (statusDisc) { statusDisc.className = 'turn-disc p2'; }
    if (statusText) statusText.textContent = gameMode === 'ai' ? 'AI ENGINE CALCULATING...' : 'PLAYER 2\'S TURN';
  }
}

function startMatchTimers() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (board.isGameOver) {
      clearInterval(timerInterval);
      return;
    }
    if (board.currentPlayer === 1) p1Seconds++;
    else p2Seconds++;

    const p1Display = document.getElementById('p1-timer');
    const p2Display = document.getElementById('p2-timer');
    if (p1Display) p1Display.textContent = formatTime(p1Seconds);
    if (p2Display) p2Display.textContent = formatTime(p2Seconds);
  }, 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateMoveHistoryLog() {
  const list = document.getElementById('move-history-list');
  const badge = document.getElementById('move-count-badge');
  if (!list) return;

  const count = board.historyStack.length;
  if (badge) badge.textContent = `${count} Moves`;

  if (count === 0) {
    list.innerHTML = `<div class="empty-state">Make your opening drop to start notation logging.</div>`;
    return;
  }

  list.innerHTML = board.historyStack.map((move, idx) => {
    const playerStr = move.player === 1 ? 'P1' : (gameMode === 'ai' ? 'AI' : 'P2');
    const colStr = move.col + 1;
    const rowStr = move.row + 1;
    return `
      <div class="move-entry">
        <span>#${idx + 1} ${playerStr}</span>
        <span>Drop Col ${colStr} (Row ${rowStr})</span>
      </div>
    `;
  }).reverse().join('');
}

function handleMatchGameOver() {
  clearInterval(timerInterval);
  const duration = Math.round((Date.now() - matchStartTime) / 1000);

  let outcome = 'draw';
  if (board.winner === 1) {
    outcome = 'win';
    p1Wins++;
    sound.playWin();
    triggerWinConfetti();
  } else if (board.winner === 2) {
    outcome = 'loss';
    p2Wins++;
    sound.playLose();
  } else {
    outcome = 'draw';
    sound.playClick();
  }

  updateScoreboardDisplay();

  // Record stats & check achievements
  recordMatch(
    board.winner === 1 ? 1 : (board.winner === 2 ? 2 : 'tie'),
    gameMode,
    activeDifficulty,
    board.historyStack.length,
    duration,
    board.firstMoveCol,
    board.replayMoves
  );

  const unlockedNow = checkAchievements({
    outcome,
    durationSec: duration,
    movesCount: board.historyStack.length,
    gameMode,
    difficulty: activeDifficulty,
    seriesTarget
  });

  if (unlockedNow && unlockedNow.length > 0) {
    showAchievementToast(unlockedNow[0]);
  }

  // Show End Modal
  setTimeout(() => {
    showEndModal(outcome, duration);
  }, 1000);
}

function showEndModal(outcome, duration) {
  const modal = document.getElementById('end-modal');
  const title = document.getElementById('end-modal-title');
  const sub = document.getElementById('end-modal-subtitle');
  const timeVal = document.getElementById('end-stat-time');
  const movesVal = document.getElementById('end-stat-moves');
  const xpVal = document.getElementById('end-stat-xp');

  if (timeVal) timeVal.textContent = `${duration}s`;
  if (movesVal) movesVal.textContent = board.historyStack.length;

  if (outcome === 'win') {
    if (title) title.textContent = 'VICTORY!';
    if (sub) sub.textContent = 'You dominated the quantum arena.';
    if (xpVal) xpVal.textContent = '+50 XP';
    storage.addXP(50);
  } else if (outcome === 'loss') {
    if (title) title.textContent = 'DEFEATED';
    if (sub) sub.textContent = 'The AI engine outsmarted your strategy.';
    if (xpVal) xpVal.textContent = '+15 XP';
    storage.addXP(15);
  } else {
    if (title) title.textContent = 'STALEMATE';
    if (sub) sub.textContent = 'A complete grid deadlock.';
    if (xpVal) xpVal.textContent = '+25 XP';
    storage.addXP(25);
  }

  if (modal) modal.classList.remove('hidden');
}

function showAchievementToast(ach) {
  const toast = document.getElementById('achievement-toast');
  const title = document.getElementById('toast-title');
  const desc = document.getElementById('toast-desc');
  if (!toast) return;

  if (title) title.textContent = ach.title;
  if (desc) desc.textContent = ach.description;
  sound.playWin();

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4500);
}

// 3. STATISTICS VIEW
function renderStatistics() {
  const stats = getStats();
  animateCountUp('stat-total-games', stats.gamesPlayed);
  
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  animateCountUp('stat-winrate', winRate, '%');
  animateCountUp('stat-current-streak', stats.currentStreak);
  animateCountUp('stat-longest-streak', stats.longestStreak);
  
  document.getElementById('stat-fastest-win').textContent = stats.fastestWin ? `${stats.fastestWin}s` : 'N/A';
  const totalMins = Math.round(stats.totalMatchTime / 60);
  document.getElementById('stat-total-time').textContent = `${totalMins}m`;

  const ctx = document.getElementById('statsOpeningsChart');
  if (ctx) {
    if (statsOpeningsChart) statsOpeningsChart.destroy();
    statsOpeningsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Col 1', 'Col 2', 'Col 3', 'Col 4 (Center)', 'Col 5', 'Col 6', 'Col 7'],
        datasets: [{
          label: 'Times Played as First Move',
          data: stats.openingCols || [0,0,0,0,0,0,0],
          backgroundColor: 'rgba(0, 229, 255, 0.6)',
          borderColor: '#00e5ff',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// 4. MATCH HISTORY TABLE ENGINE
function renderHistoryTable() {
  const history = storage.getHistory();
  const searchVal = (document.getElementById('history-search')?.value || '').toLowerCase();
  const filterMode = document.getElementById('history-filter-mode')?.value || 'all';
  const sortVal = document.getElementById('history-sort')?.value || 'newest';

  // Filter
  filteredHistoryCache = history.filter(m => {
    const matchSearch = m.opponent.toLowerCase().includes(searchVal) || m.winner.toLowerCase().includes(searchVal);
    const matchMode = filterMode === 'all' || (filterMode === 'ai' && m.opponent.includes('AI')) || (filterMode === 'pvp' && !m.opponent.includes('AI'));
    return matchSearch && matchMode;
  });

  // Sort
  if (sortVal === 'oldest') filteredHistoryCache.reverse();
  if (sortVal === 'moves') filteredHistoryCache.sort((a,b) => b.moves - a.moves);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredHistoryCache.length / HISTORY_ITEMS_PER_PAGE));
  if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;

  const startIndex = (historyCurrentPage - 1) * HISTORY_ITEMS_PER_PAGE;
  const pageItems = filteredHistoryCache.slice(startIndex, startIndex + HISTORY_ITEMS_PER_PAGE);

  const tbody = document.getElementById('history-table-body');
  if (tbody) {
    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching history records found.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(m => {
        let resBadge = `<span class="rank-tag gold">DRAW</span>`;
        if (m.winnerId === 1) resBadge = `<span class="rank-tag" style="background:rgba(16,185,129,0.15);color:#10b981;border-color:#10b981;">VICTORY</span>`;
        if (m.winnerId === 2) resBadge = `<span class="rank-tag" style="background:rgba(239,68,68,0.15);color:#ef4444;border-color:#ef4444;">DEFEAT</span>`;
        
        return `
          <tr>
            <td>${m.date} <small style="color:var(--text-muted)">${m.time}</small></td>
            <td><strong>${m.opponent}</strong></td>
            <td>${m.difficulty}</td>
            <td>${m.moves} moves</td>
            <td>${m.duration}s</td>
            <td>${resBadge}</td>
            <td>
              <button class="btn-secondary mini replay-trigger-btn" data-id="${m.id}">
                <i data-lucide="video"></i> Replay
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Bind Replay Buttons
  document.querySelectorAll('.replay-trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.getAttribute('data-id');
      const matchObj = storage.getHistory().find(x => x.id === matchId);
      if (matchObj && matchObj.movesList) {
        openReplayViewer(matchObj.movesList);
      } else {
        alert('Replay data not available for this legacy record.');
      }
    });
  });

  // Pagination UI
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageInd = document.getElementById('page-indicator');

  if (pageInd) pageInd.textContent = `Page ${historyCurrentPage} of ${totalPages}`;
  if (prevBtn) prevBtn.disabled = (historyCurrentPage === 1);
  if (nextBtn) nextBtn.disabled = (historyCurrentPage === totalPages);
  if (window.lucide) window.lucide.createIcons();
}

function bindHistoryControls() {
  const search = document.getElementById('history-search');
  const mode = document.getElementById('history-filter-mode');
  const sort = document.getElementById('history-sort');
  const prev = document.getElementById('prev-page-btn');
  const next = document.getElementById('next-page-btn');

  if (search) search.addEventListener('input', () => { historyCurrentPage = 1; renderHistoryTable(); });
  if (mode) mode.addEventListener('change', () => { historyCurrentPage = 1; renderHistoryTable(); });
  if (sort) sort.addEventListener('change', () => { historyCurrentPage = 1; renderHistoryTable(); });

  if (prev) prev.addEventListener('click', () => { if (historyCurrentPage > 1) { historyCurrentPage--; renderHistoryTable(); } });
  if (next) next.addEventListener('click', () => { historyCurrentPage++; renderHistoryTable(); });
}

// 5. ACHIEVEMENTS VIEW
function renderAchievements(filter = 'all') {
  const grid = document.getElementById('achievements-grid');
  const unlockProg = getUnlockProgress();

  document.getElementById('ach-room-count').textContent = `${unlockProg.unlocked} / ${unlockProg.total}`;
  const pct = Math.round((unlockProg.unlocked / unlockProg.total) * 100);
  document.getElementById('ach-room-fill').style.width = `${pct}%`;

  if (!grid) return;

  const filtered = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  grid.innerHTML = filtered.map(a => `
    <div class="ach-card ${a.unlocked ? 'unlocked' : ''}">
      <div class="ach-card-icon"><i data-lucide="${a.icon}"></i></div>
      <div class="ach-card-info">
        <span class="ach-card-title">${a.title}</span>
        <span class="ach-card-desc">${a.description}</span>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

// 6. PROFILE VIEW
function renderProfile() {
  const profile = storage.getProfile();
  const stats = getStats();

  document.getElementById('prof-username').textContent = profile.username;
  document.getElementById('prof-level-badge').textContent = `LVL ${profile.level}`;
  document.getElementById('prof-rank').textContent = profile.rankTitle;
  document.getElementById('prof-xp-text').textContent = `XP Progression to Level ${profile.level + 1}: ${profile.xp} / ${profile.xpNeeded}`;
  
  const xpPct = Math.min(100, Math.round((profile.xp / profile.xpNeeded) * 100));
  document.getElementById('prof-xp-pct').textContent = `${xpPct}%`;
  document.getElementById('prof-xp-fill').style.width = `${xpPct}%`;

  animateCountUp('prof-wins', stats.wins);
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  animateCountUp('prof-winrate', winRate, '%');
  animateCountUp('prof-streak', stats.longestStreak);

  // Showcase Badges
  const badgesBox = document.getElementById('profile-recent-badges');
  if (badgesBox) {
    const unlocked = achievements.filter(a => a.unlocked);
    if (unlocked.length === 0) {
      badgesBox.innerHTML = `<div class="empty-state">Unlock achievements to showcase badges here.</div>`;
    } else {
      badgesBox.innerHTML = unlocked.slice(0, 6).map(a => `
        <div class="ach-card unlocked">
          <div class="ach-card-icon"><i data-lucide="${a.icon}"></i></div>
          <div class="ach-card-info">
            <span class="ach-card-title">${a.title}</span>
            <span class="ach-card-desc">${a.description}</span>
          </div>
        </div>
      `).join('');
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// SETTINGS & MODALS BINDINGS
// ============================================================================
function bindSettingsAndModals() {
  // Sound Toggle
  const soundToggle = document.getElementById('setting-sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      sound.setMute(!e.target.checked);
      storage.saveSettings({ soundMuted: !e.target.checked });
      updateQuickMuteIcon();
    });
  }

  // Theme Select
  const themeSel = document.getElementById('setting-theme-select');
  if (themeSel) {
    themeSel.addEventListener('change', (e) => {
      if (e.target.value === 'light') {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
      } else {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
      }
      storage.saveSettings({ theme: e.target.value });
      updateQuickThemeIcon();
    });
  }

  // Speed Select
  const speedSel = document.getElementById('setting-speed-select');
  if (speedSel) {
    speedSel.addEventListener('change', (e) => {
      storage.saveSettings({ animationSpeed: e.target.value });
    });
  }

  // Reset Data
  const resetBtn = document.getElementById('reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you certain you want to erase all stats, achievements, and match history?')) {
        clearAllData();
        alert('All local data has been reset.');
        switchView('dashboard');
      }
    });
  }

  // Achievement Filter Tabs
  document.querySelectorAll('.ach-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ach-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAchievements(tab.getAttribute('data-filter'));
    });
  });

  // End Modal Buttons
  const playAgain = document.getElementById('modal-play-again-btn');
  if (playAgain) playAgain.addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    startNewMatch();
  });

  const viewReplay = document.getElementById('modal-view-replay-btn');
  if (viewReplay) viewReplay.addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    openReplayViewer(board.replayMoves);
  });

  const backDash = document.getElementById('modal-dashboard-btn');
  if (backDash) backDash.addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    switchView('dashboard');
  });

  // Replay Modal Close
  const closeRep = document.getElementById('close-replay-btn');
  if (closeRep) closeRep.addEventListener('click', () => {
    document.getElementById('replay-modal').classList.add('hidden');
  });
}

// ============================================================================
// REPLAY VIEWER ENGINE
// ============================================================================
let replayStep = 0;
let replayMovesList = [];
let replayGrid = [];

function openReplayViewer(moves) {
  if (!moves || moves.length === 0) {
    alert('No moves sequence recorded for this replay.');
    return;
  }
  replayMovesList = moves;
  replayStep = 0;
  replayGrid = Array.from({ length: 6 }, () => Array(7).fill(0));

  const modal = document.getElementById('replay-modal');
  if (modal) modal.classList.remove('hidden');

  renderReplayBoard();
  updateReplayControls();

  const prevBtn = document.getElementById('replay-prev-btn');
  const nextBtn = document.getElementById('replay-next-btn');

  prevBtn.onclick = () => { if (replayStep > 0) { replayStep--; recalculateReplayGrid(); renderReplayBoard(); updateReplayControls(); } };
  nextBtn.onclick = () => { if (replayStep < replayMovesList.length) { replayStep++; recalculateReplayGrid(); renderReplayBoard(); updateReplayControls(); } };
}

function recalculateReplayGrid() {
  replayGrid = Array.from({ length: 6 }, () => Array(7).fill(0));
  let player = 1;
  for (let i = 0; i < replayStep; i++) {
    const col = replayMovesList[i];
    for (let r = 5; r >= 0; r--) {
      if (replayGrid[r][col] === 0) {
        replayGrid[r][col] = player;
        break;
      }
    }
    player = player === 1 ? 2 : 1;
  }
}

function renderReplayBoard() {
  const container = document.getElementById('replay-board');
  if (!container) return;
  container.innerHTML = '';

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if (replayGrid[r][c] === 1) cell.classList.add('p1');
      if (replayGrid[r][c] === 2) cell.classList.add('p2');
      container.appendChild(cell);
    }
  }
}

function updateReplayControls() {
  const lbl = document.getElementById('replay-step-label');
  if (lbl) lbl.textContent = `Step ${replayStep} / ${replayMovesList.length}`;
  const prev = document.getElementById('replay-prev-btn');
  const next = document.getElementById('replay-next-btn');
  if (prev) prev.disabled = (replayStep === 0);
  if (next) next.disabled = (replayStep === replayMovesList.length);
}
