import { Snake } from './snake';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { ScoreManager } from './score';
import { SpecialFruitManager } from './specialFruit';
import { CustomManager } from './customManager';
import { Game } from './game';
import { UIManager } from './ui';
import './style.css';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  // 初始化各模块
  const customManager = new CustomManager();
  const renderer = new Renderer(canvas, customManager);
  const inputHandler = new InputHandler();
  const scoreManager = new ScoreManager();
  const specialFruitManager = new SpecialFruitManager();
  const snake = new Snake();
  const game = new Game(snake, renderer, inputHandler, scoreManager, specialFruitManager);
  const uiManager = new UIManager(game, scoreManager, customManager);

  // 绑定输入
  inputHandler.bind(canvas);

  // 窗口 resize 监听
  const onResize = (): void => {
    renderer.resize();
    game.forceRedraw();
  };
  window.addEventListener('resize', onResize);
  // 横竖屏切换
  window.addEventListener('orientationchange', () => {
    setTimeout(onResize, 200);
  });

  // UI 更新循环（独立于游戏循环，因为游戏循环只在 PLAYING 时渲染）
  function uiLoop(): void {
    uiManager.update();
    requestAnimationFrame(uiLoop);
  }
  uiLoop();

  // 初始渲染
  game.forceRedraw();

  // 销毁处理
  const cleanup = (): void => {
    game.destroy();
    inputHandler.destroy();
    window.removeEventListener('resize', onResize);
  };
  window.addEventListener('beforeunload', cleanup);
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}