// js/achievements.js
import { storage } from './storage.js';
import { addXp } from './stats.js';

export const ACHIEVEMENTS = [
  // 1. Wins Milestone (12 badges)
  { id: 'win_1', title: 'First Victory', desc: 'Win your first Connect Four match', category: 'wins', target: 1, xp: 100, icon: 'trophy' },
  { id: 'win_5', title: 'Casual Competitor', desc: 'Achieve 5 wins', category: 'wins', target: 5, xp: 150, icon: 'award' },
  { id: 'win_10', title: 'Rising Star', desc: 'Achieve 10 wins', category: 'wins', target: 10, xp: 200, icon: 'shield' },
  { id: 'win_20', title: 'Looming Threat', desc: 'Achieve 20 wins', category: 'wins', target: 20, xp: 300, icon: 'swords' },
  { id: 'win_30', title: 'Board Tactician', desc: 'Achieve 30 wins', category: 'wins', target: 30, xp: 400, icon: 'brain' },
  { id: 'win_40', title: 'Elite Player', desc: 'Achieve 40 wins', category: 'wins', target: 40, xp: 500, icon: 'crown' },
  { id: 'win_50', title: 'Connect Master', desc: 'Achieve 50 wins', category: 'wins', target: 50, xp: 600, icon: 'star' },
  { id: 'win_60', title: 'Veteran Gladiator', desc: 'Achieve 60 wins', category: 'wins', target: 60, xp: 700, icon: 'flame' },
  { id: 'win_70', title: 'Unstoppable Force', desc: 'Achieve 70 wins', category: 'wins', target: 70, xp: 800, icon: 'zap' },
  { id: 'win_80', title: 'Strategist Supreme', desc: 'Achieve 80 wins', category: 'wins', target: 80, xp: 900, icon: 'sparkles' },
  { id: 'win_90', title: 'Grid Champion', desc: 'Achieve 90 wins', category: 'wins', target: 90, xp: 1000, icon: 'medal' },
  { id: 'win_100', title: 'Connect Four Legend', desc: 'Achieve 100 wins', category: 'wins', target: 100, xp: 1500, icon: 'gem' },

  // 2. Streaks (9 badges)
  { id: 'streak_2', title: 'Double Down', desc: 'Win 2 matches in a row', category: 'streak', target: 2, xp: 50, icon: 'trending-up' },
  { id: 'streak_3', title: 'Triple Threat', desc: 'Win 3 matches in a row', category: 'streak', target: 3, xp: 100, icon: 'zap' },
  { id: 'streak_4', title: 'Four-in-a-Row', desc: 'Win 4 matches in a row', category: 'streak', target: 4, xp: 150, icon: 'activity' },
  { id: 'streak_5', title: 'On Fire', desc: 'Win 5 matches in a row', category: 'streak', target: 5, xp: 200, icon: 'flame' },
  { id: 'streak_6', title: 'Untouchable', desc: 'Win 6 matches in a row', category: 'streak', target: 6, xp: 250, icon: 'shield-alert' },
  { id: 'streak_7', title: 'Godlike Streak', desc: 'Win 7 matches in a row', category: 'streak', target: 7, xp: 350, icon: 'skull' },
  { id: 'streak_8', title: 'Undefeated', desc: 'Win 8 matches in a row', category: 'streak', target: 8, xp: 450, icon: 'target' },
  { id: 'streak_9', title: 'Epic Run', desc: 'Win 9 matches in a row', category: 'streak', target: 9, xp: 600, icon: 'trophy' },
  { id: 'streak_10', title: 'Decimator', desc: 'Win 10 matches in a row', category: 'streak', target: 10, xp: 1000, icon: 'crown' },

  // 3. AI Challenges (7 badges)
  { id: 'ai_easy', title: 'Novice Buster', desc: 'Beat the Easy AI', category: 'ai', target: 'easy', xp: 50, icon: 'smile' },
  { id: 'ai_medium', title: 'Warrior Tamer', desc: 'Beat the Medium AI', category: 'ai', target: 'medium', xp: 100, icon: 'swords' },
  { id: 'ai_hard', title: 'Intellect Overridden', desc: 'Beat the Hard AI', category: 'ai', target: 'hard', xp: 250, icon: 'cpu' },
  { id: 'ai_impossible', title: 'Machine Defeated', desc: 'Beat the Impossible AI', category: 'ai', target: 'impossible', xp: 500, icon: 'terminal' },
  { id: 'ai_impossible_fast', title: 'Speed Hacker', desc: 'Beat Impossible AI in under 15 moves', category: 'ai_special', target: 15, xp: 600, icon: 'zap' },
  { id: 'ai_vs_ai', title: 'Demo Spectator', desc: 'Watch an AI vs AI demo match to completion', category: 'ai_special', target: 'demo', xp: 50, icon: 'tv' },
  { id: 'ai_play_50', title: 'Machine Sparring', desc: 'Play 50 total matches against any AI', category: 'ai_play', target: 50, xp: 400, icon: 'sliders' },

  // 4. Special Scenarios (9 badges)
  { id: 'moves_10', title: 'Blitzkrieg', desc: 'Win a match in 10 moves or less', category: 'special', target: 'blitz', xp: 200, icon: 'timer' },
  { id: 'moves_8', title: 'Flash Victory', desc: 'Win a match in 8 moves or less', category: 'special', target: 'flash', xp: 350, icon: 'zap' },
  { id: 'moves_6', title: 'Quantum Collapse', desc: 'Win a match in 6 moves or less', category: 'special', target: 'quantum', xp: 600, icon: 'zap-off' },
  { id: 'long_match', title: 'Endurance Test', desc: 'Win a match that lasts 35 or more moves', category: 'special', target: 'endure', xp: 150, icon: 'hourglass' },
  { id: 'perfect_game', title: 'Perfect Game', desc: 'Win a match without using Undo or letting opponent score', category: 'special', target: 'perfect', xp: 250, icon: 'sparkles' },
  { id: 'center_control', title: 'Center Dominator', desc: 'Win with 3 or more winning tokens in the center column', category: 'special', target: 'center', xp: 150, icon: 'align-center' },
  { id: 'undo_wizard', title: 'Time Weaver', desc: 'Win a match after using Undo 3 or more times', category: 'special', target: 'undo', xp: 100, icon: 'rotate-ccw' },
  { id: 'tie_first', title: 'Mutual Standoff', desc: 'Tie a match', category: 'special', target: 'tie', xp: 50, icon: 'help-circle' },
  { id: 'tie_10', title: 'Drawn Out', desc: 'Tie 10 matches total', category: 'special', target: 'tie_10', xp: 250, icon: 'git-merge' },

  // 5. Daily Streaks & Level (5 badges)
  { id: 'daily_2', title: 'Dedication', desc: 'Play 2 days in a row', category: 'daily', target: 2, xp: 100, icon: 'calendar' },
  { id: 'daily_5', title: 'Commited Player', desc: 'Play 5 days in a row', category: 'daily', target: 5, xp: 300, icon: 'calendar-days' },
  { id: 'level_5', title: 'Acolyte', desc: 'Reach Level 5', category: 'level', target: 5, xp: 200, icon: 'chevrons-up' },
  { id: 'level_10', title: 'Knight Templar', desc: 'Reach Level 10', category: 'level', target: 10, xp: 400, icon: 'shield-check' },
  { id: 'level_20', title: 'Elite Ascended', desc: 'Reach Level 20', category: 'level', target: 20, xp: 1000, icon: 'sparkles' }
];

export function checkAchievements() {
  const stats = storage.getStats();
  const history = storage.getHistory();
  const profile = storage.getProfile();
  const unlocked = storage.getAchievements();

  const newlyUnlocked = [];

  ACHIEVEMENTS.forEach(badge => {
    // Skip if already unlocked
    if (unlocked.includes(badge.id)) return;

    let qualifies = false;

    // 1. Wins Checker
    if (badge.category === 'wins') {
      if (stats.wins >= badge.target) qualifies = true;
    }

    // 2. Streak Checker
    if (badge.category === 'streak') {
      if (stats.longestStreak >= badge.target) qualifies = true;
    }

    // 3. AI Wins Checker
    if (badge.category === 'ai') {
      const beatAI = history.some(m => m.winnerId === 1 && m.opponent.toLowerCase().includes(badge.target));
      if (beatAI) qualifies = true;
    }

    // 4. AI Wins Played Count Checker
    if (badge.category === 'ai_play') {
      const aiGames = history.filter(m => m.opponent.toLowerCase().includes('ai')).length;
      if (aiGames >= badge.target) qualifies = true;
    }

    // 5. Special Moves Checker
    if (badge.category === 'special' || badge.category === 'ai_special') {
      if (badge.id === 'moves_10') {
        const hasBlitz = history.some(m => m.winnerId === 1 && m.moves <= 10);
        if (hasBlitz) qualifies = true;
      }
      if (badge.id === 'moves_8') {
        const hasFlash = history.some(m => m.winnerId === 1 && m.moves <= 8);
        if (hasFlash) qualifies = true;
      }
      if (badge.id === 'moves_6') {
        const hasQuantum = history.some(m => m.winnerId === 1 && m.moves <= 6);
        if (hasQuantum) qualifies = true;
      }
      if (badge.id === 'long_match') {
        const hasEndure = history.some(m => m.winnerId === 1 && m.moves >= 35);
        if (hasEndure) qualifies = true;
      }
      if (badge.id === 'tie_first') {
        if (stats.draws >= 1) qualifies = true;
      }
      if (badge.id === 'tie_10') {
        if (stats.draws >= 10) qualifies = true;
      }
      if (badge.id === 'ai_impossible_fast') {
        const beatFast = history.some(m => m.winnerId === 1 && m.opponent.includes('impossible') && m.moves <= 15);
        if (beatFast) qualifies = true;
      }
      // Demo Spectator is handled manually on demo complete.
      // Undo wizard, perfect game, center control are checked manually when ending round.
    }

    // 6. Daily Streaks Checker
    if (badge.category === 'daily') {
      if (stats.dailyStreak.streakCount >= badge.target) qualifies = true;
    }

    // 7. Level Checker
    if (badge.category === 'level') {
      if (profile.level >= badge.target) qualifies = true;
    }

    if (qualifies) {
      newlyUnlocked.push(badge);
    }
  });

  if (newlyUnlocked.length > 0) {
    const updatedUnlocked = [...unlocked, ...newlyUnlocked.map(b => b.id)];
    storage.saveAchievements(updatedUnlocked);
    
    // Add XP rewards
    newlyUnlocked.forEach(b => {
      addXp(b.xp);
    });
  }

  return newlyUnlocked;
}

// Manually trigger specific achievements like Undo Wizard or Perfect Game
export function unlockAchievement(achievementId) {
  const unlocked = storage.getAchievements();
  if (unlocked.includes(achievementId)) return null;

  const badge = ACHIEVEMENTS.find(b => b.id === achievementId);
  if (badge) {
    unlocked.push(achievementId);
    storage.saveAchievements(unlocked);
    addXp(badge.xp);
    return badge;
  }
  return null;
}
