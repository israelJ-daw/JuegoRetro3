
// Dimensiones del Escenario (Canvas)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Lógica del Juego
export const TOTAL_LEVELS = 10;
export const STARTING_LIVES = 3;

// --- CONFIGURACIÓN DE ASSETS (IMÁGENES) ---
export const SPRITE_PLAYER = "./nave.png";          
export const SPRITE_ENEMY_SOLDIER = "./enemigo.png";   
export const SPRITE_ENEMY_CAPTAIN = "./enemigo2.png";   
export const SPRITE_ENEMY_BOSS = "./jefe.png";      
export const SPRITE_EXPLOSION = "./explosion.png";    

// Configuración del Jugador
export const PLAYER_WIDTH = 45;  
export const PLAYER_HEIGHT = 60; 
export const PLAYER_SPEED = 6;
export const PLAYER_SHOOT_COOLDOWN = 20;
export const PLAYER_INVULNERABLE_TIME = 90; // Reducido a 1.5s (era 120/2s) para que no parezca un error

// Configuración de Enemigos
export const ENEMY_WIDTH = 45;   
export const ENEMY_HEIGHT = 35;
export const BOSS_WIDTH = 140;   
export const BOSS_HEIGHT = 110;
export const ENEMY_PADDING = 15;
export const ENEMY_START_Y = 60;

// Configuración de Proyectiles
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 8;
export const LASER_WIDTH = 6;
export const LASER_SPEED = 12;

// Configuración de PowerUps
export const POWERUP_SIZE = 20;
export const POWERUP_SPEED = 3;
export const POWERUP_DROP_CHANCE = 0.15; // 15% de probabilidad al matar enemigo
export const POWERUP_DURATION = 600; // Unos 10 segundos a 60fps

// Efectos Visuales
export const SCREEN_SHAKE_DURATION = 20; // Tiempo que tiembla la pantalla
export const SCREEN_SHAKE_INTENSITY = 10; // Fuerza del temblor

// Colores
export const BULLET_COLOR_PLAYER = '#39ff14'; 
export const BULLET_COLOR_ENEMY = '#ff0033'; 
export const COLOR_LASER = '#f97316'; // Naranja
export const COLOR_SHIELD = '#06b6d4'; // Cian
