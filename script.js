
import { storage } from './js/storage.js';
import { sounds } from './js/sound.js';
import { anim } from './js/animation.js';
import { BoardManager, ROWS, COLS } from './js/board.js';
import { ConnectFourAI } from './js/ai.js';
import { recordMatch, getLeaderboardData, exportStatsAsJson, getXpRequiredForLevel } from './js/stats.js';
import { ACHIEVEMENTS, checkAchievements } from './js/achievements.js';

document.addEventListener('DOMContentLoaded', () => {
  
  lucide.createIcons();

  const board = new BoardManager();
  const ai = new ConnectFourAI('medium');

  let gameMode = 'ai'; 
  let activeDifficulty = 'medium';
  let isAiPlaying = false;
  let matchStartTime = 0;

  let activeReplayIndex = 0;
  let activeReplayMoves = [];
  let isReplayPlaying = false;
  let replayTimeout = null;
  let currentReplaySpeed = 1500; 

  let historyPage = 1;
  const historyPageSize = 8;
  let filteredHistory = [];

  const body = document.body;
  const viewTitle = document.getElementById('view-title');
  const sidebar = document.getElementById('sidebar');

  const views = {
    dashboard: document.getElementById('view-dashboard'),
    play: document.getElementById('view-play'),
    stats: document.getElementById('view-stats'),
    achievements: document.getElementById('view-achievements'),
    history: document.getElementById('view-history'),
    profile: document.getElementById('view-profile'),
    settings: document.getElementById('view-settings')
  };

  const endModal = document.getElementById('end-modal');
  const replayOverlay = document.getElementById('replay-controls-overlay');
  const achievementToast = document.getElementById('achievement-toast');

  const gameSetupPanel = document.getElementById('game-setup-panel');
  const activeGameBoardWrapper = document.getElementById('active-game-board-wrapper');
  const activeGameControlsWrapper = document.getElementById('active-game-controls-wrapper');
  const selectSetupMode = document.getElementById('game-setup-mode-select');
  const selectSetupSeries = document.getElementById('game-setup-series-mode');
  const selectSetupDifficulty = document.getElementById('game-setup-difficulty-select');
  const setupDifficultyGroup = document.getElementById('game-setup-difficulty-group');
  const btnStartMatch = document.getElementById('btn-game-setup-start');

  const gameGrid = document.getElementById('game-board-grid');
  const columnHovers = document.getElementById('game-column-hovers');
  const turnCard = document.getElementById('game-turn-card');
  const turnToken = document.getElementById('game-turn-token');
  const turnName = document.getElementById('game-turn-name');
  const aiThinkingBox = document.getElementById('game-ai-thinking-box');
  const seriesTargetBanner = document.getElementById('game-series-target-banner');
  const seriesDotsRow = document.getElementById('game-series-dots-row');
  const localMoveLogsList = document.getElementById('local-move-logs-list');

  const p1ScoreEl = document.getElementById('game-p1-score');
  const tieScoreEl = document.getElementById('game-tie-score');
  const p2ScoreEl = document.getElementById('game-p2-score');
  const p2Label = document.getElementById('game-p2-label');
  const p2TokenPreview = document.getElementById('game-p2-token-preview');

  const selectTheme = document.getElementById('setting-theme');
  const selectSpeed = document.getElementById('setting-speed');
  const checkParticles = document.getElementById('setting-particles');
  const rangeVolume = document.getElementById('setting-volume');
  const btnSettingMute = document.getElementById('setting-mute-btn');
  const settingMuteIcon = document.getElementById('setting-mute-icon');

  const btnQuickMute = document.getElementById('quick-mute-btn');
  const quickMuteIcon = document.getElementById('quick-mute-icon');
  const btnQuickTheme = document.getElementById('quick-theme-btn');
  const quickThemeIcon = document.getElementById('quick-theme-icon');

  function navigateTo(targetKey) {
    sounds.playClick();

    anim.stopBgParticles();

    Object.keys(views).forEach(key => {
      if (key === targetKey) {
        views[key].style.display = targetKey === 'play' ? 'grid' : 'flex';
        
        const cards = views[key].querySelectorAll('.stagger-in');
        cards.forEach(card => {
          card.style.animation = 'none';
          card.offsetHeight; 
          card.style.animation = '';
        });
      } else {
        views[key].style.display = 'none';
      }
    });

    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.target === targetKey) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const titleDict = {
      dashboard: 'DASHBOARD OVERVIEW',
      play: 'PLAY CONNECT FOUR',
      stats: 'STATISTICS & ANALYTICS',
      achievements: 'BADGES & HONORS',
      history: 'COMPLETE MATCH RECORD',
      profile: 'PLAYER DOSSIER',
      settings: 'SYSTEM PREFERENCES'
    };
    viewTitle.textContent = titleDict[targetKey] || 'CONNECT FOUR PRO';

    if (targetKey === 'dashboard') {
      const prefs = storage.getPreferences();
      if (prefs.particles === 'on') anim.startBgParticles();
      renderDashboard();
    } else if (targetKey === 'play') {
      renderPlayScreenState();
    } else if (targetKey === 'stats') {
      renderStatsScreen();
    } else if (targetKey === 'achievements') {
      renderAchievementsScreen();
    } else if (targetKey === 'history') {
      historyPage = 1;
      applyHistoryFilters();
    } else if (targetKey === 'profile') {
      renderProfileScreen();
    }

    updateSidebarProfileDetails();
  }

  function updateSidebarProfileDetails() {
    const profile = storage.getProfile();
    const xpMax = getXpRequiredForLevel(profile.level);
    
    document.getElementById('pq-username-display').textContent = `LVL ${profile.level} - ${profile.rank}`;
    document.getElementById('pq-xp-display').textContent = `${profile.xp}/${xpMax} XP`;
    document.getElementById('top-nav-lvl-badge').textContent = profile.level;
  }

  function applyPreferences() {
    const prefs = storage.getPreferences();

    applyTheme(prefs.theme);
    selectTheme.value = prefs.theme;

    sounds.setVolume(prefs.volume);
    rangeVolume.value = prefs.volume;
    const isMuted = prefs.sound === 'off';
    sounds.setMute(isMuted);
    updateAudioMuteUI(isMuted);

    applyAnimationSpeed(prefs.speed);
    selectSpeed.value = prefs.speed;

    checkParticles.checked = prefs.particles === 'on';
    if (prefs.particles === 'on' && views.dashboard.style.display !== 'none') {
      anim.startBgParticles();
    }

    applyBoardColor(prefs.boardColor);
    highlightSwatch(prefs.boardColor);
  }

  function applyTheme(theme) {
    body.classList.remove('light-mode', 'dark-theme-forced', 'system-theme-active');
    
    if (theme === 'light') {
      body.classList.add('light-mode', 'dark-theme-forced');
      quickThemeIcon.setAttribute('data-lucide', 'moon');
    } else if (theme === 'dark') {
      body.classList.add('dark-theme-forced');
      quickThemeIcon.setAttribute('data-lucide', 'sun');
    } else {
      body.classList.add('system-theme-active');
      
      const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      quickThemeIcon.setAttribute('data-lucide', isSystemLight ? 'moon' : 'sun');
    }
    lucide.createIcons();
  }

  function applyAnimationSpeed(speed) {
    let factor = 1;
    if (speed === 'slow') factor = 2.0;
    if (speed === 'fast') factor = 0.45;
    document.documentElement.style.setProperty('--anim-speed-factor', factor);
  }

  function applyBoardColor(colorHex) {
    document.documentElement.style.setProperty('--board-color', colorHex);
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

  function updateAudioMuteUI(isMuted) {
    const muteAttr = isMuted ? 'volume-x' : 'volume-2';
    settingMuteIcon.setAttribute('data-lucide', muteAttr);
    quickMuteIcon.setAttribute('data-lucide', muteAttr);
    lucide.createIcons();
  }

  function renderDashboard() {
    const profile = storage.getProfile();
    const stats = storage.getStats();
    const history = storage.getHistory();
    const unlocked = storage.getAchievements();

    const xpMax = getXpRequiredForLevel(profile.level);
    document.getElementById('dash-profile-lvl-text').textContent = `LEVEL ${profile.level}`;
    document.getElementById('dash-profile-rank-text').textContent = profile.rank.toUpperCase();
    document.getElementById('dash-profile-lvl-num').textContent = profile.level;
    document.getElementById('dash-profile-xp-curr').textContent = profile.xp;
    document.getElementById('dash-profile-xp-max').textContent = xpMax;
    document.getElementById('dash-profile-xp-fill-bar').style.width = `${Math.min((profile.xp / xpMax) * 100, 100)}%`;

    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    document.getElementById('dash-win-rate-display').textContent = `${winRate}%`;
    document.getElementById('dash-longest-streak-display').textContent = `Longest Streak: ${stats.longestStreak} Wins`;

    document.getElementById('dash-games-played').textContent = stats.gamesPlayed;
    document.getElementById('dash-wins').textContent = stats.wins;
    document.getElementById('dash-losses').textContent = stats.losses;
    document.getElementById('dash-draws').textContent = stats.draws;

    const trendContainer = document.getElementById('dash-win-trend-container');
    trendContainer.innerHTML = '';
    const last10 = history.slice(0, 10).reverse(); 

    if (last10.length === 0) {
      trendContainer.innerHTML = `<span style="position: absolute; top: 40%; left: 10%; font-size: 12px; color: var(--text-muted);">No match trend logs recorded yet.</span>`;
    } else {
      last10.forEach(m => {
        const bar = document.createElement('div');
        bar.classList.add('trend-point');

        const pct = Math.max(Math.min((m.moves / 42) * 100, 100), 15);
        bar.style.height = `${pct}%`;

        if (m.winnerId === 1) {
          bar.style.background = 'linear-gradient(180deg, var(--player-1) 0%, rgba(255, 62, 108, 0.1) 100%)';
          bar.style.boxShadow = '0 0 6px var(--player-1-glow)';
        } else if (m.winnerId === 2) {
          bar.style.background = 'linear-gradient(180deg, var(--player-2) 0%, rgba(0, 240, 255, 0.1) 100%)';
          bar.style.boxShadow = '0 0 6px var(--player-2-glow)';
        } else {
          bar.style.background = 'linear-gradient(180deg, var(--tie-color) 0%, rgba(255, 184, 0, 0.1) 100%)';
          bar.style.boxShadow = '0 0 6px var(--tie-glow)';
        }
        
        trendContainer.appendChild(bar);
      });
    }

    renderOpeningColumnsChart('dash-opening-columns-chart-container');

    const matchesContainer = document.getElementById('dash-recent-matches-container');
    matchesContainer.innerHTML = '';
    const last5Matches = history.slice(0, 5);

    if (last5Matches.length === 0) {
      matchesContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 0;">No matches played yet.</span>`;
    } else {
      last5Matches.forEach(m => {
        const row = document.createElement('div');
        row.classList.add('dash-match-row');
        
        let outcomeColor = 'var(--tie-color)';
        let outcomeText = 'DRAW';
        if (m.winnerId === 1) {
          outcomeColor = 'var(--player-1)';
          outcomeText = 'VICTORY';
        } else if (m.winnerId === 2) {
          outcomeColor = 'var(--player-2)';
          outcomeText = 'DEFEAT';
        }

        row.innerHTML = `
          <div class="match-row-meta">
            <span class="m-row-opponent">${m.opponent}</span>
            <span class="m-row-date">${m.date} • ${m.moves} moves</span>
          </div>
          <span class="m-row-outcome" style="color: ${outcomeColor};">${outcomeText}</span>
        `;
        matchesContainer.appendChild(row);
      });
    }

    const achievementsContainer = document.getElementById('dash-recent-achievements-container');
    achievementsContainer.innerHTML = '';

    const last4UnlockedIds = unlocked.slice(-4).reverse();

    if (last4UnlockedIds.length === 0) {
      achievementsContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 0;">No achievements unlocked yet.</span>`;
    } else {
      last4UnlockedIds.forEach(id => {
        const badge = ACHIEVEMENTS.find(b => b.id === id);
        if (badge) {
          const row = document.createElement('div');
          row.classList.add('dash-achievement-row');
          row.innerHTML = `
            <div class="dash-ach-badge">
              <i data-lucide="${badge.icon}"></i>
            </div>
            <div class="dash-ach-info">
              <span class="dash-ach-title">${badge.title}</span>
              <span class="dash-ach-desc">${badge.desc}</span>
            </div>
          `;
          achievementsContainer.appendChild(row);
        }
      });
      lucide.createIcons();
    }
  }

  function renderOpeningColumnsChart(containerId) {
    const stats = storage.getStats();
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const maxVal = Math.max(...stats.openingCols, 1);

    for (let c = 0; c < COLS; c++) {
      const val = stats.openingCols[c];
      const pct = Math.round((val / maxVal) * 100);

      const row = document.createElement('div');
      row.classList.add('chart-bar-row');
      
      row.innerHTML = `
        <span class="chart-label">Col ${c + 1}</span>
        <div class="chart-track">
          <div class="chart-fill" style="width: ${pct}%"></div>
        </div>
        <span class="chart-value">${val}</span>
      `;
      container.appendChild(row);
    }
  }

  function renderPlayScreenState() {
    const isGameActive = board.historyStack.length > 0 && !board.isGameOver;
    
    if (isGameActive) {
      gameSetupPanel.style.display = 'none';
      activeGameBoardWrapper.style.display = 'flex';
      activeGameControlsWrapper.style.display = 'flex';
    } else {
      gameSetupPanel.style.display = 'block';
      activeGameBoardWrapper.style.display = 'none';
      activeGameControlsWrapper.style.display = 'none';
    }
  }

  btnStartMatch.addEventListener('click', () => {
    gameMode = selectSetupMode.value;
    activeDifficulty = selectSetupDifficulty.value;
    const series = selectSetupSeries.value;

    sounds.playClick();

    board.startNewMatch(series);
    createBoardDOM();
    renderGridState();

    matchStartTime = Date.now();
    localMoveLogsList.innerHTML = '';

    if (gameMode === 'ai') {
      p2Label.innerHTML = `<div class="token-preview player-2-color"></div> AI (${activeDifficulty.toUpperCase()})`;
    } else if (gameMode === 'pvp') {
      p2Label.innerHTML = `<div class="token-preview player-2-color"></div> Player 2`;
    } else {
      p2Label.innerHTML = `<div class="token-preview player-2-color"></div> DEMO AI`;
    }

    const seriesTextDict = {
      unlimited: 'SINGLE ROUND MATCH',
      bo3: 'BEST OF 3 SERIES',
      bo5: 'BEST OF 5 SERIES',
      bo7: 'BEST OF 7 SERIES'
    };
    seriesTargetBanner.textContent = seriesTextDict[series];

    p1ScoreEl.textContent = '0';
    tieScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';

    renderPlayScreenState();
    updateGameTurnUI();
    renderSeriesProgressDots();

    if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  });

  document.getElementById('btn-game-resign').addEventListener('click', () => {
    sounds.playClick();
    if (confirm("Resign this match series? Any progress in the current round will be lost.")) {
      board.isGameOver = true;
      board.startNewMatch('unlimited');
      renderPlayScreenState();
    }
  });

  function renderStatsScreen() {
    const stats = storage.getStats();
    
    document.getElementById('substats-games-played').textContent = stats.gamesPlayed;
    document.getElementById('substats-wins').textContent = stats.wins;
    document.getElementById('substats-losses').textContent = stats.losses;
    document.getElementById('substats-draws').textContent = stats.draws;
    document.getElementById('substats-longest-streak').textContent = stats.longestStreak;

    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    document.getElementById('substats-win-rate').textContent = `${winRate}%`;

    const avgSec = stats.gamesPlayed > 0 ? Math.round(stats.totalMatchTime / stats.gamesPlayed) : 0;
    document.getElementById('substats-avg-time').textContent = `${avgSec}s`;

    document.getElementById('substats-fastest-win').textContent = stats.fastestWin !== null ? `${stats.fastestWin}s` : 'N/A';

    renderOpeningColumnsChart('substats-opening-columns-chart-container');
  }

  function renderAchievementsScreen() {
    const grid = document.getElementById('substats-achievements-grid');
    grid.innerHTML = '';
    const unlocked = storage.getAchievements();

    document.getElementById('substats-achievements-ratio').textContent = `${unlocked.length}/${ACHIEVEMENTS.length} UNLOCKED`;

    ACHIEVEMENTS.forEach(badge => {
      const isUnlocked = unlocked.includes(badge.id);
      
      const card = document.createElement('div');
      card.classList.add('achievement-card', isUnlocked ? 'unlocked' : 'locked');

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
      grid.appendChild(card);
    });

    lucide.createIcons();
  }

  function applyHistoryFilters() {
    const query = document.getElementById('history-search-input').value.toLowerCase().trim();
    const outcomeFilter = document.getElementById('history-filter-outcome').value;
    const rawHistory = storage.getHistory();

    filteredHistory = rawHistory.filter(m => {
      
      if (outcomeFilter === 'win' && m.winnerId !== 1) return false;
      if (outcomeFilter === 'loss' && m.winnerId !== 2) return false;
      if (outcomeFilter === 'draw' && m.winnerId !== 'tie') return false;

      if (query !== '') {
        const matchesDate = m.date.toLowerCase().includes(query);
        const matchesOpponent = m.opponent.toLowerCase().includes(query);
        const matchesWinner = m.winner.toLowerCase().includes(query);
        return matchesDate || matchesOpponent || matchesWinner;
      }
      
      return true;
    });

    historyPage = 1;
    renderHistoryTable();
  }

  function renderHistoryTable() {
    const tableBody = document.getElementById('substats-history-table-body');
    tableBody.innerHTML = '';

    const totalEntries = filteredHistory.length;
    const startIdx = (historyPage - 1) * historyPageSize;
    const endIdx = Math.min(startIdx + historyPageSize, totalEntries);
    const paginatedMatches = filteredHistory.slice(startIdx, endIdx);

    document.getElementById('btn-history-page-prev').disabled = historyPage <= 1;
    document.getElementById('btn-history-page-next').disabled = endIdx >= totalEntries;

    const statsText = totalEntries > 0 
      ? `Showing ${startIdx + 1}-${endIdx} of ${totalEntries} entries`
      : 'Showing 0-0 of 0 entries';
    document.getElementById('history-pagination-stats').textContent = statsText;

    if (totalEntries === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px 0;">No matching history logs found.</td></tr>`;
      return;
    }

    paginatedMatches.forEach((m, idx) => {
      
      const overallIndex = startIdx + idx;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.date} <span style="font-size: 10px; color: var(--text-muted);">${m.time}</span></td>
        <td>${m.opponent}</td>
        <td>${m.difficulty}</td>
        <td>${m.moves} Placements</td>
        <td>${m.duration}s</td>
        <td style="font-weight: 700; color: ${m.winnerId === 1 ? 'var(--player-1)' : (m.winnerId === 2 ? 'var(--player-2)' : 'var(--tie-color)')}">${m.winner}</td>
        <td style="text-align: right;"><button class="history-action-btn" data-history-idx="${overallIndex}">REPLAY</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  document.getElementById('history-search-input').addEventListener('input', applyHistoryFilters);
  document.getElementById('history-filter-outcome').addEventListener('change', applyHistoryFilters);

  document.getElementById('btn-history-page-prev').addEventListener('click', () => {
    if (historyPage > 1) {
      historyPage--;
      sounds.playClick();
      renderHistoryTable();
    }
  });

  document.getElementById('btn-history-page-next').addEventListener('click', () => {
    const totalEntries = filteredHistory.length;
    if (historyPage * historyPageSize < totalEntries) {
      historyPage++;
      sounds.playClick();
      renderHistoryTable();
    }
  });

  document.getElementById('btn-history-export').addEventListener('click', exportStatsAsJson);

  function renderProfileScreen() {
    const profile = storage.getProfile();
    const stats = storage.getStats();
    const history = storage.getHistory();
    const unlocked = storage.getAchievements();

    const xpMax = getXpRequiredForLevel(profile.level);
    document.getElementById('profile-lvl-banner').textContent = `LEVEL ${profile.level}`;
    document.getElementById('profile-rank-banner').textContent = profile.rank.toUpperCase();
    document.getElementById('profile-xp-curr-num').textContent = `${profile.xp} XP`;
    document.getElementById('profile-xp-max-num').textContent = `${xpMax} XP`;
    document.getElementById('profile-xp-fill-bar').style.width = `${Math.min((profile.xp / xpMax) * 100, 100)}%`;

    document.getElementById('profile-games-played').textContent = stats.gamesPlayed;
    
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    document.getElementById('profile-win-rate').textContent = `${winRate}%`;
    document.getElementById('profile-longest-streak').textContent = `${stats.longestStreak} Wins`;

    const maxVal = Math.max(...stats.openingCols);
    const favColIdx = stats.openingCols.indexOf(maxVal);
    document.getElementById('profile-fav-col').textContent = maxVal > 0 ? `Column ${favColIdx + 1}` : 'N/A';

    const aiGames = history.filter(m => m.opponent.includes('AI')).length;
    const pvpGames = history.filter(m => m.opponent.includes('Friend')).length;
    let favMode = 'N/A';
    if (aiGames > 0 || pvpGames > 0) {
      favMode = aiGames >= pvpGames ? 'VS Computer AI' : 'Local Multiplayer';
    }
    document.getElementById('profile-fav-mode').textContent = favMode;
    document.getElementById('profile-badges-unlocked').textContent = `${unlocked.length} / ${ACHIEVEMENTS.length} Badges`;

    const gallery = document.getElementById('profile-unlocked-badges-container');
    gallery.innerHTML = '';

    ACHIEVEMENTS.slice(0, 12).forEach(badge => {
      const isUnlocked = unlocked.includes(badge.id);
      const cell = document.createElement('div');
      cell.classList.add('achievement-card');
      cell.style.padding = '8px 12px';
      cell.style.gap = '10px';
      if (!isUnlocked) {
        cell.style.filter = 'grayscale(1) opacity(0.3)';
      } else {
        cell.style.borderColor = 'rgba(0, 240, 255, 0.2)';
      }

      cell.innerHTML = `
        <div class="dash-ach-badge" style="width: 26px; height: 26px; ${isUnlocked ? '' : 'background: rgba(255,255,255,0.02); color: var(--text-muted);'}">
          <i data-lucide="${isUnlocked ? badge.icon : 'lock'}" style="width: 12px; height: 12px;"></i>
        </div>
        <span style="font-size: 11px; font-weight: 700; color: ${isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)'};">${badge.title}</span>
      `;
      gallery.appendChild(cell);
    });

    lucide.createIcons();
  }

  const sidebarNavContainer = sidebar.querySelector('.sidebar-nav');
  sidebarNavContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) {
      const target = btn.getAttribute('data-target');
      navigateTo(target);
    }
  });

  document.getElementById('sidebar-profile-link').addEventListener('click', () => {
    navigateTo('profile');
  });

  btnQuickMute.addEventListener('click', () => {
    const prefs = storage.getPreferences();
    const isCurrentlyMuted = prefs.sound === 'off';
    const nextMuted = !isCurrentlyMuted;

    storage.savePreferences({ sound: nextMuted ? 'off' : 'on' });
    sounds.setMute(nextMuted);
    updateAudioMuteUI(nextMuted);
    
    if (!nextMuted && prefs.volume === 0) {
      storage.savePreferences({ volume: 0.5 });
      rangeVolume.value = 0.5;
      sounds.setVolume(0.5);
    }
    sounds.playClick();
  });

  btnQuickTheme.addEventListener('click', () => {
    const prefs = storage.getPreferences();
    const nextTheme = prefs.theme === 'dark' ? 'light' : 'dark';
    
    storage.savePreferences({ theme: nextTheme });
    applyTheme(nextTheme);
    sounds.playThemeToggle();

    selectTheme.value = nextTheme;
  });

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
    slot.innerHTML = '';

    const chip = document.createElement('div');
    chip.classList.add('chip', move.player === 1 ? 'p1' : 'p2', 'chip-animate-drop');
    slot.appendChild(chip);
    sounds.playDrop();

    const logItem = document.createElement('li');
    logItem.classList.add('local-log-item');
    logItem.innerHTML = `
      <span>Move ${board.historyStack.length}: P${move.player}</span>
      <span>Col ${move.col + 1}, Row ${ROWS - move.row}</span>
    `;
    localMoveLogsList.appendChild(logItem);
    localMoveLogsList.parentElement.scrollTop = localMoveLogsList.parentElement.scrollHeight;

    setTimeout(() => {
      chip.classList.remove('chip-animate-drop');
    }, 550 * parseFloat(document.documentElement.style.getPropertyValue('--anim-speed-factor') || 1));

    updateUndoRedoButtonState();
  }

  function updateUndoRedoButtonState() {
    document.getElementById('btn-game-undo').disabled = board.historyStack.length === 0;
    document.getElementById('btn-game-redo').disabled = board.redoStack.length === 0;
  }

  function executeMove(col) {
    if (board.isGameOver || isAiPlaying) return;

    if (board.historyStack.length === 0) {
      board.firstMoveCol = col;
    }

    const move = board.placeDisc(col);
    if (!move) return;

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

    board.currentPlayer = board.currentPlayer === 1 ? 2 : 1;
    updateGameTurnUI();

    if (gameMode === 'ai' && board.currentPlayer === 2) {
      triggerAiWorkflow();
    } else if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  }

  function updateGameTurnUI() {
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

    turnToken.style.display = 'none';
    turnName.style.display = 'none';
    aiThinkingBox.style.display = 'flex';

    const speed = storage.getPreferences().speed;
    const thinkingDelay = speed === 'slow' ? 2400 : (speed === 'fast' ? 400 : 1200);

    setTimeout(() => {
      if (gameMode === 'demo') {
        const diff = board.currentPlayer === 1 ? 'easy' : 'impossible';
        ai.setDifficulty(diff);
      } else {
        ai.setDifficulty(activeDifficulty);
      }

      const bestMove = ai.getMove(board.grid, 1, 2);
      
      aiThinkingBox.style.display = 'none';
      isAiPlaying = false;

      if (bestMove !== -1) {
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

          board.currentPlayer = board.currentPlayer === 1 ? 2 : 1;
          updateGameTurnUI();

          if (gameMode === 'demo') {
            triggerAiWorkflow();
          }
        }
      }
    }, thinkingDelay);
  }

  function triggerRoundOver(result) {
    board.isGameOver = true;
    anim.triggerCameraShake(document.getElementById('physical-board-container'));

    const duration = Math.floor((Date.now() - matchStartTime) / 1000);
    const summary = board.recordRoundOutcome(result.winner);
    
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

    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
      newAchievements.forEach((badge, index) => {
        setTimeout(() => triggerAchievementToast(badge), (index + 1) * 1600);
      });
    }

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
      modalDesc.textContent = "A very close match ends in a draw.";
    } else if (outcome === 'p1') {
      modalGlow.style.background = 'var(--player-1)';
      modalIcon.setAttribute('data-lucide', 'trophy');
      modalTitle.textContent = board.seriesWinner === 1 ? "SERIES CHAMPION!" : "PLAYER 1 WINS!";
      modalTitle.style.color = 'var(--player-1)';
      modalDesc.textContent = board.seriesWinner === 1 ? "You have dominated this matches series!" : "A tactical victory in this round.";
    } else {
      modalGlow.style.background = 'var(--player-2)';
      modalIcon.setAttribute('data-lucide', 'award');
      modalTitle.textContent = board.seriesWinner === 2 ? "SERIES DEFEAT!" : (gameMode === 'ai' ? "COMPUTER WINS!" : "PLAYER 2 WINS!");
      modalTitle.style.color = 'var(--player-2)';
      modalDesc.textContent = gameMode === 'ai' ? "The Minimax calculation paths outsmarted your placements." : "A crushing placement victory.";
    }

    lucide.createIcons();

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

  function startReplayWorkflow(matchLog) {
    sounds.playClick();
    navigateTo('play');

    gameSetupPanel.style.display = 'none';
    activeGameBoardWrapper.style.display = 'flex';
    activeGameControlsWrapper.style.display = 'flex';

    replayOverlay.classList.add('active');
    
    isAiPlaying = false;
    board.startNewMatch('unlimited');
    board.init();
    createBoardDOM();
    renderGridState();

    activeReplayMoves = [...matchLog.movesList];
    activeReplayIndex = 0;
    isReplayPlaying = false;
    localMoveLogsList.innerHTML = '';
    
    p2Label.innerHTML = `<div class="token-preview player-2-color"></div> REPLAY OPPONENT`;
    p1ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    tieScoreEl.textContent = '0';
    
    seriesTargetBanner.textContent = 'AUTOMATED RECORD REPLAY';
    seriesDotsRow.style.display = 'none';
    
    updateReplayBannerState();
    updateReplayButtons();
  }

  function updateReplayBannerState() {
    turnToken.style.display = 'none';
    turnName.style.display = 'inline';
    turnName.textContent = `REPLAY PLACEMENT ${activeReplayIndex}/${activeReplayMoves.length}`;
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

      if (localMoveLogsList.lastChild) {
        localMoveLogsList.removeChild(localMoveLogsList.lastChild);
      }

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
    navigateTo('history');
  }

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
      updateAudioMuteUI(false);
    } else {
      storage.savePreferences({ sound: 'off' });
      sounds.setMute(true);
      updateAudioMuteUI(true);
    }
  });

  btnSettingMute.addEventListener('click', () => {
    const prefs = storage.getPreferences();
    const isCurrentlyMuted = prefs.sound === 'off';
    const nextMuted = !isCurrentlyMuted;

    storage.savePreferences({ sound: nextMuted ? 'off' : 'on' });
    sounds.setMute(nextMuted);
    updateAudioMuteUI(nextMuted);
    
    if (!nextMuted && prefs.volume === 0) {
      storage.savePreferences({ volume: 0.5 });
      rangeVolume.value = 0.5;
      sounds.setVolume(0.5);
    }
    sounds.playClick();
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

  const swatches = document.querySelector('.color-palette-selector');
  swatches.addEventListener('click', (e) => {
    const color = e.target.dataset.color;
    if (color) {
      storage.savePreferences({ boardColor: color });
      applyBoardColor(color);
      highlightSwatch(color);
      sounds.playClick();
    }
  });

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
    if (confirm("Wipe all local profiles, stats, and achievements? This action is irreversible.")) {
      storage.resetAll();
    }
  });

  columnHovers.addEventListener('click', (e) => {
    const colStr = e.target.getAttribute('data-col');
    if (colStr !== null && !board.isGameOver && !isAiPlaying && !replayOverlay.classList.contains('active')) {
      executeMove(parseInt(colStr));
    }
  });

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

  document.getElementById('btn-game-undo').addEventListener('click', () => {
    sounds.playClick();
    if (gameMode === 'ai') {
      const aiMove = board.undo();
      const p1Move = board.undo();

      if (board.historyStack.length === 0) {
        board.firstMoveCol = -1;
      }

      if (localMoveLogsList.lastChild) localMoveLogsList.removeChild(localMoveLogsList.lastChild);
      if (localMoveLogsList.lastChild) localMoveLogsList.removeChild(localMoveLogsList.lastChild);

      renderGridState();
      updateGameTurnUI();
    } else {
      const lastMove = board.undo();
      if (lastMove) {
        if (localMoveLogsList.lastChild) localMoveLogsList.removeChild(localMoveLogsList.lastChild);
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
      
      if (p1Move) {
        const l1 = document.createElement('li');
        l1.classList.add('local-log-item');
        l1.innerHTML = `<span>Move ${board.historyStack.length - 1}: P1</span><span>Col ${p1Move.col + 1}</span>`;
        localMoveLogsList.appendChild(l1);
      }
      if (aiMove) {
        const l2 = document.createElement('li');
        l2.classList.add('local-log-item');
        l2.innerHTML = `<span>Move ${board.historyStack.length}: P2</span><span>Col ${aiMove.col + 1}</span>`;
        localMoveLogsList.appendChild(l2);
      }
      localMoveLogsList.parentElement.scrollTop = localMoveLogsList.parentElement.scrollHeight;

      renderGridState();
      updateGameTurnUI();
    } else {
      const nextMove = board.redo();
      if (nextMove) {
        const l = document.createElement('li');
        l.classList.add('local-log-item');
        l.innerHTML = `<span>Move ${board.historyStack.length}: P${nextMove.player}</span><span>Col ${nextMove.col + 1}</span>`;
        localMoveLogsList.appendChild(l);
        localMoveLogsList.parentElement.scrollTop = localMoveLogsList.parentElement.scrollHeight;

        renderGridState();
        updateGameTurnUI();
      }
    }
  });

  document.getElementById('btn-game-restart').addEventListener('click', () => {
    sounds.playClick();
    if (replayOverlay.classList.contains('active')) return;

    board.startNewRound();
    renderGridState();
    matchStartTime = Date.now();
    localMoveLogsList.innerHTML = '';
    updateGameTurnUI();
    
    if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  });

  document.getElementById('btn-modal-view-stats').addEventListener('click', () => {
    endModal.classList.remove('open');
    anim.stopConfetti();
    navigateTo('stats');
  });

  document.getElementById('btn-modal-menu').addEventListener('click', () => {
    endModal.classList.remove('open');
    anim.stopConfetti();
    navigateTo('dashboard');
  });

  document.getElementById('btn-modal-again').addEventListener('click', () => {
    endModal.classList.remove('open');
    anim.stopConfetti();
    sounds.playClick();
    
    if (board.seriesWinner !== null) {
      board.startNewMatch(board.seriesMode);
      p1ScoreEl.textContent = '0';
      p2ScoreEl.textContent = '0';
      tieScoreEl.textContent = '0';
    } else {
      board.startNewRound();
    }

    createBoardDOM();
    renderGridState();
    matchStartTime = Date.now();
    localMoveLogsList.innerHTML = '';
    updateGameTurnUI();
    renderSeriesProgressDots();

    if (gameMode === 'demo') {
      triggerAiWorkflow();
    }
  });

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

  const substatsTable = document.getElementById('substats-history-table-body');
  substatsTable.addEventListener('click', (e) => {
    const idx = e.target.getAttribute('data-history-idx');
    if (idx !== null) {
      const matchIdx = parseInt(idx);
      const match = filteredHistory[matchIdx];
      startReplayWorkflow(match);
    }
  });

  window.addEventListener('keydown', (e) => {
    
    if (views.play.style.display !== 'none' && !board.isGameOver && !isAiPlaying && !replayOverlay.classList.contains('active')) {
      const key = e.key;
      if (key >= '1' && key <= '7') {
        const col = parseInt(key) - 1;
        executeMove(col);
      }
    }
  });

  selectSetupMode.addEventListener('change', (e) => {
    if (e.target.value === 'pvp') {
      setupDifficultyGroup.style.display = 'none';
    } else {
      setupDifficultyGroup.style.display = 'block';
    }
  });

  anim.initConfetti(document.getElementById('confetti-canvas'));
  anim.initBgParticles(document.getElementById('bg-particle-canvas'));
  
  applyPreferences();

  setTimeout(() => {
    screens.splash.style.display = 'none';
    navigateTo('dashboard');
  }, 2200);
});
