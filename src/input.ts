import type { Direction, Position } from './types';
import { GameState } from './types';
import { SWIPE_THRESHOLD, SWIPE_COOLDOWN } from './constants';

export class InputHandler {
  private directionQueue: Direction[] = [];
  private lastSwipeTime: number = 0;
  private swipeStart: Position | null = null;
  private swipeLockedAxis: 'H' | 'V' | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // 键盘事件绑定
  private onKeyDown = (e: KeyboardEvent): void => {
    const dir = InputHandler.keyToDirection(e.key);
    if (dir) {
      e.preventDefault();
      if (this.directionQueue.length === 0) {
        this.directionQueue.push(dir);
      }
    }
  };

  // 触摸事件绑定
  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    this.swipeStart = { x: touch.clientX, y: touch.clientY };
    this.swipeLockedAxis = null;
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.swipeStart) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.swipeStart.x;
    const dy = touch.clientY - this.swipeStart.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 滑动距离不足阈值 → 忽略
    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      this.swipeStart = null;
      return;
    }

    // 方向锁
    if (this.swipeLockedAxis === null) {
      this.swipeLockedAxis = absDx > absDy ? 'H' : 'V';
    }

    // 冷却检查
    const now = Date.now();
    if (now - this.lastSwipeTime < SWIPE_COOLDOWN) {
      this.swipeStart = null;
      return;
    }
    this.lastSwipeTime = now;

    let dir: Direction | null = null;
    if (this.swipeLockedAxis === 'H') {
      dir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      dir = dy > 0 ? 'DOWN' : 'UP';
    }

    if (dir && this.directionQueue.length === 0) {
      this.directionQueue.push(dir);
    }

    this.swipeStart = null;
  };

  private static keyToDirection(key: string): Direction | null {
    switch (key) {
      case 'ArrowUp':    return 'UP';
      case 'ArrowDown':  return 'DOWN';
      case 'ArrowLeft':  return 'LEFT';
      case 'ArrowRight': return 'RIGHT';
      // WASD 兼容
      case 'w': case 'W': return 'UP';
      case 's': case 'S': return 'DOWN';
      case 'a': case 'A': return 'LEFT';
      case 'd': case 'D': return 'RIGHT';
      default:           return null;
    }
  }

  bind(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    // 键盘
    document.addEventListener('keydown', this.onKeyDown);
    // 触摸
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  getDirection(gameState: GameState): Direction | null {
    if (gameState !== GameState.PLAYING) return null;
    return this.directionQueue.shift() || null;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
    }
  }
}