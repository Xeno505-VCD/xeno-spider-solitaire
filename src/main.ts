// XENO Spider Solitaire - Main Entry
// v2.5: 游戏内工具栏 + 自定义按钮组选择器

import type { GameState } from './o_module/types';
import { Difficulty, Atmosphere } from './o_module/types';
import { initGameState, getAllValidMoves, canDealFromStock, dealFromStock } from './e_module/engine';
import { renderGame, calculateLayout, clearParticles, startFlipAnimation, startDealAnimation } from './x_module/renderer';
import { playCardFlip, playSequenceComplete, playVictory, playInvalid, playDealCards } from './audio';
import { InputManager } from './n_module/input';
import type { InputCallbacks } from './n_module/input';
import {
  clearSessionCache, loadSettings, saveSettings,
  loadHonorData, updateHonorAfterVictory, getCleanRankName,
} from './o_module/storage';

// --- DOM & Canvas Setup ---

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let cssW = 0;
let cssH = 0;

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  cssW = rect.width;
  cssH = rect.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fullSizeCanvas(): void {
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  resizeCanvas();
}

// --- Game State ---

let settings = loadSettings();
let currentState: GameState = initGameState(Difficulty.HARD, settings.atmosphere);
let inputManager: InputManager | null = null;
let gameStarted = false;

let animationId = 0;
let lastTime = 0;
let invalidMoveFlash = 0;
let victoryAlpha = 0;

let showFlipHint = false;
let showEmptyColWarning = false;
let showDeadEndHint = false;

// --- UI: Custom Styled Button Group ---

function createButtonGroup(
  options: { value: string; label: string; selected: boolean }[],
  accentColor: string,
  onChange: (value: string) => void
): HTMLDivElement {
  const group = document.createElement('div');
  group.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap;';

  for (const opt of options) {
    const btn = document.createElement('div');
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;

    const updateStyle = (selected: boolean) => {
      btn.style.cssText = `
        flex:1; min-width:60px; padding:10px 8px; text-align:center;
        border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;
        transition: all 0.2s ease; white-space:nowrap;
        border:1.5px solid ${selected ? accentColor : 'rgba(85,102,119,0.4)'};
        background:${selected ? accentColor.replace(')', ',0.15)').replace('rgb', 'rgba') : 'transparent'};
        color:${selected ? accentColor : '#8899AA'};
        ${selected ? 'box-shadow: 0 0 12px ' + accentColor.replace(')', ',0.2)').replace('rgb', 'rgba') : ''};
      `;
    };

    if (opt.selected) {
      // Workaround for rgba conversion
      btn.style.cssText = `
        flex:1; min-width:60px; padding:10px 8px; text-align:center;
        border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;
        border:1.5px solid ${accentColor};
        background:${accentColor}22;
        color:${accentColor};
        box-shadow: 0 0 12px ${accentColor}33;
      `;
    } else {
      btn.style.cssText = `
        flex:1; min-width:60px; padding:10px 8px; text-align:center;
        border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;
        border:1.5px solid rgba(85,102,119,0.4);
        background:transparent; color:#8899AA;
      `;
    }

    btn.addEventListener('click', () => {
      onChange(opt.value);
      // Re-render all siblings
      const allBtns = group.querySelectorAll('div');
      allBtns.forEach((b) => {
        const el = b as HTMLDivElement;
        if (el === btn) {
          el.style.background = accentColor + '22';
          el.style.color = accentColor;
          el.style.borderColor = accentColor;
          el.style.boxShadow = '0 0 12px ' + accentColor + '33';
        } else {
          el.style.background = 'transparent';
          el.style.color = '#8899AA';
          el.style.borderColor = 'rgba(85,102,119,0.4)';
          el.style.boxShadow = 'none';
        }
      });
    });

    group.appendChild(btn);
  }

  return group;
}

let selDifficulty = Difficulty.HARD;
let selAtmosphere = settings.atmosphere;

// --- UI Elements ---

function createOverlay(): HTMLElement {
  const overlay = document.getElementById('xeno-overlay');
  if (overlay) return overlay;
  const el = document.createElement('div');
  el.id = 'xeno-overlay';
  el.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 20;
  `;
  document.getElementById('app')!.appendChild(el);
  return el;
}

function getOverlay(): HTMLElement {
  return document.getElementById('xeno-overlay') || createOverlay() as HTMLElement;
}

function showMenu(): void {
  const overlay = getOverlay();
  overlay.innerHTML = '';

  const honor = loadHonorData();
  const rank = getCleanRankName(honor.rank);
  selDifficulty = currentState.difficulty;
  selAtmosphere = settings.atmosphere;

  const container = document.createElement('div');
  container.style.cssText = `
    background: rgba(10, 14, 23, 0.95); border: 1px solid rgba(0, 229, 255, 0.3);
    border-radius: 16px; padding: 28px 24px; width: 360px; max-width: 90vw;
    pointer-events: all; color: white; font-family: 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 0 40px rgba(0, 229, 255, 0.1);
  `;

  // Build custom difficulty selector
  const diffOptions = [
    { value: '1', label: '🟢 初级', selected: selDifficulty === Difficulty.EASY },
    { value: '2', label: '🟡 中级', selected: selDifficulty === Difficulty.MEDIUM },
    { value: '4', label: '🔴 高级', selected: selDifficulty === Difficulty.HARD },
  ];
  const diffGroup = createButtonGroup(diffOptions, '#00E5FF', (v) => {
    selDifficulty = parseInt(v) as Difficulty;
  });

  // Build custom atmosphere selector
  const atmOptions = [
    { value: '0', label: '🌌 深空', selected: selAtmosphere === Atmosphere.DEEP_SPACE },
    { value: '1', label: '💥 脉冲', selected: selAtmosphere === Atmosphere.PULSAR_STORM },
    { value: '2', label: '🌿 生态', selected: selAtmosphere === Atmosphere.BIO_CHAMBER },
  ];
  const atmGroup = createButtonGroup(atmOptions, '#D500F9', (v) => {
    selAtmosphere = parseInt(v) as Atmosphere;
  });

  // Build the HTML
  const titleEl = document.createElement('h2');
  titleEl.style.cssText = 'text-align:center; color:#00E5FF; margin:0 0 4px; font-size:20px;';
  titleEl.textContent = 'XENO · 异星织网者';

  const rankEl = document.createElement('div');
  rankEl.style.cssText = 'text-align:center; color:#8899AA; margin-bottom:12px; font-size:11px;';
  rankEl.innerHTML = `织网者评级: <span style="color:#D500F9;">${rank}</span> | 总能源: <span style="color:#FFB800;">${honor.totalEnergy}</span>`;

  // Difficulty section
  const diffLabel = document.createElement('div');
  diffLabel.style.cssText = 'color:#8899AA; font-size:11px; margin-bottom:6px;';
  diffLabel.textContent = '难度调制器';

  const diffWrapper = document.createElement('div');
  diffWrapper.style.cssText = 'margin-bottom:12px;';
  diffWrapper.appendChild(diffGroup);

  // Atmosphere section
  const atmLabel = document.createElement('div');
  atmLabel.style.cssText = 'color:#8899AA; font-size:11px; margin-bottom:6px;';
  atmLabel.textContent = '氛围调制器';

  const atmWrapper = document.createElement('div');
  atmWrapper.style.cssText = 'margin-bottom:12px;';
  atmWrapper.appendChild(atmGroup);

  // New Game button
  const btnNew = document.createElement('button');
  btnNew.id = 'btn-new';
  btnNew.style.cssText = `
    width:100%; padding:12px; margin-bottom:8px; border:1px solid #00E5FF;
    background:rgba(0,229,255,0.1); color:#00E5FF; border-radius:8px;
    cursor:pointer; font-size:14px; font-weight:bold;
  `;
  btnNew.textContent = '🕷️ 新任务';

  // Resume button
  const btnResume = document.createElement('button');
  btnResume.id = 'btn-resume';
  btnResume.style.cssText = `
    width:100%; padding:12px; margin-bottom:8px; border:1px solid #D500F9;
    background:rgba(213,0,249,0.1); color:#D500F9; border-radius:8px;
    cursor:pointer; font-size:14px; font-weight:bold;
  `;
  btnResume.textContent = '▶ 继续织网';

  // Settings button
  const btnSettings = document.createElement('button');
  btnSettings.id = 'btn-menu-settings';
  btnSettings.style.cssText = `
    width:100%; padding:10px; border:1px solid rgba(85,102,119,0.5);
    background:transparent; color:#8899AA; border-radius:8px;
    cursor:pointer; font-size:12px;
  `;
  btnSettings.textContent = '⚙ 设置与快捷键';

  // Footer
  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'text-align:center; color:#334; font-size:10px; margin-top:8px;';
  footerEl.textContent = 'XENO Personal Game | 纯单机自用版';

  container.appendChild(titleEl);
  container.appendChild(rankEl);
  container.appendChild(diffLabel);
  container.appendChild(diffWrapper);
  container.appendChild(atmLabel);
  container.appendChild(atmWrapper);
  container.appendChild(btnNew);
  container.appendChild(btnResume);
  container.appendChild(btnSettings);
  container.appendChild(footerEl);

  overlay.appendChild(container);

  btnNew.onclick = () => {
    settings.atmosphere = selAtmosphere;
    saveSettings(settings);
    startNewGame(selDifficulty, selAtmosphere);
    overlay.innerHTML = '';
  };
  btnResume.onclick = () => {
    if (!gameStarted) {
      startNewGame(selDifficulty, selAtmosphere);
    }
    overlay.innerHTML = '';
  };
  btnSettings.onclick = () => showSettingsPanel();
}

function showSettingsPanel(): void {
  const overlay = getOverlay();
  overlay.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = `
    background: rgba(10, 14, 23, 0.95); border: 1px solid rgba(0, 229, 255, 0.3);
    border-radius: 16px; padding: 28px; min-width: 300px; max-width: 90vw;
    pointer-events: all; color: white; font-family: 'Segoe UI', Arial, sans-serif;
  `;

  const titleEl = document.createElement('h3');
  titleEl.style.cssText = 'color:#00E5FF; margin:0 0 12px; text-align:center;';
  titleEl.textContent = '⚙ 设置与帮助';

  const contentEl = document.createElement('div');
  contentEl.style.cssText = 'color:#8899AA; font-size:12px; line-height:1.8; margin-bottom:12px;';
  contentEl.innerHTML = `
    <b style="color:#00FFCC;">策略提示</b><br>
     优先翻开暗牌获取信息<br>
    📦 不要轻易填满最后一个空列<br>
    🃏 尽量构建同花色连续序列
  `;

  // In-game action buttons
  const btnUndo = document.createElement('button');
  btnUndo.style.cssText = `
    width:100%; padding:10px; margin-bottom:6px; border:1px solid #FFB800;
    background:rgba(255,184,0,0.1); color:#FFB800; border-radius:8px;
    cursor:pointer; font-size:13px;
  `;
  btnUndo.textContent = '↩ 撤销上一步 (Ctrl+Z)';

  const btnNewGame = document.createElement('button');
  btnNewGame.style.cssText = `
    width:100%; padding:10px; margin-bottom:6px; border:1px solid #00E5FF;
    background:rgba(0,229,255,0.1); color:#00E5FF; border-radius:8px;
    cursor:pointer; font-size:13px;
  `;
  btnNewGame.textContent = '🕷️ 新任务 (Ctrl+N)';

  const btnBack = document.createElement('button');
  btnBack.style.cssText = `
    width:100%; padding:10px; margin-bottom:6px; border:1px solid #D500F9;
    background:rgba(213,0,249,0.1); color:#D500F9; border-radius:8px;
    cursor:pointer; font-size:13px;
  `;
  btnBack.textContent = '🏠 返回主菜单';

  const btnClose = document.createElement('button');
  btnClose.style.cssText = `
    width:100%; padding:10px; border:1px solid #556;
    background:transparent; color:#8899AA; border-radius:8px;
    cursor:pointer; font-size:12px;
  `;
  btnClose.textContent = '✕ 关闭';

  container.appendChild(titleEl);
  container.appendChild(contentEl);
  if (gameStarted) {
    container.appendChild(btnUndo);
    container.appendChild(btnNewGame);
    container.appendChild(btnBack);
  }
  container.appendChild(btnClose);

  overlay.appendChild(container);

  btnUndo.onclick = () => { inputManager?.undoLastMove(); };
  btnNewGame.onclick = () => {
    startNewGame(currentState.difficulty, currentState.atmosphere);
    overlay.innerHTML = '';
  };
  btnBack.onclick = () => {
    overlay.innerHTML = '';
    showMenu();
  };
  btnClose.onclick = () => { overlay.innerHTML = ''; };
}

function showVictoryOverlay(): void {
  const overlay = getOverlay();
  overlay.innerHTML = '';

  const honor = loadHonorData();

  const container = document.createElement('div');
  container.style.cssText = `
    background: rgba(10, 14, 23, 0.95); border: 2px solid rgba(0, 255, 204, 0.6);
    border-radius: 16px; padding: 36px 28px; width: 360px; max-width: 90vw; text-align: center;
    pointer-events: all; color: white; font-family: 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 0 60px rgba(0, 255, 204, 0.3);
    animation: xenoPulse 2s ease-in-out infinite;
  `;
  container.innerHTML = `
    <div style="font-size:48px; margin-bottom:8px;">🌟</div>
    <h2 style="color:#00FFCC; margin:0 0 8px; font-size:24px;">XENO CORE SYNCED</h2>
    <p style="color:#8899AA; margin:0 0 8px;">恭喜完成XENO专属对局！</p>
    <div style="color:#00E5FF; font-size:14px; margin-bottom:4px;">
      本次能源: <span style="color:#FFB800; font-size:20px;">${currentState.score}</span>
    </div>
    <div style="color:#8899AA; font-size:12px; margin-bottom:16px;">
      步数: ${currentState.moves} | 评级: ${getCleanRankName(honor.rank)}
    </div>
  `;

  const btnNew = document.createElement('button');
  btnNew.style.cssText = `
    width:100%; padding:12px; border:1px solid #00FFCC; margin-bottom:8px;
    background:rgba(0,255,204,0.1); color:#00FFCC; border-radius:8px;
    cursor:pointer; font-size:14px; font-weight:bold;
  `;
  btnNew.textContent = '🔄 开启新任务';

  const btnClose = document.createElement('button');
  btnClose.style.cssText = `
    width:100%; padding:10px; border:1px solid #556;
    background:transparent; color:#8899AA; border-radius:8px;
    cursor:pointer; font-size:12px;
  `;
  btnClose.textContent = '返回主菜单';

  container.appendChild(btnNew);
  container.appendChild(btnClose);
  overlay.appendChild(container);

  btnNew.onclick = () => {
    startNewGame(currentState.difficulty, currentState.atmosphere);
    overlay.innerHTML = '';
  };
  btnClose.onclick = () => {
    overlay.innerHTML = '';
    showMenu();
  };
}

// --- Confirm Dialog (XENO style, replaces browser confirm) ---

function showConfirmDialog(
  message: string,
  confirmLabel: string,
  confirmColor: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  const overlay = getOverlay();
  // Don't stack confirm dialogs
  if (overlay.querySelector('.xeno-confirm')) return;
  overlay.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'xeno-confirm';
  container.style.cssText = `
    background: rgba(10, 14, 23, 0.95); border: 1px solid rgba(255, 51, 102, 0.4);
    border-radius: 16px; padding: 28px 24px; width: 340px; max-width: 90vw;
    pointer-events: all; color: white; font-family: 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 0 30px rgba(255, 51, 102, 0.15);
    text-align: center;
  `;

  const msgEl = document.createElement('p');
  msgEl.style.cssText = 'color:#CCCCCC; font-size:14px; margin:0 0 20px; line-height:1.6;';
  msgEl.textContent = message;

  const btnConfirm = document.createElement('button');
  btnConfirm.style.cssText = `
    width:100%; padding:12px; margin-bottom:8px; border:1.5px solid ${confirmColor};
    background:${confirmColor}18; color:${confirmColor}; border-radius:8px;
    cursor:pointer; font-size:14px; font-weight:bold;
  `;
  btnConfirm.textContent = confirmLabel;

  const btnCancel = document.createElement('button');
  btnCancel.style.cssText = `
    width:100%; padding:10px; border:1px solid #556;
    background:transparent; color:#8899AA; border-radius:8px;
    cursor:pointer; font-size:12px;
  `;
  btnCancel.textContent = '✕ 取消';

  container.appendChild(msgEl);
  container.appendChild(btnConfirm);
  container.appendChild(btnCancel);
  overlay.appendChild(container);

  btnConfirm.onclick = () => {
    overlay.innerHTML = '';
    onConfirm();
  };
  btnCancel.onclick = () => {
    overlay.innerHTML = '';
    onCancel?.();
  };
}

// --- Toolbar ---

function createToolbar(): HTMLDivElement {
  const bar = document.createElement('div');
  bar.id = 'xeno-toolbar';
  bar.style.cssText = `
    position: fixed; top: 10px; left: 10px; z-index: 15;
    display: flex; gap: 6px;
  `;
  document.getElementById('app')!.appendChild(bar);

  const btnStyle = `
    padding: 8px 14px; border-radius: 8px; cursor: pointer;
    font-size: 13px; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;
    border:1.5px solid rgba(255,255,255,0.15);
    background:rgba(10,14,23,0.8); color:#FFFFFF;
    backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
    transition: all 0.2s ease;
  `;

  const btnUndo = document.createElement('button');
  btnUndo.style.cssText = btnStyle;
  btnUndo.textContent = '↩ 撤销';
  btnUndo.onclick = () => inputManager?.undoLastMove();

  const btnRestart = document.createElement('button');
  btnRestart.style.cssText = btnStyle;
  btnRestart.textContent = '🔄 重开';
  btnRestart.onclick = () => {
    showConfirmDialog(
      '确定要重新开局吗？当前进度将丢失。',
      '✓ 确定重开',
      '#FF3366',
      () => startNewGame(currentState.difficulty, currentState.atmosphere)
    );
  };

  const btnMenu = document.createElement('button');
  btnMenu.style.cssText = btnStyle;
  btnMenu.textContent = '⚙ 菜单';
  btnMenu.onclick = () => showSettingsPanel();

  bar.appendChild(btnUndo);
  bar.appendChild(btnRestart);
  bar.appendChild(btnMenu);

  return bar;
}

function updateToolbarVisibility(visible: boolean): void {
  const bar = document.getElementById('xeno-toolbar');
  if (bar) bar.style.display = visible ? 'flex' : 'none';
}

// --- Game Loop ---

function startNewGame(difficulty: Difficulty, atmosphere: Atmosphere): void {
  clearParticles();
  currentState = initGameState(difficulty, atmosphere);
  inputManager?.pushHistory(currentState);
  gameStarted = true;
  victoryAlpha = 0;
  showFlipHint = false;
  showEmptyColWarning = false;
  showDeadEndHint = false;
  updateToolbarVisibility(true);
}

function updateStrategyHints(): void {
  const moves = getAllValidMoves(currentState);
  showFlipHint = false;
  for (const m of moves) {
    const col = currentState.columns[m.from];
    if (col.cards[m.cardIdx] && col.cards.length > 1) {
      const below = col.cards[m.cardIdx - 1];
      if (m.from !== -1 && !below?.faceUp) { showFlipHint = true; break; }
    }
  }
  const emptyCols = currentState.columns.filter(c => c.cards.length === 0).length;
  showEmptyColWarning = emptyCols === 1 && moves.length > 0;
  showDeadEndHint = moves.length === 0 && !canDealFromStock(currentState) && !currentState.victory;
}

function gameLoop(time: number): void {
  animationId = requestAnimationFrame(gameLoop);

  const dt = time - lastTime;
  lastTime = time;

  fullSizeCanvas();
  const layout = calculateLayout(cssW, cssH);
  inputManager?.updateLayout(layout);

  if (Math.floor(time / 500) !== Math.floor((time - dt) / 500)) {
    updateStrategyHints();
  }

  ctx.clearRect(0, 0, cssW, cssH);
  const dragState = inputManager?.getDragState() || null;
  renderGame(ctx, cssW, cssH, currentState, dragState, layout);
  drawStrategyHints(ctx, cssW, cssH);

  if (invalidMoveFlash > 0) {
    ctx.fillStyle = `rgba(255, 51, 102, ${invalidMoveFlash * 0.3})`;
    ctx.fillRect(0, 0, cssW, cssH);
    invalidMoveFlash -= dt / 500;
    if (invalidMoveFlash < 0) invalidMoveFlash = 0;
  }

  if (currentState.victory) {
    victoryAlpha += dt / 2000;
    if (victoryAlpha > 1) victoryAlpha = 1;
    ctx.fillStyle = `rgba(0, 255, 204, ${victoryAlpha * 0.08})`;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = `rgba(0, 255, 204, ${victoryAlpha})`;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('XENO', cssW / 2, cssH / 2 - 20);
  }
}

function drawStrategyHints(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  if (currentState.gameOver || currentState.victory) return;

  let hintText = '';
  let hintColor = '';

  if (showDeadEndHint) {
    hintText = '⚠ 无可用移动 — 请按 Ctrl+Z 撤销重试';
    hintColor = '#FF3366';
  } else if (showEmptyColWarning) {
    hintText = '⚠ 仅剩最后一个空列，请谨慎操作';
    hintColor = '#FFB800';
  } else if (showFlipHint) {
    hintText = '💡 翻开暗牌是当前最优策略';
    hintColor = '#00FFCC';
  }

  if (hintText) {
    ctx.fillStyle = hintColor;
    ctx.globalAlpha = 0.75 + Math.sin(performance.now() / 600) * 0.2;
    const isMobile = w < 768;
    ctx.font = isMobile ? 'bold 11px "Segoe UI", Arial, sans-serif' : 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(hintText, w / 2, isMobile ? 50 : 70);
    ctx.globalAlpha = 1;
  }
}

// --- Input Callbacks ---

let lastCompleted = 0;

const callbacks: InputCallbacks = {
  onStateChange(newState: GameState) {
    const prev = currentState;
    currentState = newState;

    // Detect card flip
    for (let col = 0; col < 10; col++) {
      for (let ci = 0; ci < Math.min(prev.columns[col]?.cards.length || 0, newState.columns[col]?.cards.length || 0); ci++) {
        if (!prev.columns[col].cards[ci]?.faceUp && newState.columns[col].cards[ci]?.faceUp) {
          startFlipAnimation(col, ci);
          playCardFlip();
          break;
        }
      }
    }

    // Detect sequence completion
    if (newState.completed > lastCompleted) {
      playSequenceComplete();
    }
    lastCompleted = newState.completed;

    if (newState.victory) {
      updateHonorAfterVictory(newState.score);
      updateToolbarVisibility(false);
      playVictory();
      setTimeout(() => showVictoryOverlay(), 800);
    }
  },
  onInvalidMove() { invalidMoveFlash = 1; playInvalid(); },
  onNewGame() { startNewGame(currentState.difficulty, currentState.atmosphere); },
  onUndo() { inputManager?.undoLastMove(); },
  onSettings() { showSettingsPanel(); },
  onDealStart(state: GameState) {
    // Start deal animation from stock (with re-entrancy guard)
    const layout = calculateLayout(cssW, cssH);
    const cards = state.stock.slice(0, 10).map(c => ({ ...c, faceUp: true }));
    // Calculate end Y for each column (bottom of existing cards)
    const endYs: number[] = [];
    for (let col = 0; col < 10; col++) {
      const column = state.columns[col];
      const cardCount = column.cards.length;
      if (cardCount === 0) {
        endYs.push(layout.columnY);
      } else {
        let cy = layout.columnY;
        for (let ci = 0; ci < cardCount; ci++) {
          const isMobile = layout.isMobile;
          const effOffset = isMobile ? (cardCount > 10 ? 8 : 16) : (cardCount > 13 ? 14 : 36);
          const effOffsetBack = effOffset * (isMobile ? 0.75 : 0.78);
          cy += column.cards[ci].faceUp ? effOffset : effOffsetBack;
        }
        endYs.push(cy);
      }
    }
    const callback = () => {
      const newState = dealFromStock(state);
      if (newState) {
        currentState = newState;
        if (inputManager) inputManager.pushHistory(newState);
      }
    };
    const started = startDealAnimation(cards, layout.stockX, layout.stockY, layout.columnXs, endYs, layout.cardW, layout.cardH, callback);
    if (started) {
      playDealCards();
    }
  },
};

// --- Init ---

function init(): void {
  clearSessionCache();
  fullSizeCanvas();
  window.addEventListener('resize', () => { fullSizeCanvas(); });

  settings = loadSettings();
  currentState = initGameState(Difficulty.HARD, settings.atmosphere);

  const layout = calculateLayout(cssW, cssH);
  inputManager = new InputManager(canvas, layout, () => currentState, callbacks);
  inputManager.pushHistory(currentState);

  createToolbar();
  updateToolbarVisibility(false);
  showMenu();

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

// Anti-debugging
function antiDebugCheck(): void {
  const threshold = 160;
  if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
    clearParticles();
  }
}
setInterval(antiDebugCheck, 3000);

// Canvas protection
canvas.toDataURL = () => '';
canvas.toBlob = () => Promise.resolve(new Blob());

// Start
init();