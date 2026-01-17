
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export enum Lane {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2
}

export interface Obstacle {
  id: number;
  lane: Lane;
  z: number;
  type: 'TRAIN' | 'HURDLE' | 'SCANNER';
  length: number; // For long trains
}

export interface Orb {
  id: number;
  lane: Lane;
  z: number;
  isCollected: boolean;
}

export interface PowerUp {
  type: 'MAGNET' | 'SHIELD';
  duration: number;
  z: number;
  lane: Lane;
  isActive: boolean;
}

export interface DailyChallenge {
  title: string;
  description: string;
  bonusMultiplier: number;
}

export interface GameSettings {
  baseSpeed: number;
  spawnRate: number;
  difficultyScale: number;
}
