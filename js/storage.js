const DEFAULT_PREFERENCES = {
  theme: 'system', 
  sound: 'on',     
  soundMuted: false,
  volume: 0.5,
  speed: 'normal', 
  animationSpeed: 'normal',
  particles: 'on', 
  boardColor: '#1e293b', 
  p1Color: '#ff3e6c',    
  p2Color: '#00f0ff'     
};

const DEFAULT_PROFILE = {
  username: 'Player 1',
  avatar: 'rocket',
  xp: 0,
  xpNeeded: 1000,
  level: 1,
  rank: 'Bronze Cadet',
  rankTitle: 'Bronze Cadet',
  badges: []
};

const DEFAULT_STATS = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalMatchTime: 0, 
  fastestWin: null,  
  openingCols: [0, 0, 0, 0, 0, 0, 0], 
  dailyStreak: {
    lastPlayedDate: null,
    streakCount: 0
  }
};

class StorageManager {
  constructor() {
    this.keys = {
      prefs: 'c4_pro_prefs',
      profile: 'c4_pro_profile',
      stats: 'c4_pro_stats',
      history: 'c4_pro_history',
      achievements: 'c4_pro_achievements'
    };
  }

  _get(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading key ${key} from LocalStorage:`, e);
      return defaultValue;
    }
  }

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing key ${key} to LocalStorage:`, e);
    }
  }

  getPreferences() {
    const data = this._get(this.keys.prefs, { ...DEFAULT_PREFERENCES });
    return { ...DEFAULT_PREFERENCES, ...data };
  }

  savePreferences(prefs) {
    const current = this.getPreferences();
    this._set(this.keys.prefs, { ...current, ...prefs });
  }

  // Aliases required by script.js
  getSettings() {
    return this.getPreferences();
  }

  saveSettings(prefs) {
    this.savePreferences(prefs);
  }

  getProfile() {
    const data = this._get(this.keys.profile, { ...DEFAULT_PROFILE });
    const merged = { ...DEFAULT_PROFILE, ...data };
    if (merged.username === 'Grandmaster') merged.username = 'Player 1';
    if (merged.rank === 'Grand Master' || merged.rankTitle === 'Grand Master') {
      merged.rank = 'Connect Master';
      merged.rankTitle = 'Connect Master';
    }
    if (!merged.rankTitle) merged.rankTitle = merged.rank;
    if (!merged.xpNeeded) merged.xpNeeded = merged.level * 1000;
    return merged;
  }

  saveProfile(profile) {
    const current = this.getProfile();
    this._set(this.keys.profile, { ...current, ...profile });
  }

  addXP(amount) {
    const profile = this.getProfile();
    profile.xp += amount;
    let xpNeeded = profile.level * 1000;
    while (profile.xp >= xpNeeded) {
      profile.xp -= xpNeeded;
      profile.level += 1;
      xpNeeded = profile.level * 1000;
    }
    profile.xpNeeded = xpNeeded;
    
    let rank = 'Bronze Cadet';
    if (profile.level >= 20) rank = 'Connect Master';
    else if (profile.level >= 15) rank = 'Diamond General';
    else if (profile.level >= 10) rank = 'Platinum Major';
    else if (profile.level >= 6) rank = 'Gold Sergeant';
    else if (profile.level >= 3) rank = 'Silver Corporal';
    
    profile.rank = rank;
    profile.rankTitle = rank;
    this.saveProfile(profile);
    return profile;
  }

  getStats() {
    const data = this._get(this.keys.stats, { ...DEFAULT_STATS });
    return { ...DEFAULT_STATS, ...data };
  }

  saveStats(stats) {
    const current = this.getStats();
    this._set(this.keys.stats, { ...current, ...stats });
  }

  getHistory() {
    return this._get(this.keys.history, []);
  }

  saveHistory(history) {
    this._set(this.keys.history, history);
  }

  getAchievements() {
    return this._get(this.keys.achievements, []);
  }

  saveAchievements(achievements) {
    this._set(this.keys.achievements, achievements);
  }

  resetAll() {
    localStorage.removeItem(this.keys.prefs);
    localStorage.removeItem(this.keys.profile);
    localStorage.removeItem(this.keys.stats);
    localStorage.removeItem(this.keys.history);
    localStorage.removeItem(this.keys.achievements);

    window.location.reload();
  }
}

export const storage = new StorageManager();
export { DEFAULT_PREFERENCES, DEFAULT_PROFILE, DEFAULT_STATS };
