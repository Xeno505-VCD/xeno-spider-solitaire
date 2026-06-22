import type { Position, SpecialFruitItem, SpecialFruitType } from './types';
import {
  COLS,
  ROWS,
  BONUS_SHRINK_CHANCE,
  BONUS_SHRINK_LIFE_FRAMES,
  BONUS_SHRINK_MAX_SCORE,
  BONUS_SHRINK_MIN_SCORE,
  BONUS_SHRINK_MAX_SCALE,
  BONUS_SHRINK_MIN_SCALE,
  STEALTH_EGG_CHANCE,
  STEALTH_EGG_SCORE,
  STEALTH_DURATION_FRAMES,
  STEALTH_HIDE_FRAMES,
  STEALTH_TOTAL_LIFE_FRAMES,
} from './constants';

export interface SpecialFruitCollisionResult {
  hit: boolean;
  type: SpecialFruitType | null;
  score: number;
  activateStealth: boolean;
}

export class SpecialFruitManager {
  private bonusFruit: SpecialFruitItem | null = null;
  private stealthEgg: SpecialFruitItem | null = null;
  private stealthActive: boolean = false;
  private stealthRemainFrames: number = 0;
  private onStealthChange: (() => void) | null = null;

  setOnStealthChange(cb: () => void): void {
    this.onStealthChange = cb;
  }

  // ---- 生成 ----

  trySpawnShrinkBonus(emptyCells: Position[]): SpecialFruitItem | null {
    if (this.bonusFruit !== null) return null;
    if (Math.random() > BONUS_SHRINK_CHANCE) return null;
    if (emptyCells.length === 0) return null;

    const pos = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const fruit: SpecialFruitItem = {
      type: 'SHRINK_BONUS',
      position: { x: pos.x, y: pos.y },
      totalLifeFrames: BONUS_SHRINK_LIFE_FRAMES,
      remainFrames: BONUS_SHRINK_LIFE_FRAMES,
      currentScale: BONUS_SHRINK_MAX_SCALE,
      currentScore: BONUS_SHRINK_MAX_SCORE,
      hiddenAlpha: 1,
      stealthStage: 'STAGE_VISIBLE',
    };
    this.bonusFruit = fruit;
    return fruit;
  }

  trySpawnStealthEgg(emptyCells: Position[]): SpecialFruitItem | null {
    if (this.stealthEgg !== null) return null;
    if (Math.random() > STEALTH_EGG_CHANCE) return null;
    if (emptyCells.length === 0) return null;

    const pos = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const egg: SpecialFruitItem = {
      type: 'STEALTH_EGG',
      position: { x: pos.x, y: pos.y },
      totalLifeFrames: STEALTH_TOTAL_LIFE_FRAMES,
      remainFrames: STEALTH_TOTAL_LIFE_FRAMES,
      currentScale: 1,
      currentScore: STEALTH_EGG_SCORE,
      hiddenAlpha: 0,
      stealthStage: 'STAGE_HIDDEN',
    };
    this.stealthEgg = egg;
    return egg;
  }

  // ---- 蛇吃掉食物后尝试生成 ----
  trySpawnAfterEat(emptyCells: Position[]): void {
    const bonus = this.trySpawnShrinkBonus(emptyCells);
    if (!bonus) {
      this.trySpawnStealthEgg(emptyCells);
    }
  }

  // ---- 碰撞检测 ----
  checkCollision(headPos: Position): SpecialFruitCollisionResult {
    // 检查缩圈果
    if (this.bonusFruit &&
        this.bonusFruit.position.x === headPos.x &&
        this.bonusFruit.position.y === headPos.y) {
      const score = Math.round(this.bonusFruit.currentScore);
      this.bonusFruit = null;
      return { hit: true, type: 'SHRINK_BONUS', score, activateStealth: false };
    }

    // 检查隐身蛋
    if (this.stealthEgg &&
        this.stealthEgg.position.x === headPos.x &&
        this.stealthEgg.position.y === headPos.y) {
      const score = STEALTH_EGG_SCORE;
      this.stealthEgg = null;
      return { hit: true, type: 'STEALTH_EGG', score, activateStealth: true };
    }

    return { hit: false, type: null, score: 0, activateStealth: false };
  }

  // ---- 激活无敌 ----
  activateStealth(): void {
    this.stealthActive = true;
    this.stealthRemainFrames = STEALTH_DURATION_FRAMES;
    this.onStealthChange?.();
  }

  // ---- 每帧更新 ----
  update(): void {
    // 缩圈果动画
    if (this.bonusFruit) {
      this.bonusFruit.remainFrames--;
      if (this.bonusFruit.remainFrames <= 0) {
        this.bonusFruit = null;
      } else {
        const progress = 1 - this.bonusFruit.remainFrames / this.bonusFruit.totalLifeFrames;
        this.bonusFruit.currentScale =
          BONUS_SHRINK_MAX_SCALE + (BONUS_SHRINK_MIN_SCALE - BONUS_SHRINK_MAX_SCALE) * progress;
        this.bonusFruit.currentScore =
          BONUS_SHRINK_MAX_SCORE + (BONUS_SHRINK_MIN_SCORE - BONUS_SHRINK_MAX_SCORE) * progress;
      }
    }

    // 隐身蛋阶段/alpha
    if (this.stealthEgg) {
      this.stealthEgg.remainFrames--;
      if (this.stealthEgg.remainFrames <= 0) {
        this.stealthEgg = null;
      } else {
        const elapsed = this.stealthEgg.totalLifeFrames - this.stealthEgg.remainFrames;
        if (elapsed < STEALTH_HIDE_FRAMES) {
          this.stealthEgg.stealthStage = 'STAGE_HIDDEN';
          this.stealthEgg.hiddenAlpha = (elapsed / STEALTH_HIDE_FRAMES) * 0.3;
        } else {
          this.stealthEgg.stealthStage = 'STAGE_VISIBLE';
          const visibleElapsed = elapsed - STEALTH_HIDE_FRAMES;
          const visibleTotal = this.stealthEgg.totalLifeFrames - STEALTH_HIDE_FRAMES;
          this.stealthEgg.hiddenAlpha = 0.3 + (visibleElapsed / visibleTotal) * 0.7;
        }
      }
    }

    // 无敌倒计时
    if (this.stealthActive) {
      this.stealthRemainFrames--;
      if (this.stealthRemainFrames <= 0) {
        this.stealthActive = false;
        this.stealthRemainFrames = 0;
        this.onStealthChange?.();
      }
    }
  }

  // ---- 状态查询 ----
  isStealthActive(): boolean {
    return this.stealthActive;
  }

  getStealthRemainFrames(): number {
    return this.stealthRemainFrames;
  }

  getActiveFruits(): {
    bonus: SpecialFruitItem | null;
    egg: SpecialFruitItem | null;
  } {
    return { bonus: this.bonusFruit, egg: this.stealthEgg };
  }

  // ---- 找出占用格子（生成食物时排除） ----
  getOccupiedCells(): Position[] {
    const cells: Position[] = [];
    if (this.bonusFruit) cells.push(this.bonusFruit.position);
    if (this.stealthEgg) cells.push(this.stealthEgg.position);
    return cells;
  }

  // ---- 重置（游戏结束/重新开始） ----
  reset(): void {
    this.bonusFruit = null;
    this.stealthEgg = null;
    this.stealthActive = false;
    this.stealthRemainFrames = 0;
    this.onStealthChange?.();
  }
}