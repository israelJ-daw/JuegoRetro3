
export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_TRANSITION = 'LEVEL_TRANSITION',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Position;
  width: number;
  height: number;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  speed: number;
  cooldown: number;
  // Nuevas propiedades para PowerUps
  hasShield: boolean;
  weaponType: 'normal' | 'double' | 'laser';
  weaponTimer: number; // Tiempo restante del power-up
  // Nuevo: Invulnerabilidad tras golpe
  invulnerableTimer: number;
}

export type EnemyType = 'soldier' | 'captain' | 'boss';

export interface Enemy extends Entity {
  row: number;
  col: number;
  value: number; 
  type: EnemyType;
  hp: number;
  maxHp: number;
}

export interface Projectile extends Entity {
  velocity: number; 
  isEnemy: boolean;
  penetrate?: boolean; // Para el rayo láser
  color?: string;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string; 
}

// Nuevos tipos para PowerUps
export type PowerUpType = 'shield' | 'double_shot' | 'laser';

export interface PowerUp extends Entity {
  type: PowerUpType;
  vy: number;
}

export interface GameStats {
  score: number;
  level: number;
  lives: number;
  highScore: number;
}

export type SpriteMap = {
  [key: string]: HTMLImageElement | HTMLCanvasElement;
}
