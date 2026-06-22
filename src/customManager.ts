import {
  LS_CUSTOM_CONFIG_KEY,
  SNAKE_SKIN_LIBRARY,
  BG_LIBRARY,
  FOOD_STYLE_LIBRARY,
} from './constants';
import type {
  PlayerCustomConfig,
  SnakeSkinId,
  CanvasBgId,
  FoodStyleId,
  SnakeSkinAsset,
  BgAsset,
  FoodAsset,
} from './types';

export class CustomManager {
  private config: PlayerCustomConfig;

  constructor() {
    const stored = localStorage.getItem(LS_CUSTOM_CONFIG_KEY);
    if (stored) {
      try {
        this.config = JSON.parse(stored) as PlayerCustomConfig;
      } catch {
        this.config = this.defaultConfig();
      }
    } else {
      this.config = this.defaultConfig();
    }
  }

  private defaultConfig(): PlayerCustomConfig {
    return {
      snakeSkin: 'default_green',
      canvasBg: 'solid_light',
      foodStyle: 'classic_color',
    };
  }

  changeSnakeSkin(id: SnakeSkinId): void {
    this.config.snakeSkin = id;
    this.save();
  }

  changeBg(id: CanvasBgId): void {
    this.config.canvasBg = id;
    this.save();
  }

  changeFoodStyle(id: FoodStyleId): void {
    this.config.foodStyle = id;
    this.save();
  }

  getCurrentSnakeSkin(): SnakeSkinAsset {
    return SNAKE_SKIN_LIBRARY[this.config.snakeSkin];
  }

  getCurrentBg(): BgAsset {
    return BG_LIBRARY[this.config.canvasBg];
  }

  getCurrentFoodStyle(): FoodAsset {
    return FOOD_STYLE_LIBRARY[this.config.foodStyle];
  }

  getCurrentConfig(): PlayerCustomConfig {
    return { ...this.config };
  }

  private save(): void {
    localStorage.setItem(LS_CUSTOM_CONFIG_KEY, JSON.stringify(this.config));
  }
}