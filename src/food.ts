import type { Position, FoodItem, FoodType } from './types';
import { COLS, ROWS, POWERUP_CHANCE, POWERUP_DURATION_FRAMES } from './constants';

export function generateFood(
  occupiedCells: Position[],
): FoodItem {
  const allCells: Position[] = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const isOccupied = occupiedCells.some(
        (cell) => cell.x === x && cell.y === y,
      );
      if (!isOccupied) {
        allCells.push({ x, y });
      }
    }
  }

  if (allCells.length === 0) {
    // 极端情况满屏蛇，放角落
    return { position: { x: 0, y: 0 }, type: 'NORMAL', remainingFrames: -1 };
  }

  const pos = allCells[Math.floor(Math.random() * allCells.length)];

  let foodType: FoodType = 'NORMAL';
  let remainingFrames = -1;

  if (Math.random() < POWERUP_CHANCE) {
    if (Math.random() < 0.5) {
      foodType = 'SPEED_BOOST';
    } else {
      foodType = 'SLOW_DOWN';
    }
    remainingFrames = POWERUP_DURATION_FRAMES;
  }

  return {
    position: pos,
    type: foodType,
    remainingFrames,
  };
}

export function updateFoodTimer(food: FoodItem): boolean {
  if (food.remainingFrames > 0) {
    food.remainingFrames--;
  }
  return food.remainingFrames === 0;
}