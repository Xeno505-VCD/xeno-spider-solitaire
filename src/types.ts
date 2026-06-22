// ===== 基础类型 =====
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type FoodType = 'NORMAL' | 'SPEED_BOOST' | 'SLOW_DOWN';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const GameState = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
} as const;
export type GameState = (typeof GameState)[keyof typeof GameState];

export interface Position {
  x: number;
  y: number;
}

export interface FoodItem {
  position: Position;
  type: FoodType;
  remainingFrames: number;
}

// ===== 游戏配置 =====
export interface GameConfig {
  wrapMode: boolean;
  difficulty: Difficulty;
}

// ===== 背包换装类型 =====
export type SnakeSkinId = 'default_green' | 'dark_blue';
export type CanvasBgId = 'solid_light' | 'grid_paper';
export type FoodStyleId = 'classic_color' | 'round_icon';

export interface SnakeSkinAsset {
  headColor: string;
  bodyColor: string;
  headRadius: number;
}

export interface BgAsset {
  type: 'solid' | 'pattern';
  solidColor?: string;
  gridLineColor?: string;
  gridWidth?: number;
}

export interface FoodAsset {
  normalColor: string;
  speedColor: string;
  slowColor: string;
  drawMode: 'square' | 'circle';
}

export interface PlayerCustomConfig {
  snakeSkin: SnakeSkinId;
  canvasBg: CanvasBgId;
  foodStyle: FoodStyleId;
}

// ===== 特殊果实类型 =====
export type SpecialFruitType = 'SHRINK_BONUS' | 'STEALTH_EGG';

export type StealthStage = 'STAGE_HIDDEN' | 'STAGE_VISIBLE';

export interface SpecialFruitItem {
  type: SpecialFruitType;
  position: Position;
  totalLifeFrames: number;
  remainFrames: number;
  currentScale: number;
  currentScore: number;
  hiddenAlpha: number;
  stealthStage: StealthStage;
}