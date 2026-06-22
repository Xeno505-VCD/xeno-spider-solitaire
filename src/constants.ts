import type { SnakeSkinId, SnakeSkinAsset, CanvasBgId, BgAsset, FoodStyleId, FoodAsset } from './types';

// ===== 画布 =====
export const COLS = 25;
export const ROWS = 25;
export const MIN_CANVAS_SIZE = 240;

// ===== 速度（ms/帧） =====
export const BASE_SPEED = 150;
export const SPEED_STEP = 5;
export const MIN_SPEED = 60;
export const SCORE_PER_SPEED_UP = 100;

// ===== 分数 =====
export const SCORE_PER_FOOD = 10;
export const SPEED_BOOST_SCORE_MULTIPLIER = 2;

// ===== 道具 =====
export const POWERUP_CHANCE = 0.1;
export const POWERUP_DURATION_FRAMES = 60;
export const SLOW_DOWN_SPEED_FACTOR = 0.5;

// ===== 难度预设 =====
export const DIFFICULTY_PRESETS = {
  easy:   { baseSpeed: 180, speedStep: 8,  minSpeed: 80  },
  normal: { baseSpeed: 150, speedStep: 5,  minSpeed: 60  },
  hard:   { baseSpeed: 100, speedStep: 3,  minSpeed: 40  },
} as const;

// ===== 触摸 =====
export const SWIPE_THRESHOLD = 20;
export const SWIPE_COOLDOWN = 100;
export const RESIZE_DEBOUNCE = 150;

// ===== localStorage Keys =====
export const LS_HIGH_SCORE_KEY = 'snake_highscore';
export const LS_CUSTOM_CONFIG_KEY = 'snake_player_custom_config';

// ===== 应用版本 =====
export const APP_VERSION = '1.0.0';

// ===== 缩圈高分果 =====
export const BONUS_SHRINK_CHANCE = 0.12;
export const BONUS_SHRINK_LIFE_FRAMES = 270;    // 4.5秒@60fps
export const BONUS_SHRINK_MAX_SCORE = 80;
export const BONUS_SHRINK_MIN_SCORE = 10;
export const BONUS_SHRINK_MAX_SCALE = 2.2;
export const BONUS_SHRINK_MIN_SCALE = 1.0;
export const BONUS_SHRINK_COLOR_OUTER = '#ff6b35';
export const BONUS_SHRINK_COLOR_INNER = '#ff8c42';
export const BONUS_SHRINK_GLOW_COLOR = 'rgba(255,107,53,0.35)';

// ===== 隐身无敌彩蛋 =====
export const STEALTH_EGG_CHANCE = 0.05;
export const STEALTH_EGG_SCORE = 40;
export const STEALTH_DURATION_FRAMES = 108;       // 1.8秒@60fps
export const STEALTH_HIDE_FRAMES = 120;           // 前2秒隐形
export const STEALTH_TOTAL_LIFE_FRAMES = 240;     // 总存活4秒
export const STEALTH_EGG_COLOR = '#e8e8e8';
export const STEALTH_EGG_GLOW = 'rgba(255,255,255,0.5)';
export const STEALTH_OVERLAY_ALPHA = 0.08;

// ===== 蛇初始长度 =====
export const INITIAL_SNAKE_LENGTH = 3;

// ===== 皮肤素材库 =====
export const SNAKE_SKIN_LIBRARY: Record<SnakeSkinId, SnakeSkinAsset> = {
  default_green: {
    headColor: '#2e7d32',
    bodyColor: '#6abf69',
    headRadius: 4,
  },
  dark_blue: {
    headColor: '#1565c0',
    bodyColor: '#64b5f6',
    headRadius: 6,
  },
};

// ===== 背景素材库 =====
export const BG_LIBRARY: Record<CanvasBgId, BgAsset> = {
  solid_light: {
    type: 'solid',
    solidColor: '#f0f0e8',
  },
  grid_paper: {
    type: 'pattern',
    gridLineColor: 'rgba(180,180,220,0.15)',
    gridWidth: 0.5,
  },
};

// ===== 食物样式素材库 =====
export const FOOD_STYLE_LIBRARY: Record<FoodStyleId, FoodAsset> = {
  classic_color: {
    normalColor: '#e74c3c',
    speedColor: '#f1c40f',
    slowColor: '#3498db',
    drawMode: 'square',
  },
  round_icon: {
    normalColor: '#dc3545',
    speedColor: '#ffc107',
    slowColor: '#0d6efd',
    drawMode: 'circle',
  },
};

// ===== 默认颜色（fallback） =====
export const COLORS = {
  bg: '#f0f0e8',
  gridLine: 'rgba(0,0,0,0.06)',
  borderLine: 'rgba(0,0,0,0.25)',
  snakeHead: '#2e7d32',
  snakeBody: '#6abf69',
  foodNormal: '#e74c3c',
  foodSpeed: '#f1c40f',
  foodSlow: '#3498db',
} as const;