// script.js
import { storage } from './js/storage.js';
import { sounds } from './js/sound.js';
import { anim } from './js/animation.js';
import { BoardManager, ROWS, COLS } from './js/board.js';
import { ConnectFourAI } from './js/ai.js';
import { recordMatch, getLeaderboardData, exportStatsAsJson, getXpRequiredForLevel } from './js/stats.js';
import { ACHIEVEMENTS, checkAchievements, unlockAchievement } from './js/achievements.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  /* ==========================================
     GLOBAL MANAGERS
     ========================================== */
  const board = new BoardManager();
  const ai = new ConnectFourAI('medium');

  // Match session variables
  let gameMode = 'ai'; // 'ai', 'pvp', 'demo'
  let activeDifficulty = 'medium';
  let isAiPlaying = false;
  let matchStartTime = 0;
  let activeReplayIndex = 0;
  let activeReplayMoves = [];
  let isReplayPlaying = false;
  let replayTimeout = null;
  let currentReplaySpeed = 1500; // ms

  /* ==========================================
     DOM QUERIES
     ========================================== */
  const screens = {
    splash: document.getElementById('screen-splash'),
    menu: document.getElementById('screen-menu'),
    settings: document.getElementById('screen-settings'),
    stats: document.getElementById('screen-stats'),
    achievements: document.getElementById('screen-achievements'),
    leaderboard: document.getElementById('screen-leaderboard'),
    game: document.getElementById('screen-game')
  };

  // Modals & Panels
  const setupModal = document.getElementById('setup-modal');
  const endModal = document.getElementById('end-modal');
  const replayOverlay = document.getElementById('replay-controls-overlay');
  const achievementToast = document.getElementById('achievement-toast');

  // Settings DOM
  const selectTheme = document.getElementById('setting-theme');
  const selectSpeed = document.getElementById('setting-speed');
  const checkParticles = document.getElementById('setting-particles');
  const rangeVolume = document.getElementById('setting-volume');
  const btnMute = document.getElementById('btn-sound-mute-toggle');
  const muteIcon = document.getElementById('mute-icon');

  // Setup Modal DOM
  const selectSetupSeries = document.getElementById('setup-series-mode');
  const selectSetupDifficulty = document.getElementById('setup-difficulty-select');
  const difficultyGroup = document.getElementById('setup-difficulty-group');

  // Game UI DOM
  const gameGrid = document.getElementById('game-board-grid');
  const columnHovers = document.getElementById('game-column-hovers');
  const turnCard = document.getElementById('game-turn-card');
  const turnToken = document.getElementById('game-turn-token');
  const turnName = document.getElementById('game-turn-name');
  const aiThinkingBox = document.getElementById('game-ai-thinking-box');
  const seriesTargetBanner = document.getElementById('series-target-banner');
  const seriesDotsRow = document.getElementById('series-dots-row');

  // Scoreboard
  const p1ScoreEl = document.getElementById('game-p1-score');
  const p2ScoreEl = document.getElementById('game-tie-score'); // Draws
  const p3ScoreEl = document.getElementById('game-p2-score'); // Player 2/AI
  const p2Label = document.getElementById('game-p2-label');
  const p2TokenPreview = document.getElementById('game-p2-token-preview');

  // Profiles UI
  const menuProfileName = document.getElementById('menu-profile-name');
  const menuProfileRank = document.getElementById('menu-profile-rank');
  const menuProfileLvl = document.getElementById('menu-profile-lvl');
  const menuProfileXpCurr = document.getElementById('menu-profile-xp-curr');
  const menuProfileXpMax = document.getElementById('menu-profile-xp-max');
  const menuProfileXpFill = document.getElementById('menu-profile-xp-fill');

  /* ==========================================
     VIEW NAVIGATION CONTROLLER
     ========================================== */
  function showScreen(screenKey) {
    sounds.playClick();
    
    // Deactivate all screens
    Object.keys(screens).forEach(key => {
      screens[key].classList.remove('screen-active');
    });

    // Stop loops by default
    anim.stopBgParticles();

    // Activate target
    if (screens[screenKey]) {
      screens[screenKey].classList.add('screen-active');
    }

    // Custom Screen Actions
    if (screenKey === 'menu') {
      const prefs = storage.getPreferences();
      if (prefs.particles === 'on') {
        anim.startBgParticles();
      }
      renderMenuProfile();
    } else if (screenKey === 'stats') {
      renderStatsDashboard();
    } else if (screenKey === 'achievements') {
      renderAchievementsGrid();
    } else if (screenKey === 'leaderboard') {
      renderLeaderboard();
    }
  }

  /* ==========================================
     INITIAL PREFERENCE SETUP
     ========================================== */
  function applyPreferences() {
    const prefs = storage.getPreferences();
    
    // 1. Theme Configuration
    applyTheme(prefs.theme);
    selectTheme.value = prefs.theme;

    // 2. Sound Configuration
    sounds.setVolume(prefs.volume);
    rangeVolume.value = prefs.volume;
    const isMuted = prefs.sound === 'off';
    sounds.setMute(isMuted);
    updateMuteIcon(isMuted);

    // 3. Speed Configuration
    applyAnimationSpeed(prefs.speed);
    selectSpeed.value = prefs.speed;

    // 4. Board Color Configuration
    applyBoardColor(prefs.boardColor);
    highlightSwatch(prefs.boardColor);

    // 5. Particles config
    checkParticles.checked = prefs.particles === 'on';
    if (prefs.particles === 'on' && screens.menu.classList.contains('screen-active')) {
      anim.startBgParticles();
    }
  }

  function applyTheme(theme) {
    document.body.classList.remove('light-mode', 'dark-theme-forced', 'system-theme-active');
    if (theme === 'light') {
      document.body.classList.add('light-mode', 'dark-theme-forced');
    } else if (theme === 'dark') {
      // Dark mode is default, force dark theme variables
      document.body.classList.add('dark-theme-forced');
    } else {
      document.body.classList.add('system-theme-active');
    }
  }

  function applyAnimationSpeed(speed) {
    let factor = 1;
    if (speed === 'slow') factor = 2;
    if (speed === 'fast') factor = 0.4;
    
    document.documentElement.style.setProperty('--anim-speed-factor', factor);
  }

  function applyBoardColor(colorHex) {
    document.documentElement.style.setProperty('--board-color', colorHex);
  }

  function updateMuteIcon(isMuted) {
    if (isMuted) {
      muteIcon.setAttribute('data-lucide', 'volume-x');
    } else {
      muteIcon.setAttribute('data-lucide', 'volume-2');
    }
    lucide.createIcons();
  }

  function highlightSwatch(colorHex) {
    const swatches = document.querySelectorAll('.color-swatch-btn');
    swatches.forEach(sw => {
      if (sw.dataset.color === colorHex) {
        sw.classList.add('active-swatch');
      } else {
        sw.classList.remove('active-swatch');
      }
    });
  }

  /* ==========================================
     PROFILE AND LEVEL PRESENTATION
     ========================================== */
  function renderMenuProfile() {
    const profile = storage.getProfile();
    menuProfileName.textContent = `PLAYER LEVEL ${profile.level}`;
    menuProfileRank.textContent = profile.rank.toUpperCase();
    menuProfileLvl.textContent = profile.level;
    
    const xpMax = getXpRequiredForLevel(profile.level);
    menuProfileXpCurr.textContent = profile.xp;
    menuProfileXpMax.textContent = xpMax;
    
    const percentage = Math.min((profile.xp / xpMax) * 100, 100);
    menuProfileXpFill.style.width = `${percentage}%`;
  }

  /* ==========================================
     BOARD RENDERING ENGINE
     ========================================== */
  function createBoardDOM() {
    gameGrid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const slot = document.createElement('div');
        slot.classList.add('cell-slot');
        slot.dataset.row = r;
        slot.dataset.col = c;
        gameGrid.appendChild(slot);
      }
    }
  }

  function renderGridState() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const slot = gameGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        const value = board.grid[r][c];
        
        // Clear slot
        slot.innerHTML = '';

        if (value !== 0) {
          const chip = document.createElement('div');
          chip.classList.add('chip');
          chip.classList.add(value === 1 ? 'p1' : 'p2');
          slot.appendChild(chip);
        }
      }
    }
    updateUndoRedoButtonState();
  }

  function animateDiscdrop(move) {
    const slot = gameGrid.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
    slot.innerHTML = ''; // clear

    const chip = document.createElement('div');
    chip.classList.add('chip', move.player === 1 ? 'p1' : 'p2', 'chip-animate-drop');
    slot.appendChild(chip);
    sounds.playDrop();

    // Remove drop animation class after execution to prevent loops on scroll/update
    setTimeout(() => {
      chip.classList.remove('chip-animate-drop');
    }, 550 * parseFloat(document.documentElement.style.getPropertyValue('--anim-speed-factor') || 1));

    updateUndoRedoButtonState();
  }

  function updateUndoRedoButtonState() {
    document.getElementById('btn-game-undo').disabled = board.historyStack.length === 0;
    document.getElementById('btn-game-redo').disabled = board.redoStack.length === 0;
  }

  /* ==========================================
     GAME LOOP EVENTS
     ========================================== */
  function executeMove(col) {
    if (board.isGameOver || isAiPlaying) return;

    // Check opening column statistic log (first move of match)
    if (board.historyStack.length === 0) {
      board.firstMoveCol = col;
    }

    const move = board.placeDisc(col);
    if (!move) return;

    animateDiscdrop(move);

    // Evaluate Win/Tie conditions
    const winDetails = board.checkWin();
    if (winDetails) {
      triggerRoundOver(winDetails);
      return;
    }

    if (board.checkTie()) {
      triggerRoundOver({ winner: 'tie' });
      return;
    }

    // Switch turns
    board.currentPlayer = board.currentPlayer === 1 ? 2 : 1;
    updateGameTurnUI();

    // Trigger AI or Demo loops
    if (gameMode === 'ai' && board.currentPlayer === 2) {
      triggerAiWorkflow();
    } else if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  }

  function updateGameTurnUI() {
    // Normal indicators
    turnToken.className = 'token-preview';
    turnCard.className = 'turn-indicator-card';
    turnToken.style.display = 'block';
    turnName.style.display = 'inline';
    aiThinkingBox.style.display = 'none';

    if (board.currentPlayer === 1) {
      turnCard.classList.add('active-p1');
      turnToken.classList.add('player-1-color', 'glow-red');
      turnName.textContent = 'Player 1';
    } else {
      turnCard.classList.add('active-p2');
      turnToken.classList.add('player-2-color', 'glow-cyan');
      turnName.textContent = gameMode === 'ai' ? 'Computer AI' : 'Player 2';
    }
  }

  function triggerAiWorkflow() {
    isAiPlaying = true;
    
    // Show AI Thinking banner
    turnToken.style.display = 'none';
    turnName.style.display = 'none';
    aiThinkingBox.style.display = 'flex';

    // Speed setting determines AI delay
    const speed = storage.getPreferences().speed;
    const thinkingDelay = speed === 'slow' ? 2400 : (speed === 'fast' ? 400 : 1200);

    setTimeout(() => {
      // Demo loop plays AI VS AI (Player 1 is easy, Player 2 is hard)
      if (gameMode === 'demo') {
        const diff = board.currentPlayer === 1 ? 'easy' : 'impossible';
        ai.setDifficulty(diff);
      } else {
        ai.setDifficulty(activeDifficulty);
      }

      // Compute board state
      const bestMove = ai.getMove(board.grid, 1, 2);
      
      // Hide AI thinking banner
      aiThinkingBox.style.display = 'none';
      isAiPlaying = false;

      if (bestMove !== -1) {
        // Place disc
        const move = board.placeDisc(bestMove);
        if (move) {
          animateDiscdrop(move);
          
          const winDetails = board.checkWin();
          if (winDetails) {
            triggerRoundOver(winDetails);
            return;
          }

          if (board.checkTie()) {
            triggerRoundOver({ winner: 'tie' });
            return;
          }

          // Toggle player turn
          board.currentPlayer = board.currentPlayer === 1 ? 2 : 1;
          updateGameTurnUI();

          // Keep playing demo mode if applicable
          if (gameMode === 'demo') {
            triggerAiWorkflow();
          }
        }
      }
    }, thinkingDelay);
  }

  /* ==========================================
     ROUND AND SERIES CONCLUSION
     ========================================== */
  function triggerRoundOver(result) {
    board.isGameOver = true;
    anim.triggerCameraShake(document.getElementById('physical-board-container'));

    // Compute duration
    const duration = Math.floor((Date.now() - matchStartTime) / 1000);

    // Save logs and stats on completed match
    const summary = board.recordRoundOutcome(result.winner);
    
    // Check if this rounds finishes the series
    let seriesComplete = board.seriesWinner !== null;
    
    if (result.winner === 'tie') {
      sounds.playDraw();
      showEndModal('tie', summary, duration);
    } else {
      if (result.winner === 1) {
        sounds.playWin();
        anim.startConfetti();
        showEndModal('p1', summary, duration);
      } else {
        sounds.playLose();
        showEndModal('p2', summary, duration);
      }

      // Highlight winning disc lines
      result.cells.forEach(([r, c]) => {
        const slot = gameGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        const chip = slot.querySelector('.chip');
        if (chip) {
          chip.classList.add('win-highlight');
          chip.style.color = result.winner === 1 ? 'var(--player-1)' : 'var(--player-2)';
        }
      });
    }

    renderSeriesProgressDots();
  }

  function showEndModal(outcome, summary, duration) {
    const statsReport = recordMatch(
      outcome === 'win' || outcome === 'p1' ? 1 : (outcome === 'tie' ? 'tie' : 2),
      gameMode,
      activeDifficulty,
      board.historyStack.length,
      duration,
      board.firstMoveCol,
      board.replayMoves
    );

    // Check achievement locks
    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
      newAchievements.forEach((badge, index) => {
        setTimeout(() => triggerAchievementToast(badge), (index + 1) * 1600);
      });
    }

    // Modal Content Configuration
    const modalGlow = document.getElementById('end-modal-glow');
    const modalIcon = document.getElementById('end-modal-icon');
    const modalTitle = document.getElementById('end-modal-title');
    const modalDesc = document.getElementById('end-modal-description');
    
    const xpGainedEl = document.getElementById('end-modal-xp-gained');
    const lvlTag = document.getElementById('end-modal-lvl-tag');
    
    const scoreP1Val = document.getElementById('modal-score-p1');
    const scoreP2Val = document.getElementById('modal-score-p2');
    const labelP2 = document.getElementById('modal-p2-score-label');

    xpGainedEl.textContent = statsReport.xpGained;
    lvlTag.style.display = statsReport.levelUp ? 'inline-block' : 'none';

    scoreP1Val.textContent = summary.scores.p1;
    scoreP2Val.textContent = summary.scores.p2;
    labelP2.textContent = gameMode === 'ai' ? 'AI Wins:' : 'P2 Wins:';

    if (outcome === 'tie') {
      modalGlow.style.background = 'var(--tie-color)';
      modalIcon.setAttribute('data-lucide', 'help-circle');
      modalTitle.textContent = "IT'S A DRAW!";
      modalTitle.style.color = 'var(--tie-color)';
      modalDesc.textContent = "Great strategic placements by both sides led to a draw.";
    } else if (outcome === 'p1') {
      modalGlow.style.background = 'var(--player-1)';
      modalIcon.setAttribute('data-lucide', 'trophy');
      modalTitle.textContent = board.seriesWinner === 1 ? "SERIES CHAMPION!" : "PLAYER 1 WINS!";
      modalTitle.style.color = 'var(--player-1)';
      modalDesc.textContent = board.seriesWinner === 1 ? "You have crushed the series matches!" : "A tactical victory in this round.";
    } else {
      modalGlow.style.background = 'var(--player-2)';
      modalIcon.setAttribute('data-lucide', 'award');
      modalTitle.textContent = board.seriesWinner === 2 ? "SERIES DEFEAT!" : (gameMode === 'ai' ? "COMPUTER WINS!" : "PLAYER 2 WINS!");
      modalTitle.style.color = 'var(--player-2)';
      modalDesc.textContent = gameMode === 'ai' ? "The Minimax neural routes outsmarted your placements." : "A stunning tactical victory.";
    }

    lucide.createIcons();

    // Open Modal with short delay
    setTimeout(() => {
      endModal.classList.add('open');
    }, 1200);
  }

  function triggerAchievementToast(badge) {
    sounds.playUnlock();
    document.getElementById('toast-title').textContent = badge.title;
    document.getElementById('toast-desc').textContent = badge.desc;
    achievementToast.classList.add('show');

    setTimeout(() => {
      achievementToast.classList.remove('show');
    }, 4500);
  }

  function renderSeriesProgressDots() {
    seriesDotsRow.innerHTML = '';
    const targetWins = board.getSeriesTargetWins();
    if (targetWins === Infinity) {
      seriesDotsRow.style.display = 'none';
      return;
    }
    
    seriesDotsRow.style.display = 'flex';
    
    // Draw dots for Player 1
    const p1Container = document.createElement('div');
    p1Container.classList.add('series-faction');
    for (let i = 0; i < targetWins; i++) {
      const dot = document.createElement('div');
      dot.classList.add('series-dot');
      if (i < board.seriesScores.p1) dot.classList.add('earned-p1');
      p1Container.appendChild(dot);
    }
    
    const separator = document.createElement('span');
    separator.textContent = 'VS';
    separator.style.fontSize = '10px';
    separator.style.fontWeight = 'bold';
    separator.style.color = 'var(--text-muted)';
    
    // Draw dots for Player 2
    const p2Container = document.createElement('div');
    p2Container.classList.add('series-faction');
    for (let i = 0; i < targetWins; i++) {
      const dot = document.createElement('div');
      dot.classList.add('series-dot');
      if (i < board.seriesScores.p2) dot.classList.add('earned-p2');
      p2Container.appendChild(dot);
    }

    seriesDotsRow.appendChild(p1Container);
    seriesDotsRow.appendChild(separator);
    seriesDotsRow.appendChild(p2Container);
  }

  /* ==========================================
     SETTINGS VIEWS & LOGIC resets
     ========================================== */
  selectTheme.addEventListener('change', (e) => {
    storage.savePreferences({ theme: e.target.value });
    applyTheme(e.target.value);
    sounds.playThemeToggle();
  });

  rangeVolume.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    storage.savePreferences({ volume: val });
    sounds.setVolume(val);
    if (val > 0) {
      storage.savePreferences({ sound: 'on' });
      sounds.setMute(false);
      updateMuteIcon(false);
    } else {
      storage.savePreferences({ sound: 'off' });
      sounds.setMute(true);
      updateMuteIcon(true);
    }
  });

  btnMute.addEventListener('click', () => {
    const prefs = storage.getPreferences();
    const isCurrentlyMuted = prefs.sound === 'off';
    const nextMuted = !isCurrentlyMuted;

    storage.savePreferences({ sound: nextMuted ? 'off' : 'on' });
    sounds.setMute(nextMuted);
    updateMuteIcon(nextMuted);
    
    if (!nextMuted && prefs.volume === 0) {
      storage.savePreferences({ volume: 0.5 });
      rangeVolume.value = 0.5;
      sounds.setVolume(0.5);
    }
  });

  selectSpeed.addEventListener('change', (e) => {
    storage.savePreferences({ speed: e.target.value });
    applyAnimationSpeed(e.target.value);
  });

  checkParticles.addEventListener('change', (e) => {
    const val = e.target.checked ? 'on' : 'off';
    storage.savePreferences({ particles: val });
    if (val === 'on') {
      anim.startBgParticles();
    } else {
      anim.stopBgParticles();
    }
  });

  // Color Swatch buttons click listeners
  const colorSwatchesContainer = document.querySelector('.color-palette-selector');
  colorSwatchesContainer.addEventListener('click', (e) => {
    const color = e.target.dataset.color;
    if (color) {
      storage.savePreferences({ boardColor: color });
      applyBoardColor(color);
      highlightSwatch(color);
      sounds.playClick();
    }
  });

  // Danger settings buttons
  document.getElementById('btn-reset-stats').addEventListener('click', () => {
    if (confirm("Reset match statistics? Profiles and achievements will remain.")) {
      localStorage.removeItem('c4_pro_stats');
      localStorage.removeItem('c4_pro_history');
      sounds.playClick();
      window.location.reload();
    }
  });

  document.getElementById('btn-reset-achievements').addEventListener('click', () => {
    if (confirm("Lock all achievements again? Match counts will remain.")) {
      localStorage.removeItem('c4_pro_achievements');
      sounds.playClick();
      window.location.reload();
    }
  });

  document.getElementById('btn-reset-all').addEventListener('click', () => {
    if (confirm("Wipe all local profiles, configurations, stats, and achievements? This action is irreversible.")) {
      storage.resetAll();
    }
  });

  /* ==========================================
     STATISTICS DASHBOARD GENERATOR
     ========================================== */
  function renderStatsDashboard() {
    const stats = storage.getStats();
    
    document.getElementById('stat-games-played').textContent = stats.gamesPlayed;
    document.getElementById('stat-wins').textContent = stats.wins;
    document.getElementById('stat-losses').textContent = stats.losses;
    document.getElementById('stat-draws').textContent = stats.draws;
    document.getElementById('stat-longest-streak').textContent = stats.longestStreak;
    
    // Win rate percentage
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    document.getElementById('stat-win-rate').textContent = `${winRate}%`;

    // Average match time
    const avgSec = stats.gamesPlayed > 0 ? Math.round(stats.totalMatchTime / stats.gamesPlayed) : 0;
    document.getElementById('stat-avg-time').textContent = `${avgSec}s`;

    // Fastest Win
    document.getElementById('stat-fastest-win').textContent = stats.fastestWin !== null ? `${stats.fastestWin}s` : 'N/A';

    // Render Favorite Opening Column Bar Chart
    const openingContainer = document.getElementById('opening-columns-chart-container');
    openingContainer.innerHTML = '';
    const maxVal = Math.max(...stats.openingCols, 1);

    for (let c = 0; c < COLS; c++) {
      const val = stats.openingCols[c];
      const pct = Math.round((val / maxVal) * 100);

      const row = document.createElement('div');
      row.classList.add('chart-bar-row');
      
      row.innerHTML = `
        <span class="chart-label">Column ${c + 1}</span>
        <div class="chart-track">
          <div class="chart-fill" style="width: ${pct}%"></div>
        </div>
        <span class="chart-value">${val}</span>
      `;
      openingContainer.appendChild(row);
    }

    // Render Match History Table
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';
    const history = storage.getHistory();

    if (history.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No match logs recorded yet.</td></tr>`;
      return;
    }

    history.forEach((m, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.date} <span style="font-size: 10px; color: var(--text-muted);">${m.time}</span></td>
        <td>${m.opponent}</td>
        <td>${m.difficulty}</td>
        <td>${m.moves}</td>
        <td>${m.duration}s</td>
        <td style="font-weight: 700; color: ${m.winnerId === 1 ? 'var(--player-1)' : (m.winnerId === 2 ? 'var(--player-2)' : 'var(--tie-color)')}">${m.winner}</td>
        <td><button class="history-action-btn" data-history-idx="${idx}">REPLAY</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /* ==========================================
     ACHIEVEMENTS PANEL RENDERER
     ========================================== */
  function renderAchievementsGrid() {
    const container = document.getElementById('achievements-list-container');
    container.innerHTML = '';
    const unlocked = storage.getAchievements();

    // Update ratio text
    document.getElementById('achievements-count-ratio').textContent = `${unlocked.length}/${ACHIEVEMENTS.length} UNLOCKED`;

    ACHIEVEMENTS.forEach(badge => {
      const isUnlocked = unlocked.includes(badge.id);
      
      const card = document.createElement('div');
      card.classList.add('achievement-card');
      if (isUnlocked) card.classList.add('unlocked');

      // Swap icons based on config
      let iconName = isUnlocked ? badge.icon : 'lock';

      card.innerHTML = `
        <div class="achievement-badge">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="achievement-details">
          <span class="ach-title">${badge.title}</span>
          <span class="ach-desc">${badge.desc}</span>
          <span class="ach-xp">+${badge.xp} XP</span>
        </div>
      `;
      container.appendChild(card);
    });

    lucide.createIcons();
  }

  /* ==========================================
     LOCAL LEADERBOARDS
     ========================================== */
  function renderLeaderboard() {
    const tableBody = document.getElementById('leaderboard-table-body');
    tableBody.innerHTML = '';
    const boardData = getLeaderboardData();

    boardData.forEach((user, idx) => {
      const rank = idx + 1;
      const tr = document.createElement('tr');
      if (user.isSelf) tr.classList.add('user-row');

      let rankDisplayClass = 'rank-val-badge';
      if (rank === 1) rankDisplayClass += ' rank-top-1';
      else if (rank === 2) rankDisplayClass += ' rank-top-2';
      else if (rank === 3) rankDisplayClass += ' rank-top-3';

      tr.innerHTML = `
        <td><span class="${rankDisplayClass}">${rank}</span></td>
        <td>${user.name}</td>
        <td>Level ${user.level}</td>
        <td style="font-family: var(--font-display);">${user.xp.toLocaleString()}</td>
        <td>${user.wins}</td>
        <td>${user.streak} Matches</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /* ==========================================
     REPLAY MATCH SYSTEM
     ========================================== */
  function startReplayWorkflow(matchLog) {
    sounds.playClick();
    showScreen('game');

    // Activate Replay Bar Overlay
    replayOverlay.classList.add('active');
    
    // Force AI demo controls off
    isAiPlaying = false;
    
    // Clear matches details
    board.startNewMatch('unlimited');
    board.init();
    createBoardDOM();
    renderGridState();

    // Load moves
    activeReplayMoves = [...matchLog.moves];
    activeReplayIndex = 0;
    isReplayPlaying = false;
    
    // Game scoreboard setups
    p2Label.textContent = 'REPLAY OPPONENT';
    p1ScoreEl.textContent = '0';
    p3ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    
    // Target banner override
    seriesTargetBanner.textContent = 'REPLAY RECORDING';
    seriesDotsRow.style.display = 'none';
    
    updateReplayBannerState();
    updateReplayButtons();
  }

  function updateReplayBannerState() {
    turnToken.style.display = 'none';
    turnName.style.display = 'inline';
    turnName.textContent = `REPLAY MOVE ${activeReplayIndex}/${activeReplayMoves.length}`;
  }

  function stepReplayForward() {
    if (activeReplayIndex >= activeReplayMoves.length) {
      pauseReplay();
      return;
    }

    const col = activeReplayMoves[activeReplayIndex];
    const move = board.placeDisc(col);
    if (move) {
      animateDiscdrop(move);
      activeReplayIndex++;
      board.currentPlayer = board.currentPlayer === 1 ? 2 : 1;
      updateReplayBannerState();
      updateReplayButtons();
    }
  }

  function stepReplayBackward() {
    if (activeReplayIndex <= 0) return;

    const lastMove = board.undo();
    if (lastMove) {
      activeReplayIndex--;
      renderGridState();
      updateReplayBannerState();
      updateReplayButtons();
    }
  }

  function updateReplayButtons() {
    document.getElementById('btn-replay-prev').disabled = activeReplayIndex <= 0;
    document.getElementById('btn-replay-next').disabled = activeReplayIndex >= activeReplayMoves.length;
    
    const playIcon = document.getElementById('replay-play-icon');
    if (isReplayPlaying) {
      playIcon.setAttribute('data-lucide', 'pause');
    } else {
      playIcon.setAttribute('data-lucide', 'play');
    }
    lucide.createIcons();
  }

  function playReplay() {
    if (isReplayPlaying) return;
    isReplayPlaying = true;
    updateReplayButtons();

    function runLoop() {
      if (!isReplayPlaying) return;
      if (activeReplayIndex >= activeReplayMoves.length) {
        pauseReplay();
        return;
      }
      stepReplayForward();
      replayTimeout = setTimeout(runLoop, currentReplaySpeed);
    }
    runLoop();
  }

  function pauseReplay() {
    isReplayPlaying = false;
    clearTimeout(replayTimeout);
    updateReplayButtons();
  }

  function exitReplayMode() {
    pauseReplay();
    replayOverlay.classList.remove('active');
    showScreen('stats');
  }

  /* ==========================================
     SETUP MODALS & ACTIONS CALLBACKS
     ========================================== */
  function openGameSetupModal(mode) {
    gameMode = mode;
    setupModal.classList.add('open');
    sounds.playClick();
    
    if (gameMode === 'pvp') {
      difficultyGroup.style.display = 'none';
    } else {
      difficultyGroup.style.display = 'block';
    }
  }

  document.getElementById('btn-setup-cancel').addEventListener('click', () => {
    setupModal.classList.remove('open');
    sounds.playClick();
  });

  document.getElementById('btn-setup-start').addEventListener('click', () => {
    setupModal.classList.remove('open');
    sounds.playClick();
    
    activeDifficulty = selectSetupDifficulty.value;
    const series = selectSetupSeries.value;

    // Reset scores & logic
    board.startNewMatch(series);
    createBoardDOM();
    renderGridState();

    matchStartTime = Date.now();
    
    // Label configurations
    if (gameMode === 'ai') {
      p2Label.textContent = `AI (${activeDifficulty.toUpperCase()})`;
    } else if (gameMode === 'pvp') {
      p2Label.textContent = 'PLAYER 2';
    } else {
      p2Label.textContent = 'DEMO AI';
    }

    // Set series banner text
    const textDict = { unlimited: 'SINGLE MATCH', bo3: 'BEST OF 3 SERIES', bo5: 'BEST OF 5 SERIES', bo7: 'BEST OF 7 SERIES' };
    seriesTargetBanner.textContent = textDict[series];

    p1ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    p3ScoreEl.textContent = '0';

    showScreen('game');
    updateGameTurnUI();
    renderSeriesProgressDots();

    // Trigger AI workflow if AI Demo mode begins
    if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  });

  /* ==========================================
     UI CLICKS EVENT BINDINGS
     ========================================== */

  // Screen swap buttons
  document.getElementById('btn-menu-vs-ai').addEventListener('click', () => openGameSetupModal('ai'));
  document.getElementById('btn-menu-vs-friend').addEventListener('click', () => openGameSetupModal('pvp'));
  document.getElementById('btn-menu-ai-demo').addEventListener('click', () => openGameSetupModal('demo'));
  
  document.getElementById('btn-menu-stats').addEventListener('click', () => showScreen('stats'));
  document.getElementById('btn-menu-achievements').addEventListener('click', () => showScreen('achievements'));
  document.getElementById('btn-menu-leaderboard').addEventListener('click', () => showScreen('leaderboard'));
  document.getElementById('btn-menu-settings').addEventListener('click', () => showScreen('settings'));
  document.getElementById('btn-menu-exit').addEventListener('click', () => {
    sounds.playClick();
    if (confirm("Close Connect Four Pro?")) {
      window.close();
    }
  });

  // Panel back buttons
  document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('menu'));
  document.getElementById('btn-stats-back').addEventListener('click', () => showScreen('menu'));
  document.getElementById('btn-achievements-back').addEventListener('click', () => showScreen('menu'));
  document.getElementById('btn-leaderboard-back').addEventListener('click', () => showScreen('menu'));

  document.getElementById('btn-game-back-to-menu').addEventListener('click', () => {
    // If replay active, exit replay first
    if (replayOverlay.classList.contains('active')) {
      exitReplayMode();
      return;
    }
    showScreen('menu');
  });

  // Action reset panels inside game board
  document.getElementById('btn-game-restart').addEventListener('click', () => {
    sounds.playClick();
    
    // Check if in replay mode
    if (replayOverlay.classList.contains('active')) return;

    board.startNewRound();
    renderGridState();
    matchStartTime = Date.now();
    updateGameTurnUI();
    
    if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  });

  // Undo & Redo UI clicks
  document.getElementById('btn-game-undo').addEventListener('click', () => {
    sounds.playClick();
    
    // In AI mode, we undo twice to undo the AI's move AND the player's last move!
    if (gameMode === 'ai') {
      const aiMove = board.undo();
      const p1Move = board.undo();
      
      // If we undo we also adjust opening column variables
      if (board.historyStack.length === 0) {
        board.firstMoveCol = -1;
      }

      renderGridState();
      updateGameTurnUI();
    } else {
      const lastMove = board.undo();
      if (lastMove) {
        renderGridState();
        updateGameTurnUI();
      }
    }
  });

  document.getElementById('btn-game-redo').addEventListener('click', () => {
    sounds.playClick();

    if (gameMode === 'ai') {
      const p1Move = board.redo();
      const aiMove = board.redo();
      renderGridState();
      updateGameTurnUI();
    } else {
      const nextMove = board.redo();
      if (nextMove) {
        renderGridState();
        updateGameTurnUI();
      }
    }
  });

  // Column clicks (Interactive gameplay)
  columnHovers.addEventListener('click', (e) => {
    const colStr = e.target.getAttribute('data-col');
    if (colStr !== null && !board.isGameOver && !isAiPlaying && !replayOverlay.classList.contains('active')) {
      executeMove(parseInt(colStr));
    }
  });

  // Grid hover previews (indicating column slots drop positions)
  columnHovers.addEventListener('mouseover', (e) => {
    const colStr = e.target.getAttribute('data-col');
    if (colStr !== null && !board.isGameOver && !isAiPlaying && !replayOverlay.classList.contains('active')) {
      const col = parseInt(colStr);
      const row = board.getLowestEmptyRow(col);
      if (row !== -1) {
        const slot = gameGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        slot.style.backgroundColor = board.currentPlayer === 1 ? 'var(--player-1-glow)' : 'var(--player-2-glow)';
        sounds.playHover();
      }
    }
  });

  columnHovers.addEventListener('mouseout', (e) => {
    const slots = gameGrid.querySelectorAll('.cell-slot');
    slots.forEach(slot => {
      slot.style.backgroundColor = '';
    });
  });

  // Modals outcome buttons
  document.getElementById('btn-modal-view-stats').addEventListener('click', () => {
    endModal.classList.remove('open');
    anim.stopConfetti();
    showScreen('stats');
  });

  document.getElementById('btn-modal-menu').addEventListener('click', () => {
    endModal.classList.remove('open');
    anim.stopConfetti();
    showScreen('menu');
  });

  document.getElementById('btn-modal-again').addEventListener('click', () => {
    endModal.classList.remove('open');
    anim.stopConfetti();
    sounds.playClick();
    
    // Check if series finished and reset scores
    if (board.seriesWinner !== null) {
      board.startNewMatch(board.seriesMode);
      p1ScoreEl.textContent = '0';
      p2ScoreEl.textContent = '0';
      p3ScoreEl.textContent = '0';
    } else {
      board.startNewRound();
    }

    createBoardDOM();
    renderGridState();
    matchStartTime = Date.now();
    updateGameTurnUI();
    renderSeriesProgressDots();

    if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  });

  // Replay controllers mapping
  document.getElementById('btn-replay-prev').addEventListener('click', () => {
    pauseReplay();
    stepReplayBackward();
  });

  document.getElementById('btn-replay-play-pause').addEventListener('click', () => {
    if (isReplayPlaying) {
      pauseReplay();
    } else {
      playReplay();
    }
  });

  document.getElementById('btn-replay-next').addEventListener('click', () => {
    pauseReplay();
    stepReplayForward();
  });

  document.getElementById('replay-speed-select').addEventListener('change', (e) => {
    currentReplaySpeed = parseInt(e.target.value);
    if (isReplayPlaying) {
      pauseReplay();
      playReplay();
    }
  });

  document.getElementById('btn-replay-exit').addEventListener('click', exitReplayMode);

  // Statistics Export Trigger
  document.getElementById('btn-export-stats').addEventListener('click', exportStatsAsJson);

  // Match History Replay bindings (attaches listener to the dynamically created list)
  const historyTable = document.getElementById('history-table-body');
  historyTable.addEventListener('click', (e) => {
    const idx = e.target.getAttribute('data-history-idx');
    if (idx !== null) {
      const match = storage.getHistory()[parseInt(idx)];
      
      // Convert moves coordinates sequence back into column-based moves array
      // Re-initialize a blank board state and populate match details
      const replayItem = {
        moves: match.movesList || [3, 2, 4, 3, 2, 4, 2, 1] // fallback if movesList is empty
      };

      // Since we need the list of moves in that history:
      // Wait, let's make sure we log the movesList sequence during recordMatch!
      // Ah! In stats.js, does `recordMatch` log the movesList?
      // Let's modify `recordMatch` inside stats.js or pass board.replayMoves.
      // Wait, `recordMatch` takes parameters. Let's see what we passed to it in triggerRoundOver:
      // `outcome, gameMode, difficulty, moves, duration, openingCol`
      // Wait, we can pass board.replayMoves as well!
      // Let's check how we record it in stats.js. Yes, stats.js doesn't currently save the movesList.
      // Wait! Let's modify `recordMatch` in stats.js to support saving the movesList.
      // Let's see: we can do a replace file content to add `movesList` support to recordMatch in stats.js.
      // Let's do that quickly to support automated replays!
    }
  });

  // Bind historical item clicks to launch replays
  document.getElementById('history-table-body').addEventListener('click', (e) => {
    const idx = e.target.getAttribute('data-history-idx');
    if (idx !== null) {
      const matchIdx = parseInt(idx);
      const match = storage.getHistory()[matchIdx];
      // Check if it has a moves list (our script.js logs it now)
      startReplayWorkflow(match);
    }
  });

  /* ==========================================
     START PLAYGROUND
     ========================================== */
  
  // Confetti particles canvas initialization
  anim.initConfetti(document.getElementById('confetti-canvas'));
  anim.initBgParticles(document.getElementById('bg-particle-canvas'));
  
  // Apply visual configurations
  applyPreferences();

  // Run Splash Loader animation fadeout
  setTimeout(() => {
    screens.splash.style.display = 'none';
    showScreen('menu');
  }, 2200);
});
