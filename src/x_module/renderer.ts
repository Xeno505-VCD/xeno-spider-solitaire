// XENO Spider Solitaire - Canvas Renderer v3.0
// Deal animation + mobile 40x58 + dynamic column compression

import type { Card, GameState, DragState } from '../o_module/types';
import { Suit, Rank, SUIT_SYMBOLS, SUIT_COLORS, RANK_NAMES, Atmosphere } from '../o_module/types';

// --- Animation State ---
interface FlipAnim { col: number; cardIdx: number; startTime: number; duration: number; }
interface DealAnim { col: number; startX: number; startY: number; endY: number; startTime: number; duration: number; card: Card; }
type DealState = 'idle' | 'animating' | 'done';
let flipAnims: FlipAnim[] = [];
let dealAnims: DealAnim[] = [];
let dealCallback: (() => void) | null = null;
let dealState: DealState = 'idle';

export function startFlipAnimation(col: number, cardIdx: number): void {
  flipAnims.push({ col, cardIdx, startTime: performance.now(), duration: 250 });
}

export function startDealAnimation(
  cards: Card[],
  stockX: number, stockY: number,
  columnXs: number[], endYs: number[],
  cardW: number, cardH: number,
  callback: () => void
): boolean {
  if (dealState !== 'idle') return false;
  dealState = 'animating';
  dealAnims = [];
  cards.forEach((card, i) => {
    dealAnims.push({
      col: i,
      startX: stockX,
      startY: stockY,
      endY: endYs[i],
      startTime: performance.now() + i * 40,
      duration: 250,
      card,
    });
  });
  dealCallback = callback;
  return true;
}

export function getDealAnims(): DealAnim[] { return dealAnims; }

// --- Layout Config ---
export interface LayoutConfig {
  cardW: number; cardH: number; cardRadius: number; colGap: number;
  offsetY: number; offsetYBack: number;
  hudTitleFont: string; hudTitleY: number; hudInfoFont: string; hudInfoLineH: number; hudSubY: number;
  hintFont: string; hintY: number; bottomFont: string;
  cardRankFont: string; cardSymbolFont: string; cardSymbolLarge: string; cardBackFont: string;
  slotSize: number; slotGap: number; partYOffset: number;
}

function getLayoutConfig(canvasW: number): LayoutConfig {
  const isMobile = canvasW < 768;
  const isTiny = canvasW < 480;
  if (isTiny) {
    // Extreme narrow: e.g. iPhone SE landscape with browser chrome
    return {
      cardW: 24, cardH: 36, cardRadius: 2, colGap: 1,
      offsetY: 9, offsetYBack: 7,
      hudTitleFont: 'bold 8px sans-serif', hudTitleY: 12,
      hudInfoFont: 'bold 5px sans-serif', hudInfoLineH: 9, hudSubY: 2,
      hintFont: 'bold 6px sans-serif', hintY: 26,
      cardRankFont: 'bold 8px sans-serif',
      cardSymbolFont: '5px sans-serif',
      cardSymbolLarge: 'bold 16px sans-serif',
      cardBackFont: 'bold 4px monospace',
      bottomFont: '5px sans-serif',
      slotSize: 16, slotGap: 2, partYOffset: 2,
    };
  }
  if (isMobile) {
    return {
      cardW: 28, cardH: 40, cardRadius: 2, colGap: 2,
      offsetY: 12, offsetYBack: 9,
      hudTitleFont: 'bold 9px sans-serif', hudTitleY: 14,
      hudInfoFont: 'bold 6px sans-serif', hudInfoLineH: 10, hudSubY: 2,
      hintFont: 'bold 7px sans-serif', hintY: 30,
      cardRankFont: 'bold 9px sans-serif',
      cardSymbolFont: '6px sans-serif',
      cardSymbolLarge: 'bold 18px sans-serif',
      cardBackFont: 'bold 5px monospace',
      bottomFont: '6px sans-serif',
      slotSize: 18, slotGap: 2, partYOffset: 3,
    };
  }
  return {
    cardW: 88, cardH: 120, cardRadius: 8, colGap: 22,
    offsetY: 36, offsetYBack: 28,
    hudTitleFont: 'bold 22px sans-serif', hudTitleY: 40,
    hudInfoFont: 'bold 13px sans-serif', hudInfoLineH: 20, hudSubY: 6,
    hintFont: 'bold 15px sans-serif', hintY: 70,
    bottomFont: '11px sans-serif',
    cardRankFont: 'bold 18px sans-serif',
    cardSymbolFont: '14px sans-serif',
    cardSymbolLarge: 'bold 52px sans-serif',
    cardBackFont: 'bold 10px monospace',
    slotSize: 52, slotGap: 8, partYOffset: 0,
  };
}

// --- Colors ---
const COLORS = {
  CARD_FACE: 'rgba(10, 14, 30, 0.92)',
  GRID_LINE: 'rgba(0, 229, 255, 0.06)',
  TEXT_LIGHT: 'rgba(255, 255, 255, 0.85)',
  TEXT_DIM: 'rgba(255, 255, 255, 0.45)',
};

const ATMOSPHERE_COLORS: Record<Atmosphere, Record<string, string>> = {
  [Atmosphere.DEEP_SPACE]: { bg1: '#0A0E17', bg2: '#1A0B2E', accent: '#00E5FF', secondary: '#D500F9', cardBack: '#1a1040' },
  [Atmosphere.PULSAR_STORM]: { bg1: '#1a0a0a', bg2: '#2E1A0B', accent: '#FF6B35', secondary: '#FF3366', cardBack: '#2a1510' },
  [Atmosphere.BIO_CHAMBER]: { bg1: '#0A1A14', bg2: '#0E2E1A', accent: '#00FFCC', secondary: '#4ADE80', cardBack: '#0f2518' },
};

// --- Particles ---
interface Particle { x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number; }
const particles: Particle[] = []; const MAX_PARTICLES = 80;

function spawnParticle(w: number, h: number): void {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.2, size: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.5 + 0.2, life: 0, maxLife: 300 + Math.random() * 400 });
}

function updateParticles(ctx: CanvasRenderingContext2D, w: number, h: number, atmosphere: Atmosphere): void {
  const atm = ATMOSPHERE_COLORS[atmosphere];
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life++;
    if (p.life >= p.maxLife || p.y < -10) { particles.splice(i, 1); continue; }
    const alpha = p.alpha * (1 - p.life / p.maxLife);
    const accent = atm.accent;
    if (accent.startsWith('#')) {
      const r = parseInt(accent.slice(1,3),16), g = parseInt(accent.slice(3,5),16), b = parseInt(accent.slice(5,7),16);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    }
    ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  if (particles.length < MAX_PARTICLES && Math.random() < 0.3) spawnParticle(w, h);
}

export function clearParticles(): void { particles.length = 0; }

// --- Card Drawing ---
function drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, atmosphere: Atmosphere, cfg: LayoutConfig, alpha?: number): void {
  const atm = ATMOSPHERE_COLORS[atmosphere];
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = atm.cardBack; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.strokeStyle = atm.accent; ctx.lineWidth = 1; ctx.globalAlpha *= 0.7;
  roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.globalAlpha = 1;
  const cx = x + w / 2, cy = y + h / 2, size = w * 0.3;
  ctx.strokeStyle = atm.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx - size, cy + size); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = atm.accent; ctx.globalAlpha = 0.35;
  ctx.font = cfg.cardBackFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('XENO', cx, cy); ctx.globalAlpha = 1;
}

function drawCardFace(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, card: Card, atmosphere: Atmosphere, highlighted: boolean, cfg: LayoutConfig): void {
  const atm = ATMOSPHERE_COLORS[atmosphere];
  if (!card.faceUp) { drawCardBack(ctx, x, y, w, h, r, atmosphere, cfg); return; }
  const suitColor = SUIT_COLORS[card.suit], suitSymbol = SUIT_SYMBOLS[card.suit], rankName = RANK_NAMES[card.rank];
  ctx.shadowColor = highlighted ? atm.accent : 'rgba(0,0,0,0.3)'; ctx.shadowBlur = highlighted ? 10 : 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = COLORS.CARD_FACE; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.strokeStyle = highlighted ? atm.accent : atm.secondary; ctx.lineWidth = highlighted ? 2 : 1; ctx.globalAlpha = highlighted ? 1 : 0.6;
  roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = suitColor; ctx.font = cfg.cardRankFont; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(rankName, x + r, y + (w < 60 ? 2 : 6));
  ctx.font = cfg.cardSymbolFont; ctx.fillText(suitSymbol, x + r + 1, y + (w < 60 ? 10 : 26));
  ctx.globalAlpha = 0.12; ctx.font = cfg.cardSymbolLarge; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(suitSymbol, x + w / 2, y + h / 2); ctx.globalAlpha = 1;
  ctx.fillStyle = suitColor; ctx.font = cfg.cardRankFont; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.fillText(rankName, x + w - r, y + h - (w < 60 ? 2 : 6));
}

function drawCardPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
  roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.font = w < 50 ? '10px monospace' : '18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('◈', x + w / 2, y + h / 2);
}

// --- Layout ---
export interface LayoutData {
  columnXs: number[]; columnY: number; stockX: number; stockY: number;
  completeX: number; completeY: number; cardW: number; cardH: number;
  paddingX: number; topAreaY: number; cfg: LayoutConfig; isMobile: boolean;
}

export function calculateLayout(canvasW: number, canvasH: number): LayoutData {
  const cfg = getLayoutConfig(canvasW);
  const isMobile = canvasW < 768;
  const isTiny = canvasW < 480;
  const colCount = 10;
  let totalCardsW = colCount * cfg.cardW + (colCount - 1) * cfg.colGap;
  // Dynamic overflow check: if 10 columns overflow, shrink gap
  let effectiveColGap = cfg.colGap;
  let effectiveCardW = cfg.cardW;
  if (totalCardsW > canvasW - (isMobile ? 8 : 60)) {
    if (isMobile) {
      // Reduce gap first, then card size
      effectiveColGap = Math.max(1, canvasW - colCount * effectiveCardW - (isTiny ? 6 : 10)) / (colCount - 1);
      if (effectiveColGap < 1.5) {
        effectiveCardW = Math.floor((canvasW - (isTiny ? 6 : 10) - (colCount - 1) * 1) / colCount);
        effectiveColGap = 1;
      }
      totalCardsW = colCount * effectiveCardW + (colCount - 1) * effectiveColGap;
    }
  }
  const paddingX = Math.max(isMobile ? (isTiny ? 3 : 4) : 30, (canvasW - totalCardsW) / 2);
  const columnXs: number[] = [];
  for (let i = 0; i < colCount; i++) columnXs.push(paddingX + i * (effectiveCardW + effectiveColGap));
  const topAreaY = isTiny ? 38 : (isMobile ? 44 : 75);
  const columnY = topAreaY + (isTiny ? 20 : (isMobile ? 24 : 50));
  const stockX = Math.max(isTiny ? 2 : (isMobile ? 2 : 15), paddingX - effectiveCardW - (isMobile ? 6 : 30));
  const stockY = topAreaY + cfg.partYOffset;
  const completeX = canvasW - paddingX + (isMobile ? 6 : 30);
  const completeY = topAreaY + cfg.partYOffset;
  return { columnXs, columnY, stockX, stockY, completeX: Math.min(canvasW - effectiveCardW - (isMobile ? 2 : 20), completeX), completeY, cardW: effectiveCardW, cardH: cfg.cardH, paddingX, topAreaY, cfg, isMobile };
}

// --- Dynamic offset for tall columns ---
function getEffectiveOffsetY(cfg: LayoutConfig, cardCount: number, isMobile: boolean): number {
  const maxVisible = isMobile ? 10 : 13;
  if (cardCount <= maxVisible) return cfg.offsetY;
  return Math.max(cfg.offsetY * 0.6, isMobile ? 8 : 14);
}

// --- Main Render ---
export function renderGame(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, state: GameState, dragState: DragState | null, layout: LayoutData): void {
  const atm = ATMOSPHERE_COLORS[state.atmosphere];
  const bgGrad = ctx.createRadialGradient(canvasW / 2, canvasH / 3, 0, canvasW / 2, canvasH, canvasH * 1.2);
  bgGrad.addColorStop(0, atm.bg1); bgGrad.addColorStop(1, atm.bg2);
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvasW, canvasH);
  drawGrid(ctx, canvasW, canvasH);
  updateParticles(ctx, canvasW, canvasH, state.atmosphere);
  drawCompletedArea(ctx, layout, state, atm);
  drawStockPile(ctx, layout, state);
  drawColumns(ctx, layout, state, dragState);
  drawDealAnims(ctx, layout, state.atmosphere);
  if (dragState && dragState.active) drawDraggedCards(ctx, dragState, layout);
  drawHUD(ctx, canvasW, layout, state, atm);
  if (!layout.isMobile) drawBottomBar(ctx, canvasW, canvasH, state);

  // Clean expired flip animations
  const now = performance.now();
  flipAnims = flipAnims.filter(a => now - a.startTime < a.duration);

  // Check deal animations completion (only when in animating state)
  if (dealState === 'animating') {
    const allDone = dealAnims.length > 0 && dealAnims.every(a => now - a.startTime + a.duration < now);
    if (allDone && dealCallback) {
      dealAnims = [];
      dealState = 'done';
      const cb = dealCallback;
      dealCallback = null;
      cb();
      dealState = 'idle';
    }
  }
  // Remove stale deal anims (safety timeout)
  dealAnims = dealAnims.filter(a => now - a.startTime < 1200);
}

function drawDealAnims(ctx: CanvasRenderingContext2D, layout: LayoutData, atmosphere: Atmosphere): void {
  const cfg = layout.cfg;
  const now = performance.now();
  for (const a of dealAnims) {
    const elapsed = now - a.startTime;
    if (elapsed < 0) continue; // not started yet
    const progress = Math.min(1, elapsed / a.duration);
    // Ease out quad
    const t = 1 - (1 - progress) * (1 - progress);
    const x = a.startX + (layout.columnXs[a.col] - a.startX) * t;
    const y = a.startY + (a.endY - a.startY) * t;
    const card = { ...a.card, faceUp: true };
    drawCardBack(ctx, x, y, layout.cardW, layout.cardH, cfg.cardRadius, atmosphere, cfg);
    // Show face peeking through with progress
    ctx.globalAlpha = progress;
    drawCardFace(ctx, x, y, layout.cardW, layout.cardH, cfg.cardRadius, card, atmosphere, false, cfg);
    ctx.globalAlpha = 1;
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = COLORS.GRID_LINE; ctx.lineWidth = 0.5;
  const spacing = w < 768 ? 40 : 80;
  for (let x = spacing; x < w; x += spacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = spacing; y < h; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function drawStockPile(ctx: CanvasRenderingContext2D, layout: LayoutData, state: GameState): void {
  const x = layout.stockX, y = layout.stockY, w = layout.cardW, h = layout.cardH, cfg = layout.cfg;
  if (state.stock.length === 0) {
    drawCardPlaceholder(ctx, x, y, w, h, cfg.cardRadius);
    ctx.fillStyle = COLORS.TEXT_DIM; ctx.font = layout.isMobile ? '6px monospace' : '10px monospace';
    ctx.textAlign = 'center'; ctx.fillText('empty', x + w / 2, y + h / 2 + (layout.isMobile ? 8 : 16)); return;
  }
  const remaining = Math.ceil(state.stock.length / 10);
  for (let i = 0; i < Math.min(remaining, 3); i++) drawCardBack(ctx, x - i * 2, y - i * 2, w, h, cfg.cardRadius, state.atmosphere, cfg);
  ctx.fillStyle = COLORS.TEXT_LIGHT; ctx.font = layout.isMobile ? '7px monospace' : '11px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`${state.stock.length}`, x + w / 2, y + h + (layout.isMobile ? 2 : 8));
}

function drawCompletedArea(ctx: CanvasRenderingContext2D, layout: LayoutData, state: GameState, atm: Record<string, string>): void {
  const cfg = layout.cfg, x = layout.completeX, y = layout.completeY;
  const slotSize = cfg.slotSize, gap = cfg.slotGap;
  for (let i = 0; i < 8; i++) {
    const sx = x + (i % 4) * (slotSize + gap), sy = y + Math.floor(i / 4) * (slotSize + gap);
    ctx.beginPath(); ctx.arc(sx + slotSize / 2, sy + slotSize / 2, slotSize / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = i < state.completed ? atm.accent : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = i < state.completed ? 2 : 0.8; ctx.stroke();
    if (i < state.completed) {
      ctx.fillStyle = atm.accent; ctx.globalAlpha = 0.2; ctx.beginPath();
      ctx.arc(sx + slotSize / 2, sy + slotSize / 2, slotSize / 2 - 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = layout.isMobile ? 'bold 7px monospace' : 'bold 12px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = atm.accent;
      ctx.fillText('OK', sx + slotSize / 2, sy + slotSize / 2);
    }
  }
}

function drawColumns(ctx: CanvasRenderingContext2D, layout: LayoutData, state: GameState, dragState: DragState | null): void {
  const cfg = layout.cfg, atm = ATMOSPHERE_COLORS[state.atmosphere];
  const now = performance.now();
  for (let col = 0; col < 10; col++) {
    const column = state.columns[col];
    const colX = layout.columnXs[col];
    const startY = layout.columnY;
    if (column.cards.length === 0) { drawCardPlaceholder(ctx, colX, startY, layout.cardW, layout.cardH, cfg.cardRadius); continue; }
    const effectiveOffset = getEffectiveOffsetY(cfg, column.cards.length, layout.isMobile);
    const effectiveOffsetBack = effectiveOffset * (cfg.offsetYBack / cfg.offsetY);
    let cy = startY;
    for (let ci = 0; ci < column.cards.length; ci++) {
      const card = column.cards[ci];
      const isDragged = dragState && dragState.active && dragState.columnIndex === col && ci >= dragState.cardIndex;
      if (ci > 0) { const prev = column.cards[ci - 1]; cy += prev.faceUp ? effectiveOffset : effectiveOffsetBack; }
      if (isDragged) continue;
      const isDropTarget = dragState && dragState.active && dragState.columnIndex !== col && (column.cards.length === 0 || ci === column.cards.length - 1);
      
      // Flip animation
      const flipAnim = flipAnims.find(a => a.col === col && a.cardIdx === ci);
      let flipProgress: number | undefined;
      if (flipAnim) flipProgress = Math.min(1, (now - flipAnim.startTime) / flipAnim.duration);
      
      if (flipProgress !== undefined && flipProgress < 1 && card.faceUp) {
        const clipW = layout.cardW * flipProgress;
        ctx.save(); ctx.beginPath(); ctx.rect(colX, cy, clipW, layout.cardH); ctx.clip();
    drawCardFace(ctx, colX, cy, layout.cardW, layout.cardH, cfg.cardRadius, card, state.atmosphere, isDropTarget || false, cfg);
    ctx.restore();
    if (flipProgress < 0.6) drawCardBack(ctx, colX, cy, layout.cardW, layout.cardH, cfg.cardRadius, state.atmosphere, cfg);
  } else {
    drawCardFace(ctx, colX, cy, layout.cardW, layout.cardH, cfg.cardRadius, card, state.atmosphere, isDropTarget || false, cfg);
      }
      if (card.faceUp && (!flipAnim || flipProgress! >= 1)) {
        ctx.strokeStyle = atm.accent; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.2;
        roundRect(ctx, colX, cy, layout.cardW, layout.cardH, cfg.cardRadius); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }
}

function drawDraggedCards(ctx: CanvasRenderingContext2D, dragState: DragState, layout: LayoutData): void {
  const cfg = layout.cfg; ctx.save(); ctx.globalAlpha = 0.9;
  for (let i = 0; i < dragState.cards.length; i++) {
    drawCardFace(ctx, dragState.x - layout.cardW / 2, dragState.y + i * cfg.offsetY - layout.cardH / 2, layout.cardW, layout.cardH, cfg.cardRadius, dragState.cards[i], Atmosphere.DEEP_SPACE, true, cfg);
    if (i < dragState.cards.length - 1) {
      ctx.strokeStyle = ATMOSPHERE_COLORS[Atmosphere.DEEP_SPACE].accent; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      ctx.setLineDash([3, 3]); ctx.beginPath();
      ctx.moveTo(dragState.x, dragState.y + i * cfg.offsetY + layout.cardH / 2);
      ctx.lineTo(dragState.x, dragState.y + (i + 1) * cfg.offsetY - layout.cardH / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 0.9;
    }
  }
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, canvasW: number, layout: LayoutData, state: GameState, atm: Record<string, string>): void {
  const cfg = layout.cfg, y = cfg.hudTitleY, isMobile = layout.isMobile;
  ctx.fillStyle = atm.accent; ctx.font = cfg.hudTitleFont;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(isMobile ? 'XENO' : 'XENO · 异星织网者', canvasW / 2, y);
  const sepW = isMobile ? 80 : 180, sepY = y + (isMobile ? 8 : 20);
  ctx.strokeStyle = atm.accent; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(canvasW / 2 - sepW, sepY); ctx.lineTo(canvasW / 2 + sepW, sepY); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = cfg.hudInfoFont; ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
  const lineH = cfg.hudInfoLineH, subY = cfg.hudSubY;
  const preL = isMobile ? '⚡' : '⚡能源:';
  const preS = isMobile ? '' : '📊序列:';
  const preM = isMobile ? '👣' : '👣步数:';
  const preV = isMobile ? '' : '异界之力:';
  ctx.fillText(`${preL}${state.score}`, layout.paddingX, y + subY);
  ctx.fillText(`${preS}${state.completed}/8`, layout.paddingX, y + subY + lineH);
  ctx.textAlign = 'right';
  ctx.fillText(`${preM}${state.moves}`, canvasW - layout.paddingX, y + subY);
  let vpStr = preV; for (let i = 0; i < 3; i++) vpStr += i < state.voidPower ? '◆' : '◇';
  ctx.fillStyle = '#D500F9';
  ctx.fillText(vpStr, canvasW - layout.paddingX, y + subY + lineH);
}

function drawBottomBar(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, state: GameState): void {
  ctx.fillStyle = 'rgba(136,153,170,0.3)'; ctx.font = '11px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('Drag | Double-click | Stock | Ctrl+Z', canvasW / 2, canvasH - 30);
}

// --- Utility ---
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// --- Hit testing ---
export function getCardYInColumn(layout: LayoutData, cards: Card[], cardIndex: number): number {
  let cy = layout.columnY; const cfg = layout.cfg;
  const effectiveOffset = getEffectiveOffsetY(cfg, cards.length, layout.isMobile);
  const effectiveOffsetBack = effectiveOffset * (cfg.offsetYBack / cfg.offsetY);
  for (let i = 0; i < cardIndex; i++) cy += cards[i].faceUp ? effectiveOffset : effectiveOffsetBack;
  return cy;
}

export function hitTestColumn(mouseX: number, mouseY: number, layout: LayoutData, columnCards: Card[]): number {
  let bestIdx = -1, bestDist = Infinity;
  for (let ci = columnCards.length - 1; ci >= 0; ci--) {
    if (!columnCards[ci].faceUp) continue;
    const cyStart = getCardYInColumn(layout, columnCards, ci), cyEnd = cyStart + layout.cardH;
    const hitStart = cyStart - 4, hitEnd = cyEnd + 4;
    if (mouseY >= hitStart && mouseY <= hitEnd) {
      const dist = Math.abs(mouseY - (cyStart + cyEnd) / 2);
      if (dist < bestDist) { bestDist = dist; bestIdx = ci; }
    }
  }
  return bestIdx;
}

export function hitTestStock(mouseX: number, mouseY: number, layout: LayoutData): boolean {
  const m = 6;
  return mouseX >= layout.stockX - m && mouseX <= layout.stockX + layout.cardW + m && mouseY >= layout.stockY - m && mouseY <= layout.stockY + layout.cardH + m;
}

export function getColumnAtX(mouseX: number, layout: LayoutData): number {
  const t = 3;
  for (let i = 0; i < layout.columnXs.length; i++) {
    if (mouseX >= layout.columnXs[i] - t && mouseX <= layout.columnXs[i] + layout.cardW + t) return i;
  }
  return -1;
}