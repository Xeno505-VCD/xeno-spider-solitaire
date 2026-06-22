import { GameState } from './types';
import type { Game } from './game';
import type { ScoreManager } from './score';
import type { CustomManager } from './customManager';
import type { SnakeSkinId, CanvasBgId, FoodStyleId, Difficulty } from './types';

const SKIN_IDS: SnakeSkinId[] = ['default_green', 'dark_blue'];
const BG_IDS: CanvasBgId[] = ['solid_light', 'grid_paper'];
const FOOD_IDS: FoodStyleId[] = ['classic_color', 'round_icon'];

export class UIManager {
  private game: Game;
  private scoreManager: ScoreManager;
  private customManager: CustomManager;

  private highScoreEl: HTMLElement;
  private currentScoreEl: HTMLElement;
  private gameOverOverlay: HTMLElement;
  private finalScoreText: HTMLElement;
  private finalHighText: HTMLElement;
  private pauseOverlay: HTMLElement;
  private startOverlay: HTMLElement;
  private stealthIndicator: HTMLElement;
  private wrapBtn: HTMLElement;
  private selDifficulty: HTMLSelectElement;

  private btnSkin: HTMLElement;
  private btnBg: HTMLElement;
  private btnFood: HTMLElement;
  private toastEl: HTMLElement;
  private helpPopup: HTMLElement;
  private feedbackPopup: HTMLElement;
  private feedbackTextarea: HTMLTextAreaElement;

  private toastTimer: number = 0;

  constructor(
    game: Game,
    scoreManager: ScoreManager,
    customManager: CustomManager,
  ) {
    this.game = game;
    this.scoreManager = scoreManager;
    this.customManager = customManager;

    this.highScoreEl = document.getElementById('high-score')!;
    this.currentScoreEl = document.getElementById('current-score')!;
    this.gameOverOverlay = document.getElementById('game-over-overlay')!;
    this.finalScoreText = document.getElementById('final-score-text')!;
    this.finalHighText = document.getElementById('final-high-text')!;
    this.pauseOverlay = document.getElementById('pause-overlay')!;
    this.startOverlay = document.getElementById('start-overlay')!;
    this.stealthIndicator = document.getElementById('stealth-indicator')!;
    this.wrapBtn = document.getElementById('btn-wrap')!;
    this.selDifficulty = document.getElementById('sel-difficulty') as HTMLSelectElement;
    this.toastEl = document.getElementById('toast')!;

    this.btnSkin = document.getElementById('btn-skin')!;
    this.btnBg = document.getElementById('btn-bg')!;
    this.btnFood = document.getElementById('btn-food')!;
    this.helpPopup = document.getElementById('help-popup')!;
    this.feedbackPopup = document.getElementById('feedback-popup')!;
    this.feedbackTextarea = document.getElementById('feedback-textarea') as HTMLTextAreaElement;

    this.highScoreEl.textContent = String(this.scoreManager.highScore);
    this.currentScoreEl.textContent = '0';

    // 初始化：设置皮肤/背景/食物按钮的 title
    this.syncCustomButtonTitles();

    this.bindEvents();
  }

  // ========== 事件绑定 ==========

  private bindEvents(): void {
    // 🎬 开始界面按钮
    document.getElementById('btn-start-game')!.addEventListener('click', () => {
      this.game.start();
      this.startOverlay.classList.add('hidden');
      this.toast('Game Start');
    });

    // 🔄 重新开始（HUD 按钮）
    document.getElementById('btn-restart')!.addEventListener('click', () => {
      this.game.start();
      this.gameOverOverlay.classList.add('hidden');
      this.pauseOverlay.classList.add('hidden');
      this.toast('Restart');
    });

    // 🔄 再来一局（游戏结束弹窗内）
    document.getElementById('btn-restart-overlay')!.addEventListener('click', () => {
      this.game.start();
      this.gameOverOverlay.classList.add('hidden');
      this.toast('Restart');
    });

    // ⏯ Pause / Resume
    document.getElementById('btn-pause')!.addEventListener('click', () => {
      this.game.togglePause();
      if (this.game.state === GameState.PAUSED) {
        this.pauseOverlay.classList.remove('hidden');
        this.toast('Paused');
      } else if (this.game.state === GameState.PLAYING) {
        this.pauseOverlay.classList.add('hidden');
        this.toast('Resumed');
      }
    });

    // ▶ Resume (pause overlay)
    document.getElementById('btn-resume')!.addEventListener('click', () => {
      this.game.resume();
      this.pauseOverlay.classList.add('hidden');
      this.toast('Resumed');
    });

    // 🔁 Wall Wrap
    this.wrapBtn.addEventListener('click', () => {
      this.game.toggleWrapMode();
      this.updateWrapButton();
      const label = this.game.config.wrapMode ? 'Wall Wrap: ON' : 'Wall Wrap: OFF';
      this.toast(label);
    });

    // ▼ Difficulty
    this.selDifficulty.addEventListener('change', () => {
      const val = this.selDifficulty.value as Difficulty;
      this.game.setDifficulty(val);
      const labels: Record<Difficulty, string> = {
        easy: 'Difficulty: Easy',
        normal: 'Difficulty: Normal',
        hard: 'Difficulty: Hard',
      };
      this.toast(labels[val]);
    });

    // 🐍 皮肤循环切换
    this.btnSkin.addEventListener('click', () => {
      const current = this.customManager.getCurrentConfig().snakeSkin;
      const idx = SKIN_IDS.indexOf(current);
      const next = SKIN_IDS[(idx + 1) % SKIN_IDS.length];
      this.customManager.changeSnakeSkin(next);
      const label = this.getSkinLabel(next);
      this.btnSkin.title = label;
      this.toast(label);
      this.game.forceRedraw();
    });

    // 🖼 背景循环切换
    this.btnBg.addEventListener('click', () => {
      const current = this.customManager.getCurrentConfig().canvasBg;
      const idx = BG_IDS.indexOf(current);
      const next = BG_IDS[(idx + 1) % BG_IDS.length];
      this.customManager.changeBg(next);
      const label = this.getBgLabel(next);
      this.btnBg.title = label;
      this.toast(label);
      this.game.forceRedraw();
    });

    // 🍎 食物样式循环切换
    this.btnFood.addEventListener('click', () => {
      const current = this.customManager.getCurrentConfig().foodStyle;
      const idx = FOOD_IDS.indexOf(current);
      const next = FOOD_IDS[(idx + 1) % FOOD_IDS.length];
      this.customManager.changeFoodStyle(next);
      const label = this.getFoodLabel(next);
      this.btnFood.title = label;
      this.toast(label);
      this.game.forceRedraw();
    });

    // ❓ Help button
    document.getElementById('btn-help')!.addEventListener('click', () => {
      this.helpPopup.classList.toggle('hidden');
    });

    // 💬 Feedback button
    document.getElementById('btn-feedback')!.addEventListener('click', () => {
      this.feedbackPopup.classList.remove('hidden');
    });
    document.getElementById('btn-feedback-submit')!.addEventListener('click', () => {
      this.feedbackPopup.classList.add('hidden');
      this.feedbackTextarea.value = '';
      this.toast('Thank you! Feedback sent.');
    });
    document.getElementById('btn-feedback-close')!.addEventListener('click', () => {
      this.feedbackPopup.classList.add('hidden');
    });

    // 无敌状态回调
    this.game.getSpecialFruitManager().setOnStealthChange(() => {
      this.updateStealthIndicator();
    });
  }

  // ========== 每帧更新 ==========

  update(): void {
    this.currentScoreEl.textContent = String(this.scoreManager.currentScore);
    this.highScoreEl.textContent = String(this.scoreManager.highScore);
    this.updateStealthIndicator();

    if (this.game.state === GameState.GAME_OVER) {
      this.gameOverOverlay.classList.remove('hidden');
      this.pauseOverlay.classList.add('hidden');
      this.finalScoreText.textContent = `Score: ${this.scoreManager.currentScore}`;
      this.finalHighText.textContent = `Best: ${this.scoreManager.highScore}`;
    } else if (this.game.state === GameState.PLAYING) {
      this.gameOverOverlay.classList.add('hidden');
      this.pauseOverlay.classList.add('hidden');
    } else if (this.game.state === GameState.PAUSED) {
      this.pauseOverlay.classList.remove('hidden');
    }
  }

  // ========== Toast 浮动提示 ==========

  private toast(text: string): void {
    clearTimeout(this.toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    // 强制回流后添加动画类
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('show');
      // 等过渡动画结束后隐藏
      setTimeout(() => {
        if (!this.toastEl.classList.contains('show')) {
          this.toastEl.classList.add('hidden');
        }
      }, 300);
    }, 800);
  }

  // ========== 内部辅助 ==========

  private updateWrapButton(): void {
    this.wrapBtn.title = this.game.config.wrapMode
      ? 'Wall Wrap: ON'
      : 'Wall Wrap: OFF';
    this.wrapBtn.style.background = this.game.config.wrapMode
      ? 'rgba(76, 175, 80, 0.4)'
      : '';
  }

  private updateStealthIndicator(): void {
    const sfManager = this.game.getSpecialFruitManager();
    if (sfManager.isStealthActive()) {
      this.stealthIndicator.classList.remove('hidden');
      const seconds = sfManager.getStealthRemainFrames() / 60;
      this.stealthIndicator.title = `Invincible ${seconds.toFixed(1)}s`;
    } else {
      this.stealthIndicator.classList.add('hidden');
    }
  }

  private syncCustomButtonTitles(): void {
    const config = this.customManager.getCurrentConfig();
    this.btnSkin.title = this.getSkinLabel(config.snakeSkin);
    this.btnBg.title = this.getBgLabel(config.canvasBg);
    this.btnFood.title = this.getFoodLabel(config.foodStyle);
  }

  private getSkinLabel(id: SnakeSkinId): string {
    return id === 'default_green' ? 'Skin: Classic Green' : 'Skin: Deep Ocean';
  }

  private getBgLabel(id: CanvasBgId): string {
    return id === 'solid_light' ? 'Background: Light Beige' : 'Background: Grid Paper';
  }

  private getFoodLabel(id: FoodStyleId): string {
    return id === 'classic_color' ? 'Food Style: Classic Block' : 'Food Style: Circle';
  }
}