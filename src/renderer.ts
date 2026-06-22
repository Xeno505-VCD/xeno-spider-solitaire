import type { Snake } from './snake';
import type { FoodItem, GameConfig } from './types';
import { COLS, ROWS, MIN_CANVAS_SIZE, RESIZE_DEBOUNCE, COLORS } from './constants';
import {
  BONUS_SHRINK_COLOR_OUTER,
  BONUS_SHRINK_COLOR_INNER,
  BONUS_SHRINK_GLOW_COLOR,
  STEALTH_EGG_COLOR,
  STEALTH_EGG_GLOW,
  STEALTH_OVERLAY_ALPHA,
} from './constants';
import type { CustomManager } from './customManager';
import type { SpecialFruitManager } from './specialFruit';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private customManager: CustomManager;
  private scale: number = 20;
  private resizeTimer: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    customManager: CustomManager,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.customManager = customManager;
    this.resize();
  }

  resize(): void {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      const maxW = window.innerWidth * 0.9;
      const maxH = window.innerHeight * 0.5;
      let size = Math.floor(Math.min(maxW, maxH) / COLS) * COLS;
      size = Math.max(MIN_CANVAS_SIZE, size);

      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.canvas.style.width = size + 'px';
      this.canvas.style.height = size + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.scale = size / COLS;
    }, RESIZE_DEBOUNCE);
  }

  draw(
    snake: Snake,
    food: FoodItem,
    specialFruitManager: SpecialFruitManager,
  ): void {
    const ctx = this.ctx;
    const s = this.scale;
    const w = COLS * s;
    const h = ROWS * s;

    // 1. 背景
    const bg = this.customManager.getCurrentBg();
    if (bg.type === 'solid') {
      ctx.fillStyle = bg.solidColor ?? COLORS.bg;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#fafaf8';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = bg.gridLineColor ?? COLORS.gridLine;
      ctx.lineWidth = bg.gridWidth ?? 0.5;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s, 0);
        ctx.lineTo(i * s, h);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * s);
        ctx.lineTo(w, i * s);
        ctx.stroke();
      }
    }

    // 2. 网格线（solid 模式下叠加内部淡网格）
    if (bg.type === 'solid') {
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s, 0);
        ctx.lineTo(i * s, h);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * s);
        ctx.lineTo(w, i * s);
        ctx.stroke();
      }
    }

    // 3. 外围深色边框
    ctx.strokeStyle = COLORS.borderLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);

    // 4. 食物
    const foodStyle = this.customManager.getCurrentFoodStyle();
    const isCircle = foodStyle.drawMode === 'circle';
    this.drawFoodItem(ctx, food, s, foodStyle, isCircle);

    // 5. 特殊果实：缩圈高分果
    const { bonus } = specialFruitManager.getActiveFruits();
    if (bonus) {
      this.drawShrinkBonus(ctx, bonus, s, isCircle);
    }

    // 6. 特殊果实：隐身蛋
    const { egg } = specialFruitManager.getActiveFruits();
    if (egg) {
      this.drawStealthEgg(ctx, egg, s, isCircle);
    }

    // 7. 蛇身
    const skin = this.customManager.getCurrentSnakeSkin();
    const isStealth = specialFruitManager.isStealthActive();
    this.drawSnake(ctx, snake, s, skin, isStealth);

    // 8. 无敌柔光层
    if (isStealth) {
      ctx.save();
      ctx.fillStyle = `rgba(255,215,0,${STEALTH_OVERLAY_ALPHA})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  private drawFoodItem(
    ctx: CanvasRenderingContext2D,
    food: FoodItem,
    s: number,
    foodStyle: ReturnType<CustomManager['getCurrentFoodStyle']>,
    isCircle: boolean,
  ): void {
    let color: string;
    switch (food.type) {
      case 'SPEED_BOOST': color = foodStyle.speedColor; break;
      case 'SLOW_DOWN':  color = foodStyle.slowColor; break;
      default:           color = foodStyle.normalColor; break;
    }

    const cx = food.position.x * s + s / 2;
    const cy = food.position.y * s + s / 2;
    const radius = s / 2 - 2;

    ctx.fillStyle = color;
    if (isCircle) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const padding = 2;
      ctx.fillRect(
        food.position.x * s + padding,
        food.position.y * s + padding,
        s - padding * 2,
        s - padding * 2,
      );
    }
  }

  private drawShrinkBonus(
    ctx: CanvasRenderingContext2D,
    fruit: ReturnType<SpecialFruitManager['getActiveFruits']>['bonus'],
    s: number,
    isCircle: boolean,
  ): void {
    if (!fruit) return;
    const scale = fruit.currentScale;
    const cx = fruit.position.x * s + s / 2;
    const cy = fruit.position.y * s + s / 2;
    const radius = (s / 2) * scale;

    ctx.save();
    ctx.shadowColor = BONUS_SHRINK_GLOW_COLOR;
    ctx.shadowBlur = 10 * scale;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, BONUS_SHRINK_COLOR_INNER);
    grad.addColorStop(1, BONUS_SHRINK_COLOR_OUTER);
    ctx.fillStyle = grad;

    if (isCircle) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const half = (s / 2) * scale;
      const x = cx - half;
      const y = cy - half;
      const size = half * 2;
      const r = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + size - r, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + r);
      ctx.lineTo(x + size, y + size - r);
      ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
      ctx.lineTo(x + r, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    }

    // 分值文字
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.max(10, s * 0.42)}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.floor(fruit.currentScore)}`, cx, cy - radius - 2);
    ctx.restore();
  }

  private drawStealthEgg(
    ctx: CanvasRenderingContext2D,
    egg: ReturnType<SpecialFruitManager['getActiveFruits']>['egg'],
    s: number,
    isCircle: boolean,
  ): void {
    if (!egg) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, egg.hiddenAlpha));
    ctx.fillStyle = STEALTH_EGG_COLOR;

    const cx = egg.position.x * s + s / 2;
    const cy = egg.position.y * s + s / 2;
    const radius = (s / 2) * 0.7;

    if (egg.stealthStage === 'STAGE_VISIBLE') {
      ctx.shadowColor = STEALTH_EGG_GLOW;
      ctx.shadowBlur = 6 + Math.sin(Date.now() / 200) * 3;
    }

    if (isCircle) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const padding = s * 0.15;
      ctx.fillRect(
        egg.position.x * s + padding,
        egg.position.y * s + padding,
        s - padding * 2,
        s - padding * 2,
      );
    }
    ctx.restore();
  }

  private drawSnake(
    ctx: CanvasRenderingContext2D,
    snake: Snake,
    s: number,
    skin: ReturnType<CustomManager['getCurrentSnakeSkin']>,
    isStealth: boolean,
  ): void {
    const body = snake.body;
    const headRadius = skin.headRadius;

    // 绘制蛇身（从尾到头）
    for (let i = body.length - 1; i >= 0; i--) {
      const seg = body[i];
      const x = seg.x * s;
      const y = seg.y * s;

      if (i === 0) {
        // 蛇头
        ctx.fillStyle = skin.headColor;
        if (isStealth) {
          ctx.globalAlpha = 0.35;
        }
        const pad = 1;
        const w = s - pad * 2;
        this.roundRect(ctx, x + pad, y + pad, w, w, headRadius);
        ctx.fill();

        // 眼睛
        if (!isStealth) {
          ctx.fillStyle = '#fff';
          const eyeR = s * 0.12;
          switch (snake.direction) {
            case 'RIGHT':
              this.circle(ctx, x + s * 0.7, y + s * 0.3, eyeR);
              this.circle(ctx, x + s * 0.7, y + s * 0.7, eyeR);
              break;
            case 'LEFT':
              this.circle(ctx, x + s * 0.3, y + s * 0.3, eyeR);
              this.circle(ctx, x + s * 0.3, y + s * 0.7, eyeR);
              break;
            case 'UP':
              this.circle(ctx, x + s * 0.3, y + s * 0.3, eyeR);
              this.circle(ctx, x + s * 0.7, y + s * 0.3, eyeR);
              break;
            case 'DOWN':
              this.circle(ctx, x + s * 0.3, y + s * 0.7, eyeR);
              this.circle(ctx, x + s * 0.7, y + s * 0.7, eyeR);
              break;
          }
          ctx.fill();
        }
        if (isStealth) {
          ctx.globalAlpha = 1;
        }
      } else {
        // 蛇身
        ctx.fillStyle = skin.bodyColor;
        if (isStealth) {
          ctx.globalAlpha = 0.35;
        }
        const pad = 2;
        ctx.fillRect(x + pad, y + pad, s - pad * 2, s - pad * 2);
      }
    }
    if (isStealth) {
      ctx.globalAlpha = 1;
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private circle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }

  getScale(): number {
    return this.scale;
  }

  destroy(): void {
    clearTimeout(this.resizeTimer);
  }
}