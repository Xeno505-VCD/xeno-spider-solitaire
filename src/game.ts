import type { GameConfig, Difficulty } from './types';
import { GameState } from './types';
import {
  COLS,
  ROWS,
  SCORE_PER_FOOD,
  SCORE_PER_SPEED_UP,
  SPEED_STEP,
  SPEED_BOOST_SCORE_MULTIPLIER,
  SLOW_DOWN_SPEED_FACTOR,
  DIFFICULTY_PRESETS,
  POWERUP_DURATION_FRAMES,
} from './constants';
import type { Snake } from './snake';
import type { FoodItem } from './types';
import { generateFood, updateFoodTimer } from './food';
import type { Renderer } from './renderer';
import type { InputHandler } from './input';
import type { ScoreManager } from './score';
import { SpecialFruitManager } from './specialFruit';

export class Game {
  private snake: Snake;
  private food: FoodItem;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private scoreManager: ScoreManager;
  private specialFruitManager: SpecialFruitManager;

  state: GameState = GameState.IDLE;
  config: GameConfig = { wrapMode: false, difficulty: 'normal' };

  private currentSpeed: number;
  private speedMultiplier: number = 1;
  private scoreMultiplier: number = 1;
  private timer: number = 0;
  private animationId: number = 0;
  private lastTimestamp: number = 0;

  private onVisibilityChange: () => void;

  constructor(
    snake: Snake,
    renderer: Renderer,
    inputHandler: InputHandler,
    scoreManager: ScoreManager,
    specialFruitManager: SpecialFruitManager,
  ) {
    this.snake = snake;
    this.renderer = renderer;
    this.inputHandler = inputHandler;
    this.scoreManager = scoreManager;
    this.specialFruitManager = specialFruitManager;

    this.currentSpeed = DIFFICULTY_PRESETS[this.config.difficulty].baseSpeed;

    // 生成初始食物
    const occupied = [
      ...this.snake.getOccupiedCells(),
      ...this.specialFruitManager.getOccupiedCells(),
    ];
    this.food = generateFood(occupied);

    this.onVisibilityChange = () => {
      if (document.hidden && this.state === GameState.PLAYING) {
        this.pause();
      }
    };
  }

  start(): void {
    if (this.state === GameState.PLAYING) return;
    if (this.state === GameState.IDLE || this.state === GameState.GAME_OVER) {
      this.reset();
    }

    this.state = GameState.PLAYING;
    this.lastTimestamp = 0;
    this.timer = 0;
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.loop(0);
  }

  pause(): void {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    cancelAnimationFrame(this.animationId);
  }

  resume(): void {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.lastTimestamp = 0;
    this.loop(0);
  }

  reset(): void {
    cancelAnimationFrame(this.animationId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.snake.resetPosition();
    this.specialFruitManager.reset();
    this.scoreManager.resetCurrent();
    this.speedMultiplier = 1;
    this.scoreMultiplier = 1;
    this.timer = 0;
    this.currentSpeed = DIFFICULTY_PRESETS[this.config.difficulty].baseSpeed;

    const occupied = [
      ...this.snake.getOccupiedCells(),
      ...this.specialFruitManager.getOccupiedCells(),
    ];
    this.food = generateFood(occupied);

    this.state = GameState.IDLE;
  }

  togglePause(): void {
    if (this.state === GameState.PLAYING) {
      this.pause();
    } else if (this.state === GameState.PAUSED) {
      this.resume();
    }
  }

  toggleWrapMode(): void {
    this.config.wrapMode = !this.config.wrapMode;
  }

  setDifficulty(d: Difficulty): void {
    this.config.difficulty = d;
    this.currentSpeed = DIFFICULTY_PRESETS[d].baseSpeed;
  }

  private loop(timestamp: number): void {
    if (this.state !== GameState.PLAYING) return;

    this.animationId = requestAnimationFrame((t) => this.loop(t));

    // 首帧不跳
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      return;
    }

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.timer += delta;

    const effectiveSpeed =
      (this.currentSpeed * this.speedMultiplier) / this.scoreMultiplier;

    if (this.timer >= effectiveSpeed) {
      this.timer -= effectiveSpeed;
      if (this.timer > effectiveSpeed * 3) this.timer = 0; // 防止标签页切回后超加速

      this.step();
    }

    // 道具计时（不受帧步影响，与真实时间同步）
    this.updatePowerUpTimers(delta);
    this.specialFruitManager.update();

    // 渲染
    this.renderer.draw(this.snake, this.food, this.specialFruitManager);
  }

  private step(): void {
    // 1. 读取方向
    const dir = this.inputHandler.getDirection(this.state);
    if (dir) {
      this.snake.setDirection(dir);
    }

    // 2. 移动
    this.snake.move();

    const head = this.snake.getHead();

    // 3. 穿墙处理
    this.handleWrap(head);

    // 4. 撞墙判定（无敌跳过）
    if (!this.specialFruitManager.isStealthActive() && !this.config.wrapMode) {
      if (this.snake.checkWallCollision()) {
        this.gameOver();
        return;
      }
    }

    // 5. 撞自己判定（无敌跳过）
    if (!this.specialFruitManager.isStealthActive()) {
      if (this.snake.checkSelfCollision()) {
        this.gameOver();
        return;
      }
    }

    // 6. 普通食物碰撞
    if (head.x === this.food.position.x && head.y === this.food.position.y) {
      this.eatFood();
    }

    // 7. 特殊果实碰撞
    const specialHit = this.specialFruitManager.checkCollision(head);
    if (specialHit.hit) {
      this.scoreManager.addScore(specialHit.score, this.scoreMultiplier);
      if (specialHit.activateStealth) {
        this.specialFruitManager.activateStealth();
      }
    }
  }

  private eatFood(): void {
    const foodType = this.food.type;

    // 道具效果
    switch (foodType) {
      case 'SPEED_BOOST':
        this.scoreMultiplier = SPEED_BOOST_SCORE_MULTIPLIER;
        break;
      case 'SLOW_DOWN':
        this.speedMultiplier = SLOW_DOWN_SPEED_FACTOR;
        break;
    }

    this.snake.grow();
    this.scoreManager.addScore(SCORE_PER_FOOD, this.scoreMultiplier);

    // 速度递增
    const preset = DIFFICULTY_PRESETS[this.config.difficulty];
    const speedUps = Math.floor(this.scoreManager.currentScore / SCORE_PER_SPEED_UP);
    this.currentSpeed = Math.max(
      preset.minSpeed,
      preset.baseSpeed - speedUps * preset.speedStep,
    );

    // 生成新食物
    const occupied = [
      ...this.snake.getOccupiedCells(),
      ...this.specialFruitManager.getOccupiedCells(),
    ];
    this.food = generateFood(occupied);

    // 尝试生成特殊果实
    const emptyCells = this.getEmptyCells();
    this.specialFruitManager.trySpawnAfterEat(emptyCells);
  }

  private handleWrap(head: { x: number; y: number }): void {
    if (!this.config.wrapMode && !this.specialFruitManager.isStealthActive()) return;
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;
  }

  private updatePowerUpTimers(delta: number): void {
    // 道具在帧步中按 delta 折算帧数 (60fps基准)
    const frameDelta = delta / 16.67;
    const framesToDeduct = Math.floor(frameDelta);

    if (this.food.type !== 'NORMAL') {
      this.food.remainingFrames -= framesToDeduct;
      if (this.food.remainingFrames <= 0) {
        this.resetPowerUps();
      }
    }
  }

  private resetPowerUps(): void {
    this.speedMultiplier = 1;
    this.scoreMultiplier = 1;
    // 重新生成食物替换过期道具
    const occupied = [
      ...this.snake.getOccupiedCells(),
      ...this.specialFruitManager.getOccupiedCells(),
    ];
    this.food = generateFood(occupied);
  }

  private getEmptyCells(): { x: number; y: number }[] {
    const occupied = new Set<string>();
    for (const cell of this.snake.body) {
      occupied.add(`${cell.x},${cell.y}`);
    }
    if (this.food) occupied.add(`${this.food.position.x},${this.food.position.y}`);
    for (const cell of this.specialFruitManager.getOccupiedCells()) {
      occupied.add(`${cell.x},${cell.y}`);
    }

    const cells: { x: number; y: number }[] = [];
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!occupied.has(`${x},${y}`)) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  gameOver(): void {
    this.state = GameState.GAME_OVER;
    cancelAnimationFrame(this.animationId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.specialFruitManager.reset();
    this.scoreManager.saveHighScore();
  }

  forceRedraw(): void {
    this.renderer.draw(this.snake, this.food, this.specialFruitManager);
  }

  getScoreManager(): ScoreManager {
    return this.scoreManager;
  }

  getSpecialFruitManager(): SpecialFruitManager {
    return this.specialFruitManager;
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.destroy();
  }
}