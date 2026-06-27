// XENO Spider Solitaire - Storage Manager
// O-Module: Origin / State Management
// 隐私至上：每次页面加载清空对局缓存，仅保留荣誉数据

import type { HonorData, Settings } from './types';
import { Atmosphere } from './types';

const PREFIX = 'xeno_spider_';
const HONOR_PREFIX = 'xeno_spider_honor_';

const HONOR_KEY = HONOR_PREFIX + 'data';
const SETTINGS_KEY = PREFIX + 'settings';

const DEFAULT_HONOR: HonorData = {
  rank: '见习织网者',
  totalEnergy: 0,
  badges: [],
  bestScores: {},
  gamesPlayed: 0,
};

const DEFAULT_SETTINGS: Settings = {
  atmosphere: Atmosphere.DEEP_SPACE,
  volume: 0.7,
  voidEnabled: true,
  animationSpeed: 1,
};

export function clearSessionCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX) && !key.startsWith(HONOR_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function loadHonorData(): HonorData {
  try {
    const raw = localStorage.getItem(HONOR_KEY);
    if (raw) {
      const data = JSON.parse(raw) as HonorData;
      return { ...DEFAULT_HONOR, ...data };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_HONOR };
}

export function saveHonorData(data: HonorData): void {
  try {
    localStorage.setItem(HONOR_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Settings;
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function updateHonorAfterVictory(score: number): void {
  const honor = loadHonorData();
  honor.totalEnergy += score;
  honor.gamesPlayed += 1;

  const prevBest = honor.bestScores['standard'] || 0;
  if (score > prevBest) {
    honor.bestScores['standard'] = score;
  }

  // Update rank
  if (honor.totalEnergy >= 10000) {
    honor.rank = 'XENO·原初者';
  } else if (honor.totalEnergy >= 5000) {
    honor.rank = '星域织网师';
  } else if (honor.totalEnergy >= 2000) {
    honor.rank = '高级织网者';
  } else if (honor.totalEnergy >= 500) {
    honor.rank = '织网者';
  }

  saveHonorData(honor);
}

export function getCleanRankName(rank: string): string {
  return rank || '见习织网者';
}