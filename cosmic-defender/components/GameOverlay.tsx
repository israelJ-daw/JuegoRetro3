
import React from 'react';
import { GameState, GameStats } from '../types';
import { TOTAL_LEVELS } from '../constants';
import { Shield, Trophy, Target, Heart, ArrowRight } from 'lucide-react';

interface GameOverlayProps {
  gameState: GameState;
  stats: GameStats;
  onStart: () => void;
  onRestart: () => void;
  onNextLevel?: () => void; // Nueva prop opcional
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ gameState, stats, onStart, onRestart, onNextLevel }) => {
  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between text-green-400 z-10 select-none pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Trophy size={20} />
            <span>PUNTOS: {stats.score.toString().padStart(6, '0')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600">
             <span>RÉCORD: {stats.highScore.toString().padStart(6, '0')}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
             <span className="text-xl font-bold tracking-widest text-white">NIVEL {stats.level}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
             <Heart size={20} className="fill-red-500 text-red-500" />
             <span>x {stats.lives}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- NUEVA PANTALLA DE TRANSICIÓN DE NIVEL ---
  if (gameState === GameState.LEVEL_TRANSITION) {
    const nextLevel = stats.level + 1;
    const isBossLevel = nextLevel === TOTAL_LEVELS;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 text-center p-8 backdrop-blur-sm">
        <h2 className="text-4xl text-green-400 mb-2 font-mono tracking-widest">MISIÓN CUMPLIDA</h2>
        <p className="text-xl text-white mb-8 font-mono">NIVEL {stats.level} COMPLETADO</p>
        
        <div className="bg-slate-900 border-2 border-green-600 p-6 rounded-lg mb-8 max-w-md animate-pulse">
           {isBossLevel ? (
             <>
               <p className="text-red-500 font-bold text-2xl mb-2 warning-text">⚠ ALERTA MÁXIMA ⚠</p>
               <p className="text-white">Se detecta una señal masiva...</p>
               <p className="text-white mt-2">¿Estás listo para enfrentarte al <span className="text-red-500 font-bold">JEFE FINAL</span>?</p>
             </>
           ) : (
             <p className="text-green-300">
               Preparando salto al hiperespacio hacia el <span className="text-white font-bold">NIVEL {nextLevel}</span>...
             </p>
           )}
        </div>

        <button 
          onClick={onNextLevel}
          className={`px-8 py-4 font-bold rounded shadow-[0_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 transition-all text-xl font-mono flex items-center gap-2 ${
            isBossLevel 
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900'
          }`}
        >
          {isBossLevel ? 'ENFRENTAR AL JEFE' : 'SIGUIENTE MISIÓN'} <ArrowRight />
        </button>
        
        <p className="mt-4 text-xs text-slate-500 font-mono">Presiona ENTER para continuar</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 text-center p-8 backdrop-blur-sm">
      {gameState === GameState.MENU && (
        <>
          <h1 className="text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-green-400 to-green-800 mb-8 animate-pulse font-bold shadow-green-500 drop-shadow-lg font-mono">
            COSMIC<br/>DEFENDER
          </h1>
          
          <div className="bg-slate-900 border-2 border-green-500 p-6 rounded max-w-lg w-full mb-8 shadow-lg shadow-green-900/50">
            <h2 className="text-green-400 mb-4 underline decoration-wavy decoration-green-600">INSTRUCCIONES</h2>
            <ul className="text-left text-sm space-y-3 text-slate-300 font-sans">
              <li className="flex items-center gap-3">
                <span className="bg-slate-700 px-2 py-1 rounded text-white font-mono shadow-sm border-b-2 border-slate-900">← / →</span>
                Mover Nave
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-slate-700 px-2 py-1 rounded text-white font-mono shadow-sm border-b-2 border-slate-900">ESPACIO</span>
                Disparar
              </li>
              <li className="flex items-center gap-3">
                <Target size={16} className="text-red-400"/>
                Elimina a los invasores
              </li>
              <li className="flex items-center gap-3">
                <Shield size={16} className="text-yellow-400"/>
                Sobrevive los {TOTAL_LEVELS} niveles
              </li>
            </ul>
          </div>

          <button 
            onClick={onStart}
            className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-[0_4px_0_rgb(20,83,45)] active:shadow-[0_0px_0_rgb(20,83,45)] active:translate-y-1 transition-all text-xl font-mono animate-bounce"
          >
            INSERT COIN (JUGAR)
          </button>
        </>
      )}

      {gameState === GameState.GAME_OVER && (
        <>
          <h2 className="text-6xl text-red-600 mb-4 font-mono">GAME OVER</h2>
          <div className="mb-8 text-2xl text-white font-mono">
            <p className="mb-2">PUNTUACIÓN: <span className="text-green-400">{stats.score}</span></p>
            <p className="text-sm text-slate-400">LLEGASTE AL NIVEL: {stats.level}</p>
          </div>
          <button 
            onClick={onRestart}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-[0_4px_0_rgb(153,27,27)] active:shadow-[0_0px_0_rgb(153,27,27)] active:translate-y-1 transition-all font-mono"
          >
            REINTENTAR MISIÓN
          </button>
        </>
      )}

      {gameState === GameState.VICTORY && (
        <>
          <h2 className="text-6xl text-yellow-400 mb-4 animate-bounce font-mono">¡VICTORIA!</h2>
          <div className="bg-slate-900/80 border-2 border-yellow-500 p-6 rounded-lg mb-8 max-w-lg">
             <p className="text-2xl text-green-300 mb-4 font-mono font-bold">
               ¡HAS ELIMINADO AL JEFE FINAL!
             </p>
             <p className="text-white mb-4 font-mono leading-relaxed">
               La amenaza alienígena ha sido erradicada. Has logrado salvar el <span className="text-yellow-400">SISTEMA SOLAR</span>.
             </p>
             <p className="text-slate-400 text-sm font-mono italic">
               Gracias por jugar, piloto.
             </p>
          </div>
          <div className="mb-8 p-4 bg-yellow-900/20 rounded">
            <p className="text-3xl text-white font-bold tracking-widest">SCORE FINAL: {stats.score}</p>
          </div>
          <button 
            onClick={onRestart}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-[0_4px_0_rgb(161,98,7)] active:shadow-[0_0px_0_rgb(161,98,7)] active:translate-y-1 transition-all font-mono"
          >
            JUGAR DE NUEVO
          </button>
        </>
      )}
    </div>
  );
};
