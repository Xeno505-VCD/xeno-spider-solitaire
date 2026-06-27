// XENO Spider Solitaire - Game Engine
// E-Module: Energy / Core Logic
// 核心算法：洗牌、发牌、规则判定、计分

import type { Card, Column, GameState, DragState } from '../o_module/types';
import { Suit, Rank, Difficulty, Atmosphere } from '../o_module/types';

// --- Deck Generation ---

function createDeck(difficulty: Difficulty): Card[] {
  const suitsPerDifficulty: Record<Difficulty, Suit[]> = {
    [Difficulty.EASY]: [Suit.CORE],
    [Difficulty.MEDIUM]: [Suit.CORE, Suit.PULSE],
    [Difficulty.HARD]: [Suit.CORE, Suit.PULSE, Suit.CLUSTER, Suit.MATRIX],
  };

  const suits = suitsPerDifficulty[difficulty];
  // Always 104 cards total (8 full 13-card sequences)
  const decksPerSuit = Math.floor(8 / suits.length);
  const deck: Card[] = [];
  let id = 0;

  for (let d = 0; d < decksPerSuit; d++) {
    for (const suit of suits) {
      for (let r = Rank.A; r <= Rank.K; r++) {
        deck.push({ id: id++, suit, rank: r as Rank, faceUp: false });
      }
    }
  }

  return deck;
}

function shuffle(cards: Card[]): Card[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Initial Deal ---

export function initGameState(difficulty: Difficulty, atmosphere: Atmosphere): GameState {
  const deck = shuffle(createDeck(difficulty));
  const columns: Column[] = [];

  let idx = 0;
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    const cards: Card[] = [];
    for (let c = 0; c < count; c++) {
      const card = { ...deck[idx], id: deck[idx].id + idx };
      card.faceUp = c === count - 1;
      cards.push(card);
      idx++;
    }
    columns.push({ cards });
  }

  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));

  return {
    columns,
    stock,
    completed: 0,
    score: 0,
    moves: 0,
    difficulty,
    voidPower: 3,
    atmosphere,
    gameOver: false,
    victory: false,
  };
}

// --- Rule Validation ---

export function canPlaceCard(topCard: Card, targetCard: Card, difficulty: Difficulty): boolean {
  if (topCard.rank !== targetCard.rank - 1) return false;
  if (difficulty === Difficulty.EASY) return true;
  if (difficulty === Difficulty.MEDIUM) {
    return topCard.suit === targetCard.suit;
  }
  return topCard.suit === targetCard.suit;
}

export function getMovableCards(column: Column, fromIndex: number): Card[] | null {
  const cards = column.cards;
  if (fromIndex < 0 || fromIndex >= cards.length) return null;
  if (!cards[fromIndex].faceUp) return null;

  const movable: Card[] = [];
  for (let i = fromIndex; i < cards.length; i++) {
    if (!cards[i].faceUp) return null;
    if (i > fromIndex) {
      if (cards[i].suit !== cards[i - 1].suit) return null;
      if (cards[i].rank !== cards[i - 1].rank - 1) return null;
    }
    movable.push(cards[i]);
  }
  return movable;
}

export function isValidMove(
  state: GameState,
  fromCol: number,
  cardIndex: number,
  toCol: number
): boolean {
  if (fromCol === toCol) return false;
  const fromColumn = state.columns[fromCol];
  const toColumn = state.columns[toCol];
  if (!fromColumn || !toColumn) return false;

  const movable = getMovableCards(fromColumn, cardIndex);
  if (!movable || movable.length === 0) return false;

  // Empty column: any card/sequence can be placed
  if (toColumn.cards.length === 0) return true;

  const targetCard = toColumn.cards[toColumn.cards.length - 1];
  return canPlaceCard(movable[0], targetCard, state.difficulty);
}

export function getAllValidMoves(state: GameState): Array<{ from: number; cardIdx: number; to: number }> {
  const moves: Array<{ from: number; cardIdx: number; to: number }> = [];
  for (let from = 0; from < 10; from++) {
    const col = state.columns[from];
    for (let ci = 0; ci < col.cards.length; ci++) {
      if (!col.cards[ci].faceUp) continue;
      for (let to = 0; to < 10; to++) {
        if (from === to) continue;
        if (isValidMove(state, from, ci, to)) {
          moves.push({ from, cardIdx: ci, to });
        }
      }
    }
  }
  return moves;
}

// --- Move Execution ---

export function executeMove(state: GameState, fromCol: number, cardIndex: number, toCol: number): GameState | null {
  if (!isValidMove(state, fromCol, cardIndex, toCol)) return null;

  const newState = deepCloneState(state);
  const from = newState.columns[fromCol];
  const to = newState.columns[toCol];
  const cards = from.cards.splice(cardIndex);

  // Flip the new top card of source column
  if (from.cards.length > 0) {
    from.cards[from.cards.length - 1].faceUp = true;
  }

  to.cards.push(...cards);
  newState.moves += 1;

  // Score moved cards
  newState.score += cards.length >= 3 ? 10 : 5;

  // Check for completed sequences
  checkCompletedSequences(newState);

  // Check void events
  checkVoidEvent(newState);

  // Check victory
  if (newState.completed >= 8) {
    newState.victory = true;
    newState.gameOver = true;
    newState.score += 500;
  }

  return newState;
}

// --- Stock Dealing ---

export function canDealFromStock(state: GameState): boolean {
  if (state.stock.length === 0) return false;
  // All columns must have at least 1 card
  return state.columns.every((col) => col.cards.length > 0);
}

export function dealFromStock(state: GameState): GameState | null {
  if (!canDealFromStock(state)) return null;

  const newState = deepCloneState(state);
  const dealBatch = newState.stock.splice(0, 10);

  for (let i = 0; i < Math.min(10, dealBatch.length); i++) {
    dealBatch[i].faceUp = true;
    newState.columns[i].cards.push(dealBatch[i]);
  }

  // Check if no valid moves remain
  if (newState.stock.length === 0 && getAllValidMoves(newState).length === 0) {
    newState.gameOver = true;
  }

  return newState;
}

// --- Sequence Completion ---

function checkCompletedSequences(state: GameState): void {
  for (let col = 0; col < 10; col++) {
    const cards = state.columns[col].cards;
    if (cards.length < 13) continue;

    const last13 = cards.slice(-13);
    if (last13.length !== 13) continue;

    const suit = last13[0].suit;
    let complete = last13[0].rank === Rank.K;
    for (let i = 1; i < 13 && complete; i++) {
      if (last13[i].suit !== suit) complete = false;
      if (last13[i].rank !== (last13[i - 1].rank as number) - 1) complete = false;
    }

    if (complete) {
      state.columns[col].cards.splice(-13);
      state.completed += 1;
      state.score += 100;

      // Flip top card of the column
      if (state.columns[col].cards.length > 0) {
        state.columns[col].cards[state.columns[col].cards.length - 1].faceUp = true;
      }
    }
  }
}

// --- Void Event (虚空裂隙) ---

function checkVoidEvent(state: GameState): void {
  if (Math.random() > 0.15) return; // 15% chance

  const nonEmpty: number[] = [];
  for (let i = 0; i < 10; i++) {
    if (state.columns[i].cards.length > 0) nonEmpty.push(i);
  }
  if (nonEmpty.length < 2) return;

  const a = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
  let b = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
  while (b === a) b = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];

  const colA = state.columns[a];
  const colB = state.columns[b];
  const cardA = colA.cards[colA.cards.length - 1];
  const cardB = colB.cards[colB.cards.length - 1];

  colA.cards[colA.cards.length - 1] = cardB;
  colB.cards[colB.cards.length - 1] = cardA;
  state.score += 15;
}

// --- Utility ---

export function deepCloneState(state: GameState): GameState {
  return {
    ...state,
    columns: state.columns.map((col) => ({
      cards: col.cards.map((c) => ({ ...c })),
    })),
    stock: state.stock.map((c) => ({ ...c })),
  };
}

export function getDragCards(column: Column, fromIndex: number): Card[] | null {
  return getMovableCards(column, fromIndex);
}

export function findCardColumn(state: GameState, cardId: number): number {
  for (let i = 0; i < state.columns.length; i++) {
    if (state.columns[i].cards.some((c) => c.id === cardId)) return i;
  }
  return -1;
}

export function isCompleteSequence(cards: Card[]): boolean {
  if (cards.length !== 13) return false;
  if (cards[0].rank !== Rank.K) return false;
  const suit = cards[0].suit;
  for (let i = 1; i < 13; i++) {
    if (cards[i].suit !== suit) return false;
    if (cards[i].rank !== (Rank.K as number) - i) return false;
  }
  return true;
}