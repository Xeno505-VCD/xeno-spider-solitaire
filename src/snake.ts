import type { Direction, Position } from './types';
import { COLS, ROWS, INITIAL_SNAKE_LENGTH } from './constants';

export class Snake {
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  growing: boolean;

  constructor() {
    this.body = [];
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
    this.growing = false;
    this.resetPosition();
  }

  resetPosition(): void {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    this.body = [];
    // 蛇头在前，身体依次向左排列，避免第一帧移动后撞自己
    this.body.push({ x: startX,     y: startY }); // [0] 蛇头
    this.body.push({ x: startX - 1, y: startY }); // [1] 身体
    this.body.push({ x: startX - 2, y: startY }); // [2] 尾巴
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
    this.growing = false;
  }

  getHead(): Position {
    return this.body[0];
  }

  setDirection(dir: Direction): void {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    // 禁止反向掉头
    if (dir !== opposites[this.nextDirection]) {
      this.nextDirection = dir;
    }
  }

  move(): void {
    this.direction = this.nextDirection;

    const head = this.getHead();
    const newHead: Position = { x: head.x, y: head.y };

    switch (this.direction) {
      case 'UP':    newHead.y--; break;
      case 'DOWN':  newHead.y++; break;
      case 'LEFT':  newHead.x--; break;
      case 'RIGHT': newHead.x++; break;
    }

    this.body.unshift(newHead);

    if (this.growing) {
      this.growing = false;
    } else {
      this.body.pop();
    }
  }

  grow(): void {
    this.growing = true;
  }

  checkSelfCollision(): boolean {
    const head = this.getHead();
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[i].x === head.x && this.body[i].y === head.y) {
        return true;
      }
    }
    return false;
  }

  checkWallCollision(): boolean {
    const head = this.getHead();
    return head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
  }

  getOccupiedCells(): Position[] {
    return [...this.body];
  }
}