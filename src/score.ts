import { LS_HIGH_SCORE_KEY } from './constants';

export class ScoreManager {
  currentScore: number = 0;
  highScore: number = 0;

  constructor() {
    this.loadHighScore();
  }

  private loadHighScore(): void {
    try {
      const stored = localStorage.getItem(LS_HIGH_SCORE_KEY);
      if (stored !== null) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) {
          this.highScore = val;
        }
      }
    } catch {
      this.highScore = 0;
    }
  }

  addScore(points: number, multiplier: number = 1): void {
    this.currentScore += points * multiplier;
  }

  saveHighScore(): void {
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      try {
        localStorage.setItem(LS_HIGH_SCORE_KEY, String(this.highScore));
      } catch {
        // localStorage 不可用时静默失败
      }
    }
  }

  resetCurrent(): void {
    this.currentScore = 0;
  }
}