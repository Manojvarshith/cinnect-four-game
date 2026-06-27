import { storage } from './storage.js';

export function getStats() {
  return storage.getStats();
}

export function clearAllData() {
  storage.resetAll();
}

export function getLeaderboard() {
  return getLeaderboardData();
}

export function getXpRequiredForLevel(level) {
  return level * 1000;
}

export function addXp(amount) {
  return storage.addXP(amount);
}

function getRankTitle(level) {
  if (level >= 20) return 'Connect Master';
  if (level >= 15) return 'Diamond General';
  if (level >= 10) return 'Platinum Major';
  if (level >= 6)  return 'Gold Sergeant';
  if (level >= 3)  return 'Silver Corporal';
  return 'Bronze Cadet';
}

export function recordMatch(winner, gameMode, difficulty, movesCount, durationSec, openingCol, movesList = []) {
  const stats = storage.getStats();
  const history = storage.getHistory();
  
  stats.gamesPlayed++;
  stats.totalMatchTime += durationSec;

  if (openingCol >= 0 && openingCol < 7) {
    stats.openingCols[openingCol]++;
  }

  let outcome = 'draw'; 
  if (winner === 1) {
    outcome = 'win';
    stats.wins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
  } else if (winner === 2) {
    outcome = 'loss';
    stats.losses++;
    stats.currentStreak = 0;
  } else {
    stats.draws++;
    stats.currentStreak = 0;
  }

  if (winner === 1) {
    if (stats.fastestWin === null || durationSec < stats.fastestWin) {
      stats.fastestWin = durationSec;
    }
  }

  updateDailyStreak(stats);
  storage.saveStats(stats);

  const newMatch = {
    id: 'match_' + Date.now(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    winner: winner === 1 ? 'Player 1' : (winner === 2 ? (gameMode === 'ai' ? `AI (${difficulty})` : 'Player 2') : 'Draw'),
    winnerId: winner,
    opponent: gameMode === 'ai' ? `AI (${difficulty})` : 'Local Friend',
    difficulty: gameMode === 'ai' ? difficulty : 'N/A',
    moves: movesCount,
    duration: durationSec,
    movesList: [...movesList]
  };
  
  history.unshift(newMatch); 
  if (history.length > 50) history.pop(); 
  storage.saveHistory(history);

  let xpGained = 0;
  if (outcome === 'win') {
    if (gameMode === 'ai') {
      if (difficulty === 'easy') xpGained = 100;
      else if (difficulty === 'medium') xpGained = 200;
      else if (difficulty === 'hard') xpGained = 350;
      else if (difficulty === 'impossible') xpGained = 500;
    } else {
      xpGained = 150; 
    }
    
    if (stats.currentStreak > 1) {
      xpGained += stats.currentStreak * 15;
    }
  } else if (outcome === 'loss') {
    xpGained = 30; 
  } else {
    xpGained = 60; 
  }

  storage.addXP(xpGained);

  return {
    match: newMatch,
    stats: stats,
    xpGained: xpGained
  };
}

function updateDailyStreak(stats) {
  const todayStr = new Date().toDateString();
  const daily = stats.dailyStreak || { lastPlayedDate: null, streakCount: 0 };
  
  if (daily.lastPlayedDate === null) {
    daily.streakCount = 1;
  } else {
    const lastDate = new Date(daily.lastPlayedDate);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      daily.streakCount++;
    } else if (diffDays > 1) {
      daily.streakCount = 1;
    }
  }
  daily.lastPlayedDate = todayStr;
  stats.dailyStreak = daily;
}

export function getLeaderboardData() {
  const profile = storage.getProfile();
  const stats = storage.getStats();

  const mockUsers = [
    { name: 'Minimax_AI', level: 42, wins: 382, streak: 25, xp: 42500, isSelf: false },
    { name: 'GridMaster99', level: 18, wins: 120, streak: 12, xp: 18400, isSelf: false },
    { name: 'ConnectWizard', level: 14, wins: 95, streak: 8, xp: 14200, isSelf: false },
    { name: 'PixelPioneer', level: 9, wins: 45, streak: 5, xp: 9100, isSelf: false },
    { name: 'ChipChallenger', level: 5, wins: 20, streak: 3, xp: 5200, isSelf: false }
  ];

  const selfRecord = {
    name: profile.username || 'Player 1',
    level: profile.level,
    wins: stats.wins,
    streak: stats.longestStreak,
    xp: profile.xp,
    isSelf: true
  };

  mockUsers.push(selfRecord);
  mockUsers.sort((a, b) => b.xp - a.xp);
  return mockUsers;
}

export function exportStatsAsJson() {
  const data = {
    profile: storage.getProfile(),
    stats: storage.getStats(),
    history: storage.getHistory(),
    achievements: storage.getAchievements()
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `connect_four_pro_stats_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
