
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, DailyChallenge } from './types';
import { fetchDailyChallenge, fetchDeathMessage } from './services/geminiService';
import { COLORS } from './constants';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [deathMessage, setDeathMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const daily = await fetchDailyChallenge();
      setChallenge(daily);
      setLoading(false);
      const saved = localStorage.getItem('cyberKnightHighScore');
      if (saved) setHighScore(parseInt(saved));
    };
    init();
  }, []);

  const handleStart = () => {
    setScore(0);
    setCoins(0);
    setStatus(GameStatus.PLAYING);
  };

  const handleGameOver = async (finalScore: number) => {
    setStatus(GameStatus.GAMEOVER);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('cyberKnightHighScore', finalScore.toString());
    }
    const msg = await fetchDeathMessage(finalScore);
    setDeathMessage(msg);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505] scanlines">
      <GameCanvas 
        status={status} 
        onGameOver={handleGameOver}
        onUpdateScore={setScore}
        onUpdateCoins={setCoins}
        onUpdateSpeed={setSpeed}
      />

      {status === GameStatus.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-cyan-400 animate-pulse shadow-[0_0_10px_cyan]" />
              <span className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg">
                {Math.floor(score).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400 ml-6">
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">Data Orbs</span>
              <span className="text-xl font-bold font-mono">{coins}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-[10px] text-magenta-400 font-bold uppercase mb-1">Neural Sync</div>
            <div className="w-40 h-1.5 bg-gray-900 border border-magenta-500/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-magenta-500 shadow-[0_0_15px_#ff00ff]" 
                style={{ width: `${Math.min((speed / 40) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {status === GameStatus.START && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="relative mb-12">
            <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-center leading-[0.8]" style={{ color: COLORS.CYAN }}>
              CYBER<br/><span className="text-magenta-500">KNIGHT</span>
            </h1>
            <div className="absolute -right-4 -bottom-2 text-white bg-magenta-600 px-2 py-1 text-[10px] font-bold uppercase tracking-widest skew-x-[-15deg]">
              Subway Edition
            </div>
          </div>

          {!loading && challenge && (
            <div className="mb-8 max-w-sm w-full p-4 border border-cyan-500/50 bg-cyan-900/10 rounded-lg text-center backdrop-blur-sm">
              <div className="text-[9px] text-cyan-400 uppercase tracking-[0.3em] mb-1">Daily Protocol</div>
              <h2 className="text-lg font-bold text-yellow-400 uppercase mb-1">{challenge.title}</h2>
              <p className="text-[11px] text-gray-400 italic">"{challenge.description}"</p>
            </div>
          )}

          <button 
            onClick={handleStart}
            className="group relative px-16 py-5 overflow-hidden border-2 border-magenta-500 transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-magenta-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 text-white font-black text-2xl uppercase tracking-[0.2em]">Enter Grid</span>
          </button>

          <div className="mt-12 flex gap-8 text-[10px] text-gray-500 font-bold uppercase">
             <div className="flex flex-col items-center"><span className="text-cyan-400 text-lg">A/D</span>Lanes</div>
             <div className="flex flex-col items-center"><span className="text-cyan-400 text-lg">W</span>Jump</div>
             <div className="flex flex-col items-center"><span className="text-cyan-400 text-lg">S</span>Slide</div>
          </div>
        </div>
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl">
          <div className="text-red-500 text-sm font-bold tracking-[0.5em] uppercase mb-2">System Failure</div>
          <h2 className="text-6xl font-black text-white mb-8 italic tracking-tighter">KNIGHT_FALLEN</h2>
          
          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 mb-8 w-full max-w-md">
            <p className="text-cyan-400 font-mono text-sm mb-6">"{deathMessage}"</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <div className="text-[9px] uppercase text-gray-500">Score</div>
                <div className="text-3xl font-black text-white">{Math.floor(score)}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase text-gray-500">Peak Record</div>
                <div className="text-3xl font-black text-magenta-500">{highScore}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={handleStart} className="w-full py-4 bg-cyan-500 text-black font-black uppercase tracking-widest hover:bg-white transition-colors">
              Reboot Matrix
            </button>
            <button onClick={() => setStatus(GameStatus.START)} className="w-full py-4 border border-white/20 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-colors text-xs">
              Return to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
