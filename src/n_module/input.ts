// XENO Spider Solitaire - Input Manager
// N-Module: Nexus / Input & Interaction
// 处理鼠标拖拽、点击、键盘操作

import type { GameState, DragState, Card } from '../o_module/types';
import type { LayoutData } from '../x_module/renderer';
import { getDragCards, executeMove, dealFromStock, canDealFromStock } from '../e_module/engine';
import { hitTestColumn, hitTestStock, getColumnAtX, getCardYInColumn } from '../x_module/renderer';

export interface InputCallbacks {
  onStateChange: (newState: GameState) => void;
  onInvalidMove: () => void;
  onNewGame: () => void;
  onUndo: () => void;
  onSettings: () => void;
  onDealStart: (state: GameState) => void;
}

export interface SelectionState {
  col: number;
  cardIdx: number;
  cards: Card[];
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private callbacks: InputCallbacks;
  private dragState: DragState | null = null;
  private layout: LayoutData;
  private getState: () => GameState;
  private history: GameState[] = [];
  private isDragging = false;
  private selectedCard: SelectionState | null = null;
  private isMobile = false;

  constructor(
    canvas: HTMLCanvasElement,
    layout: LayoutData,
    getState: () => GameState,
    callbacks: InputCallbacks
  ) {
    this.canvas = canvas;
    this.layout = layout;
    this.getState = getState;
    this.callbacks = callbacks;

    this.setupMouseEvents();
    this.setupKeyboardEvents();
    this.setupContextMenu();
  }

  updateLayout(layout: LayoutData): void {
    this.layout = layout;
    this.isMobile = layout.isMobile;
  }

  getDragState(): DragState | null {
    return this.dragState;
  }

  getSelectedCard(): SelectionState | null {
    return this.selectedCard;
  }

  clearSelection(): void {
    this.selectedCard = null;
  }

  pushHistory(state: GameState): void {
    this.history.push(state);
    // Keep last 100 states for undo
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  undoLastMove(): void {
    if (this.history.length <= 1) return;
    this.history.pop(); // Remove current
    const prev = this.history[this.history.length - 1];
    this.callbacks.onStateChange(prev);
  }

  private setupMouseEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

    // Touch support
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private setupKeyboardEvents(): void {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.undoLastMove();
          }
          break;
        case 'n':
        case 'N':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.callbacks.onNewGame();
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.callbacks.onSettings();
          }
          break;
      }
    });
  }

  private setupContextMenu(): void {
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    const state = this.getState();
    this.selectedCard = null;

    if (state.gameOver) return;

    // Check stock pile click
    if (hitTestStock(pos.x, pos.y, this.layout)) {
      if (canDealFromStock(state)) {
        this.pushHistory(state);
        this.callbacks.onDealStart(state);
      } else {
        this.callbacks.onInvalidMove();
      }
      return;
    }

    // Check column click for drag
    const colIdx = getColumnAtX(pos.x, this.layout);
    if (colIdx >= 0) {
      const column = state.columns[colIdx];
      const cardIdx = hitTestColumn(pos.x, pos.y, this.layout, column.cards);
      if (cardIdx >= 0) {
        const cards = getDragCards(column, cardIdx);
        if (cards) {
          this.isDragging = true;
          const cardY = getCardYInColumn(this.layout, column.cards, cardIdx);
          this.dragState = {
            active: true,
            columnIndex: colIdx,
            cardIndex: cardIdx,
            cards,
            offsetX: pos.x - this.layout.columnXs[colIdx],
            offsetY: pos.y - cardY,
            x: pos.x,
            y: pos.y,
          };
        }
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragState) return;
    const pos = this.getMousePos(e);
    this.dragState.x = pos.x;
    this.dragState.y = pos.y;
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isDragging || !this.dragState) {
      this.isDragging = false;
      return;
    }

    this.isDragging = false;
    const pos = this.getMousePos(e);
    const state = this.getState();

    const toCol = getColumnAtX(pos.x, this.layout);

    if (toCol >= 0 && toCol !== this.dragState.columnIndex) {
      this.pushHistory(state);
      const newState = executeMove(
        state,
        this.dragState.columnIndex,
        this.dragState.cardIndex,
        toCol
      );
      if (newState) {
        this.callbacks.onStateChange(newState);
        this.pushHistory(newState);
      } else {
        this.callbacks.onInvalidMove();
        this.history.pop(); // Remove the push
      }
    }

    this.dragState = null;
  }

  private onDoubleClick(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    const state = this.getState();
    if (state.gameOver) return;

    const colIdx = getColumnAtX(pos.x, this.layout);
    if (colIdx < 0) return;

    const column = state.columns[colIdx];
    const cardIdx = hitTestColumn(pos.x, pos.y, this.layout, column.cards);
    if (cardIdx < 0) return;

    const cards = getDragCards(column, cardIdx);
    if (!cards) return;

    // Auto-move to first valid column
    for (let to = 0; to < 10; to++) {
      if (to === colIdx) continue;
      const targetCol = state.columns[to];
      if (targetCol.cards.length === 0) {
        // Move to empty column
        this.pushHistory(state);
        const newState = executeMove(state, colIdx, cardIdx, to);
        if (newState) {
          this.callbacks.onStateChange(newState);
          this.pushHistory(newState);
          return;
        }
        this.history.pop();
      }
    }
  }

  // Touch handlers
  private lastTouchPos: { x: number; y: number } | null = null;

  private getTouchPos(e: TouchEvent): { x: number; y: number } {
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const pos = this.getTouchPos(e);
    this.lastTouchPos = pos;

    const state = this.getState();
    if (state.gameOver) return;

    // Stock pile
    if (hitTestStock(pos.x, pos.y, this.layout)) {
      if (canDealFromStock(state)) {
        this.pushHistory(state);
        this.callbacks.onDealStart(state);
      }
      this.selectedCard = null;
      return;
    }

    const colIdx = getColumnAtX(pos.x, this.layout);
    if (colIdx >= 0) {
      const column = state.columns[colIdx];
      const cardIdx = hitTestColumn(pos.x, pos.y, this.layout, column.cards);
      if (cardIdx >= 0 && column.cards[cardIdx]?.faceUp) {
        // Mobile tap-to-select: first tap selects, second tap on target moves
        if (this.selectedCard && this.selectedCard.col === colIdx && this.selectedCard.cardIdx === cardIdx) {
          // Tapped same card - deselect
          this.selectedCard = null;
          return;
        }
        if (this.selectedCard && this.selectedCard.col !== colIdx) {
          // Tapped different column - execute move
          const newState = executeMove(state, this.selectedCard.col, this.selectedCard.cardIdx, colIdx);
          if (newState) {
            this.pushHistory(state);
            this.callbacks.onStateChange(newState);
            this.pushHistory(newState);
          } else {
            this.callbacks.onInvalidMove();
          }
          this.selectedCard = null;
          return;
        }
        // First tap - select
        const cards = getDragCards(column, cardIdx);
        if (cards) {
          this.selectedCard = { col: colIdx, cardIdx, cards };
        }
        this.isDragging = true;
        const cardY = getCardYInColumn(this.layout, column.cards, cardIdx);
        this.dragState = {
          active: true,
          columnIndex: colIdx,
          cardIndex: cardIdx,
          cards: cards || [],
          offsetX: pos.x - this.layout.columnXs[colIdx],
          offsetY: pos.y - cardY,
          x: pos.x,
          y: pos.y,
        };
        return;
      }
    }
    // Tapped empty area - deselect
    this.selectedCard = null;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging || !this.dragState) return;
    const pos = this.getTouchPos(e);
    this.dragState.x = pos.x;
    this.dragState.y = pos.y;
  }

  private onTouchEnd(e: TouchEvent): void {
    if (!this.isDragging || !this.dragState) return;

    this.isDragging = false;
    const pos = this.getTouchPos(e);
    const state = this.getState();
    const toCol = getColumnAtX(pos.x, this.layout);

    if (toCol >= 0 && toCol !== this.dragState.columnIndex) {
      // If we have a selectedCard, the move was already executed in touchstart
      if (this.selectedCard) {
        this.dragState = null;
        return;
      }
      this.pushHistory(state);
      const newState = executeMove(
        state,
        this.dragState.columnIndex,
        this.dragState.cardIndex,
        toCol
      );
      if (newState) {
        this.callbacks.onStateChange(newState);
        this.pushHistory(newState);
      } else {
        this.callbacks.onInvalidMove();
        this.history.pop();
      }
    }

    this.dragState = null;
  }
}