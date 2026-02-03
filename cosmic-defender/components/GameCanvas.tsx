
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, 
  PLAYER_SHOOT_COOLDOWN, BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED,
  ENEMY_WIDTH, ENEMY_HEIGHT, BOSS_WIDTH, BOSS_HEIGHT, ENEMY_PADDING, ENEMY_START_Y,
  TOTAL_LEVELS, STARTING_LIVES, BULLET_COLOR_PLAYER, BULLET_COLOR_ENEMY,
  SPRITE_PLAYER, SPRITE_ENEMY_SOLDIER, SPRITE_ENEMY_CAPTAIN, SPRITE_ENEMY_BOSS, SPRITE_EXPLOSION,
  POWERUP_SIZE, POWERUP_SPEED, POWERUP_DROP_CHANCE, POWERUP_DURATION, COLOR_LASER, COLOR_SHIELD, LASER_WIDTH, LASER_SPEED,
  PLAYER_INVULNERABLE_TIME, SCREEN_SHAKE_DURATION, SCREEN_SHAKE_INTENSITY
} from '../constants';
import { GameState, Player, Enemy, Projectile, Particle, GameStats, SpriteMap, Position, PowerUp, PowerUpType } from '../types';
import { GameOverlay } from './GameOverlay';

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  // --- ESTADO DEL JUEGO ---
  const spritesRef = useRef<SpriteMap>({});
  const [loading, setLoading] = useState(true);
  
  const gameStateRef = useRef<GameState>(GameState.LOADING);
  
  // SOLUCIÓN AL BUG DE VIDAS: Usamos Refs para la lógica del juego (síncrono)
  const livesRef = useRef(STARTING_LIVES);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);

  // Jugador con estados de armas
  const playerRef = useRef<Player>({ 
    id: 'p1', 
    pos: { x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - 60 }, 
    width: PLAYER_WIDTH, 
    height: PLAYER_HEIGHT, 
    markedForDeletion: false, 
    speed: PLAYER_SPEED, 
    cooldown: 0,
    hasShield: false,
    weaponType: 'normal',
    weaponTimer: 0,
    invulnerableTimer: 0
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]); 
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Efectos visuales
  const shakeTimerRef = useRef<number>(0);

  const enemyDirectionRef = useRef<number>(1);
  const enemyMoveTimerRef = useRef<number>(0);
  const enemyMoveIntervalRef = useRef<number>(30);
  const bossDirectionRef = useRef<number>(1);

  const [uiState, setUiState] = useState<GameState>(GameState.LOADING);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    level: 1,
    lives: STARTING_LIVES,
    highScore: 0
  });

  // --- PROCESAMIENTO DE IMÁGENES ---
  const processSprite = (img: HTMLImageElement, isDarkEnemy: boolean = false) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return img;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      if (r > 200 && g > 200 && b > 200) {
        data[i + 3] = 0; 
      } else if (brightness > 220) {
        data[i + 3] = 0;
      }
      
      if (isDarkEnemy && data[i+3] > 0) {
         if (r < 60 && g < 60 && b < 60) {
            data[i] = 255;    
            data[i + 1] = 255;
            data[i + 2] = 255;
         }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return tempCanvas;
  };

  useEffect(() => {
    const imagesToLoad = {
      player: { src: SPRITE_PLAYER, invert: false }, 
      soldier: { src: SPRITE_ENEMY_SOLDIER, invert: true },
      captain: { src: SPRITE_ENEMY_CAPTAIN, invert: false },
      boss: { src: SPRITE_ENEMY_BOSS, invert: false },
      explosion: { src: SPRITE_EXPLOSION, invert: false }
    };

    let loadedCount = 0;
    const total = Object.keys(imagesToLoad).length;

    Object.entries(imagesToLoad).forEach(([key, config]) => {
      const img = new Image();
      img.src = config.src;
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        const processed = processSprite(img, config.invert);
        spritesRef.current[key] = processed;
        checkAllLoaded();
      };
      
      img.onerror = () => {
        console.warn(`No se pudo cargar: ${config.src}`);
        checkAllLoaded();
      }
    });

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === total) {
        setLoading(false);
        gameStateRef.current = GameState.MENU;
        setUiState(GameState.MENU);
      }
    };
  }, []);

  const startLevel = (level: number) => {
    projectilesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    playerRef.current.pos.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
    playerRef.current.invulnerableTimer = 0;
    
    // --- RESETEAR POWER-UPS AL CAMBIAR DE NIVEL ---
    // Esto asegura que el jugador comience cada nivel sin ventajas heredadas
    playerRef.current.hasShield = false;
    playerRef.current.weaponType = 'normal';
    playerRef.current.weaponTimer = 0;

    // Configuración del Nivel
    const newEnemies: Enemy[] = [];

    if (level === TOTAL_LEVELS) {
      // 1. GENERAR JEFE FINAL
      newEnemies.push({
        id: 'boss',
        pos: { x: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2, y: ENEMY_START_Y },
        width: BOSS_WIDTH,
        height: BOSS_HEIGHT,
        markedForDeletion: false,
        row: 0, col: 0,
        value: 5000,
        type: 'boss',
        hp: 50,
        maxHp: 50
      });

      // 2. GENERAR ESCOLTAS (Enemigos debajo del jefe)
      // Generamos 2 filas de enemigos "Captain" debajo del jefe para protegerlo
      const startY = ENEMY_START_Y + BOSS_HEIGHT + 20; 
      const rows = 2;
      const cols = 6;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          newEnemies.push({
            id: `guard-${r}-${c}`,
            pos: { 
              x: 150 + c * (ENEMY_WIDTH + ENEMY_PADDING), 
              y: startY + r * (ENEMY_HEIGHT + ENEMY_PADDING) 
            },
            width: ENEMY_WIDTH,
            height: ENEMY_HEIGHT,
            markedForDeletion: false,
            row: r,
            col: c,
            value: 200,
            type: 'captain',
            hp: 3,
            maxHp: 3
          });
        }
      }

      enemiesRef.current = newEnemies;
      // Reiniciar temporizadores de movimiento
      enemyDirectionRef.current = 1;
      enemyMoveTimerRef.current = 0;
      enemyMoveIntervalRef.current = 20; // Se mueven rapidito
      return;
    }

    // NIVELES NORMALES
    const rows = Math.min(3 + Math.floor(level / 2), 6); 
    const cols = 8;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: Enemy['type'] = 'soldier';
        let hp = 1;
        let value = 100;
        
        if (level >= 4 && r === 0) {
           type = 'captain';
           hp = 2 + Math.floor((level - 4) / 3); 
           value = 300;
        }
        
        newEnemies.push({
          id: `e-${r}-${c}`,
          pos: { 
            x: 100 + c * (ENEMY_WIDTH + ENEMY_PADDING), 
            y: ENEMY_START_Y + r * (ENEMY_HEIGHT + ENEMY_PADDING) 
          },
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          markedForDeletion: false,
          row: r,
          col: c,
          value: value,
          type,
          hp,
          maxHp: hp
        });
      }
    }
    enemiesRef.current = newEnemies;
    enemyDirectionRef.current = 1;
    enemyMoveTimerRef.current = 0;
    enemyMoveIntervalRef.current = Math.max(5, 40 - (level * 3)); 
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'Enter') {
        if (gameStateRef.current === GameState.MENU) startGame();
        if (gameStateRef.current === GameState.GAME_OVER) restartGame();
        if (gameStateRef.current === GameState.VICTORY) restartGame();
        if (gameStateRef.current === GameState.LEVEL_TRANSITION) advanceLevel();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); 

  const startGame = () => {
    gameStateRef.current = GameState.PLAYING;
    setUiState(GameState.PLAYING);
    livesRef.current = STARTING_LIVES;
    scoreRef.current = 0;

    // --- MODO DEBUG: SALTAR AL NIVEL 10 ---
    // Cambia esto a 1 para jugar normal, o 10 para probar el jefe
    const DEBUG_START_LEVEL = 1; 
    
    levelRef.current = DEBUG_START_LEVEL;
    setStats(prev => ({ ...prev, score: 0, level: DEBUG_START_LEVEL, lives: STARTING_LIVES }));
    startLevel(DEBUG_START_LEVEL);
  };

  const restartGame = () => {
    startGame();
  };

  const advanceLevel = () => {
    const nextLevel = levelRef.current + 1;
    if (nextLevel <= TOTAL_LEVELS) {
      levelRef.current = nextLevel; 
      setStats(s => ({ ...s, level: nextLevel })); 
      gameStateRef.current = GameState.PLAYING;
      setUiState(GameState.PLAYING);
      startLevel(nextLevel);
    }
  };

  const createExplosion = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { x, y },
        width: 3,
        height: 3,
        color: color,
        markedForDeletion: false,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 20 + Math.random() * 20,
        maxLife: 40
      });
    }
  };

  const spawnPowerUp = (x: number, y: number) => {
    if (Math.random() > POWERUP_DROP_CHANCE) return;

    const rand = Math.random();
    let type: PowerUpType = 'double_shot'; 
    if (rand < 0.3) type = 'shield';       
    if (rand < 0.15) type = 'laser';       

    powerUpsRef.current.push({
      id: `pup-${Date.now()}`,
      pos: { x, y },
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      type: type,
      vy: POWERUP_SPEED,
      markedForDeletion: false
    });
  };

  // --- BUCLE PRINCIPAL (LOGIC + DRAW) ---
  const update = useCallback(() => {
    if (gameStateRef.current !== GameState.PLAYING) {
      draw();
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    if (shakeTimerRef.current > 0) shakeTimerRef.current--;

    const player = playerRef.current;
    const enemies = enemiesRef.current;

    // 0. TEMPORIZADORES
    if (player.invulnerableTimer > 0) player.invulnerableTimer--;
    if (player.weaponTimer > 0) {
      player.weaponTimer--;
      if (player.weaponTimer <= 0) player.weaponType = 'normal'; 
    }

    // 1. MOVIMIENTO JUGADOR
    if (keysPressed.current['ArrowLeft']) player.pos.x -= player.speed;
    if (keysPressed.current['ArrowRight']) player.pos.x += player.speed;
    player.pos.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.pos.x));

    // 2. DISPARO
    if (player.cooldown > 0) player.cooldown--;
    if (keysPressed.current['Space'] && player.cooldown <= 0) {
      if (player.weaponType === 'double') {
        [-10, 10].forEach(offset => {
          projectilesRef.current.push({
            id: `p-bullet-${Date.now()}-${offset}`,
            pos: { x: player.pos.x + player.width / 2 - BULLET_WIDTH / 2 + offset, y: player.pos.y },
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            markedForDeletion: false,
            velocity: -BULLET_SPEED,
            isEnemy: false
          });
        });
        player.cooldown = PLAYER_SHOOT_COOLDOWN * 0.8; 
      } else if (player.weaponType === 'laser') {
        projectilesRef.current.push({
          id: `p-laser-${Date.now()}`,
          pos: { x: player.pos.x + player.width / 2 - LASER_WIDTH / 2, y: player.pos.y },
          width: LASER_WIDTH,
          height: BULLET_HEIGHT * 3, 
          markedForDeletion: false,
          velocity: -LASER_SPEED, 
          isEnemy: false,
          penetrate: true,
          color: COLOR_LASER
        });
        player.cooldown = PLAYER_SHOOT_COOLDOWN * 0.5; 
      } else {
        projectilesRef.current.push({
          id: `p-bullet-${Date.now()}`,
          pos: { x: player.pos.x + player.width / 2 - BULLET_WIDTH / 2, y: player.pos.y },
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          markedForDeletion: false,
          velocity: -BULLET_SPEED,
          isEnemy: false
        });
        player.cooldown = PLAYER_SHOOT_COOLDOWN;
      }
    }

    // 3. IA ENEMIGOS (MODIFICADA PARA SOPORTAR JEFE + MINIONS)
    
    // A) Mover Jefe si existe
    const boss = enemies.find(e => e.type === 'boss');
    if (boss) {
       boss.pos.x += 3 * bossDirectionRef.current;
       // Rebote del jefe
       if (boss.pos.x <= 20 || boss.pos.x + boss.width >= CANVAS_WIDTH - 20) {
         bossDirectionRef.current *= -1;
       }
       // Disparo del jefe
       if (Math.random() < 0.05) {
         projectilesRef.current.push({
            id: `b-bullet-${Math.random()}`,
            pos: { x: boss.pos.x + boss.width / 2, y: boss.pos.y + boss.height },
            width: BULLET_WIDTH * 2,
            height: BULLET_HEIGHT * 2,
            markedForDeletion: false,
            velocity: BULLET_SPEED * 0.8,
            isEnemy: true
          });
       }
    }

    // B) Mover Enjambre (Minions) - Excluyendo al jefe
    const minions = enemies.filter(e => e.type !== 'boss');
    if (minions.length > 0) {
      enemyMoveTimerRef.current++;
      if (enemyMoveTimerRef.current >= enemyMoveIntervalRef.current) {
        enemyMoveTimerRef.current = 0;
        let shouldMoveDown = false;
        
        // Verificar límites usando solo minions
        for (const enemy of minions) {
          if (enemyDirectionRef.current === 1 && enemy.pos.x + enemy.width >= CANVAS_WIDTH - 20) {
            shouldMoveDown = true;
            break;
          } else if (enemyDirectionRef.current === -1 && enemy.pos.x <= 20) {
            shouldMoveDown = true;
            break;
          }
        }
        
        if (shouldMoveDown) {
          enemyDirectionRef.current *= -1;
          minions.forEach(e => e.pos.y += 20);
        } else {
          minions.forEach(e => e.pos.x += 10 * enemyDirectionRef.current);
        }

        // Disparo de minions
        if (levelRef.current >= 2) {
           const shootChance = 0.002 + (levelRef.current * 0.002); 
           minions.forEach(enemy => {
             if (Math.random() < shootChance) {
                projectilesRef.current.push({
                 id: `e-bullet-${Math.random()}`,
                 pos: { x: enemy.pos.x + enemy.width / 2, y: enemy.pos.y + enemy.height },
                 width: BULLET_WIDTH,
                 height: BULLET_HEIGHT,
                 markedForDeletion: false,
                 velocity: BULLET_SPEED * 0.6,
                 isEnemy: true
               });
             }
           });
        }
      }
    }

    // 4. POWER-UPS
    powerUpsRef.current.forEach(pup => {
      pup.pos.y += pup.vy;
      if (isColliding(pup, player)) {
        pup.markedForDeletion = true;
        
        if (pup.type === 'shield') {
          player.hasShield = true;
          createExplosion(player.pos.x + player.width/2, player.pos.y, COLOR_SHIELD, 10);
        } else if (pup.type === 'double_shot') {
          player.weaponType = 'double';
          player.weaponTimer = POWERUP_DURATION;
        } else if (pup.type === 'laser') {
          player.weaponType = 'laser';
          player.weaponTimer = POWERUP_DURATION;
        }
        scoreRef.current += 50;
        setStats(s => ({...s, score: scoreRef.current }));
      }
      if (pup.pos.y > CANVAS_HEIGHT) pup.markedForDeletion = true;
    });
    powerUpsRef.current = powerUpsRef.current.filter(p => !p.markedForDeletion);

    // 5. PROYECTILES
    projectilesRef.current.forEach(proj => {
      proj.pos.y += proj.velocity;
      if (proj.pos.y < -50 || proj.pos.y > CANVAS_HEIGHT + 50) {
        proj.markedForDeletion = true;
      }

      if (!proj.isEnemy) {
        enemiesRef.current.forEach(enemy => {
          if (!enemy.markedForDeletion && !proj.markedForDeletion && isColliding(proj, enemy)) {
            
            if (!proj.penetrate) {
              proj.markedForDeletion = true;
            }
            
            enemy.hp--;
            createExplosion(proj.pos.x, proj.pos.y, '#fff', 3);

            if (enemy.hp <= 0) {
              enemy.markedForDeletion = true;
              createExplosion(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, '#ffaa00', 15);
              
              scoreRef.current += enemy.value;
              setStats(s => ({ ...s, score: scoreRef.current }));
              
              spawnPowerUp(enemy.pos.x, enemy.pos.y);
            }
          }
        });
      } else {
        if (!proj.markedForDeletion && isColliding(proj, player)) {
          proj.markedForDeletion = true;
          handlePlayerHit();
        }
      }
    });

    enemiesRef.current.forEach(enemy => {
        if (!enemy.markedForDeletion && enemy.pos.y + enemy.height >= player.pos.y) {
            handlePlayerHit();
            enemy.markedForDeletion = true;
        }
    });

    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion);
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);

    particlesRef.current.forEach(p => {
      p.pos.x += p.vx;
      p.pos.y += p.vy;
      p.life--;
      if (p.life <= 0) p.markedForDeletion = true;
    });
    particlesRef.current = particlesRef.current.filter(p => !p.markedForDeletion);

    // 6. CONTROL DE FIN DE NIVEL
    if (enemiesRef.current.length === 0) {
      if (levelRef.current < TOTAL_LEVELS) {
        gameStateRef.current = GameState.LEVEL_TRANSITION;
        setUiState(GameState.LEVEL_TRANSITION);
      } else {
        gameStateRef.current = GameState.VICTORY;
        setUiState(GameState.VICTORY);
        updateHighScore();
      }
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const isColliding = (rect1: {pos: Position, width: number, height: number}, rect2: {pos: Position, width: number, height: number}) => {
    return (
      rect1.pos.x < rect2.pos.x + rect2.width &&
      rect1.pos.x + rect1.width > rect2.pos.x &&
      rect1.pos.y < rect2.pos.y + rect2.height &&
      rect1.pos.y + rect1.height > rect2.pos.y
    );
  };

  const handlePlayerHit = () => {
    if (playerRef.current.invulnerableTimer > 0) {
        createExplosion(playerRef.current.pos.x + PLAYER_WIDTH/2, playerRef.current.pos.y + PLAYER_HEIGHT/2, '#00ffff', 5);
        return;
    }
    if (playerRef.current.hasShield) {
      playerRef.current.hasShield = false;
      playerRef.current.invulnerableTimer = PLAYER_INVULNERABLE_TIME; 
      createExplosion(playerRef.current.pos.x + PLAYER_WIDTH/2, playerRef.current.pos.y, COLOR_SHIELD, 20);
      projectilesRef.current = projectilesRef.current.filter(p => !p.isEnemy);
      shakeTimerRef.current = SCREEN_SHAKE_DURATION / 2;
      return;
    }

    livesRef.current -= 1;
    const currentLives = livesRef.current;
    setStats(s => ({ ...s, lives: currentLives }));
    
    createExplosion(playerRef.current.pos.x + PLAYER_WIDTH/2, playerRef.current.pos.y + PLAYER_HEIGHT/2, '#00ff00', 20);
    shakeTimerRef.current = SCREEN_SHAKE_DURATION; 
    
    if (currentLives <= 0) {
      gameStateRef.current = GameState.GAME_OVER;
      setUiState(GameState.GAME_OVER);
      updateHighScore();
    } else {
        playerRef.current.invulnerableTimer = PLAYER_INVULNERABLE_TIME;
        playerRef.current.weaponType = 'normal'; 
        projectilesRef.current = projectilesRef.current.filter(p => !p.isEnemy);
    }
  };

  const updateHighScore = () => {
    setStats(s => {
      const newHigh = Math.max(s.score, s.highScore);
      localStorage.setItem('cosmicDefenderHighScore', newHigh.toString());
      return { ...s, highScore: newHigh };
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    if (shakeTimerRef.current > 0) {
        const dx = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY;
        const dy = (Math.random() - 0.5) * SCREEN_SHAKE_INTENSITY;
        ctx.translate(dx, dy);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ffffff';
    for(let i=0; i<50; i++) {
        const x = (Date.now() / 20 + i * 137) % CANVAS_WIDTH;
        const y = (i * 311) % CANVAS_HEIGHT;
        ctx.globalAlpha = Math.random(); 
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1.0;

    powerUpsRef.current.forEach(pup => {
      ctx.fillStyle = pup.type === 'shield' ? COLOR_SHIELD : (pup.type === 'laser' ? COLOR_LASER : '#22c55e');
      ctx.fillRect(pup.pos.x, pup.pos.y, pup.width, pup.height);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      const symbol = pup.type === 'shield' ? 'S' : (pup.type === 'laser' ? 'L' : 'D');
      ctx.fillText(symbol, pup.pos.x + 6, pup.pos.y + 14);
    });

    const p = playerRef.current;
    if (p.invulnerableTimer > 0) {
       if (Math.floor(p.invulnerableTimer / 5) % 2 === 0) {
         ctx.globalAlpha = 0.3; 
       }
    }
    if (p.hasShield) {
      ctx.beginPath();
      ctx.strokeStyle = COLOR_SHIELD;
      ctx.lineWidth = 2;
      ctx.arc(p.pos.x + p.width/2, p.pos.y + p.height/2, p.width/1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLOR_SHIELD;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer / 5) % 2 === 0) ? 0.3 : 1.0;
    }

    if (spritesRef.current['player']) {
        ctx.drawImage(spritesRef.current['player'], p.pos.x, p.pos.y, p.width, p.height);
    } else {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(p.pos.x, p.pos.y, p.width, p.height);
    }
    ctx.globalAlpha = 1.0;

    enemiesRef.current.forEach(e => {
      let sprite = spritesRef.current['soldier'];
      if (e.type === 'captain') sprite = spritesRef.current['captain'];
      if (e.type === 'boss') sprite = spritesRef.current['boss'];

      if (e.hp < e.maxHp && Math.floor(Date.now() / 100) % 2 === 0) {
         ctx.globalAlpha = 0.5;
      }

      if (sprite) {
        ctx.drawImage(sprite, e.pos.x, e.pos.y, e.width, e.height);
      } else {
        ctx.fillStyle = e.type === 'soldier' ? '#ffffff' : (e.type === 'boss' ? '#ffff00' : '#8b5cf6');
        ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
      }
      ctx.globalAlpha = 1.0;
      
      if (e.type === 'boss') {
          ctx.fillStyle = 'red';
          ctx.fillRect(e.pos.x, e.pos.y - 10, e.width, 5);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(e.pos.x, e.pos.y - 10, e.width * (e.hp / e.maxHp), 5);
      }
    });

    projectilesRef.current.forEach(proj => {
      ctx.fillStyle = proj.color ? proj.color : (proj.isEnemy ? BULLET_COLOR_ENEMY : BULLET_COLOR_PLAYER);
      ctx.fillRect(proj.pos.x, proj.pos.y, proj.width, proj.height);
    });

    particlesRef.current.forEach(part => {
      ctx.globalAlpha = part.life / part.maxLife;
      ctx.fillStyle = part.color;
      ctx.fillRect(part.pos.x, part.pos.y, part.width, part.height);
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  };

  useEffect(() => {
    const saved = localStorage.getItem('cosmicDefenderHighScore');
    if (saved) {
      setStats(s => ({ ...s, highScore: parseInt(saved) }));
    }

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  return (
    <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-slate-700 bg-black crt">
      <GameOverlay 
        gameState={uiState} 
        stats={stats} 
        onStart={startGame} 
        onRestart={restartGame} 
        onNextLevel={advanceLevel}
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
        style={{ imageRendering: 'pixelated' }} 
      />
    </div>
  );
};
