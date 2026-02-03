import React from 'react';
import { GameCanvas } from './components/GameCanvas';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="mb-4 text-center">
        <h1 className="text-xl text-slate-500 font-mono tracking-tighter">RETRO ARCADE SYSTEMS</h1>
      </div>
      
      <GameCanvas />
      
      <div className="mt-6 text-slate-500 text-xs font-mono text-center max-w-lg">
        <p>CONTROL: [←][→] MOVEMENT • [SPACE] FIRE</p>
        <p className="mt-2">DEVELOPED WITH AI ASSISTANCE • HTML5 CANVAS • REACT</p>
      </div>
    </div>
  );
}