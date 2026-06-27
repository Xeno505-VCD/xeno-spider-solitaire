// XENO Spider Solitaire - Type Definitions
// O-Module: Origin / State Management

export interface Card {
  id: number;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export enum Suit {
  CORE = 0,      // ▲ 稳定核心 (原黑桃)
  PULSE = 1,     // ● 脉冲节点 (原红心)
  CLUSTER = 2,   // ◆ 数据集群 (原梅花)
  MATRIX = 3,    // ■ 能源矩阵 (原方片)
}

export enum Rank {
  A = 1, TWO, THREE, FOUR, FIVE, SIX, SEVEN,
  EIGHT, NINE, TEN, J, Q, K,
}

export const RANK_NAMES: Record<Rank, string> = {
  [Rank.A]: 'A', [Rank.TWO]: '2', [Rank.THREE]: '3',
  [Rank.FOUR]: '4', [Rank.FIVE]: '5', [Rank.SIX]: '6',
  [Rank.SEVEN]: '7', [Rank.EIGHT]: '8', [Rank.NINE]: '9',
  [Rank.TEN]: '10', [Rank.J]: 'J', [Rank.Q]: 'Q', [Rank.K]: 'K',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.CORE]: '▲',
  [Suit.PULSE]: '●',
  [Suit.CLUSTER]: '◆',
  [Suit.MATRIX]: '■',
};

export const SUIT_COLORS: Record<Suit, string> = {
  [Suit.CORE]: '#00E5FF',
  [Suit.PULSE]: '#D500F9',
  [Suit.CLUSTER]: '#00FFCC',
  [Suit.MATRIX]: '#FFB800',
};

export interface Column {
  cards: Card[];
}

export interface GameState {
  columns: Column[];
  stock: Card[];
  completed: number;
  score: number;
  moves: number;
  difficulty: Difficulty;
  voidPower: number;
  atmosphere: Atmosphere;
  gameOver: boolean;
  victory: boolean;
}

export enum Difficulty {
  EASY = 1,    // 1 suit
  MEDIUM = 2,  // 2 suits
  HARD = 4,    // 4 suits
}

export enum Atmosphere {
  DEEP_SPACE = 0,
  PULSAR_STORM = 1,
  BIO_CHAMBER = 2,
}

export interface DragState {
  active: boolean;
  columnIndex: number;
  cardIndex: number;
  cards: Card[];
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
}

export interface HonorData {
  rank: string;
  totalEnergy: number;
  badges: string[];
  bestScores: Record<string, number>;
  gamesPlayed: number;
}

export interface Settings {
  atmosphere: Atmosphere;
  volume: number;
  voidEnabled: boolean;
  animationSpeed: number;
}