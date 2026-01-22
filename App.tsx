
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
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505] scanlines font-['Orbitron']">
      <GameCanvas
        status={status}
        onGameOver={handleGameOver}
        onUpdateScore={setScore}
        onUpdateCoins={setCoins}
        onUpdateSpeed={setSpeed}
      />

      {status === GameStatus.PLAYING && (
        <div className="absolute top-0 left-0 w-full px-4 md:px-8 pt-4 md:pt-8 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-3">
            <div className="glass-panel px-6 py-3 rounded-xl flex items-center gap-4 border-l-4 border-cyan-400">
              <div className="flex flex-col">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest leading-none mb-1">Score Matrix</span>
                <span className="text-3xl md:text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
                  {Math.floor(score).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3 self-start border-l-4 border-yellow-400">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm font-bold text-yellow-400 font-mono tracking-widest">DRIVES: {coins}</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border-r-4 border-magenta-500">
            <div className="text-[10px] text-magenta-400 font-bold uppercase tracking-widest mb-2 text-right">Velocity Interface</div>
            <div className="w-32 md:w-48 h-2 bg-gray-900 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-gray-800" />
              <div
                className="h-full bg-gradient-to-r from-magenta-900 to-magenta-500 shadow-[0_0_15px_#ff00ff] relative z-10 transition-all duration-100 ease-linear"
                style={{ width: `${Math.min((speed / 40) * 100, 100)}%` }}
              />
            </div>
            <div className="text-right mt-1 font-mono text-xs text-magenta-300">{Math.floor(speed * 3.6)} km/h</div>
          </div>
        </div>
      )}

      {status === GameStatus.START && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 backdrop-blur-sm z-20">
          <div className="relative mb-16 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-magenta-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-1000"></div>
            <h1 className="glitch text-7xl md:text-9xl font-black italic tracking-tighter text-center leading-[0.8]" data-text="CYBERKNIGHT" style={{ color: COLORS.CYAN }}>
              CYBER<br /><span className="text-magenta-500">KNIGHT</span>
            </h1>
            <div className="absolute -right-8 -bottom-4 text-white bg-magenta-600 px-3 py-1 text-xs font-bold uppercase tracking-widest skew-x-[-15deg] shadow-[5px_5px_0px_rgba(0,0,0,0.5)]">
              Neo-Tokyo Run
            </div>
          </div>

          {!loading && challenge && (
            <div className="glass-panel mb-8 max-w-md w-full p-6 rounded-xl border border-cyan-500/30 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-[0.4em] mb-2">Target Protocol Loaded</div>
              <h2 className="text-2xl font-bold text-yellow-400 uppercase mb-2 text-shadow-neon">{challenge.title}</h2>
              <p className="text-sm text-gray-300 italic font-mono border-t border-white/10 pt-2 mt-2">"{challenge.description}"</p>
            </div>
          )}

          <button
            onClick={handleStart}
            className="group relative px-20 py-6 overflow-hidden bg-transparent border-2 border-magenta-500 transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-magenta-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)" />
            <div className="absolute inset-0 bg-magenta-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 delay-75" />
            <span className="relative z-10 text-white font-black text-3xl uppercase tracking-[0.2em] group-hover:text-shadow-neon">
              Initialize
            </span>
          </button>

          <div className="mt-16 grid grid-cols-3 gap-8 text-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded border border-cyan-500 flex items-center justify-center text-xl font-bold text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]">A/D</div>
              <span className="text-[10px] uppercase tracking-widest">Strafe</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded border border-cyan-500 flex items-center justify-center text-xl font-bold text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]">W</div>
              <span className="text-[10px] uppercase tracking-widest">Jump</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded border border-cyan-500 flex items-center justify-center text-xl font-bold text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]">S</div>
              <span className="text-[10px] uppercase tracking-widest">Slide</span>
            </div>
          </div>
        </div>
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md z-30">
          <div className="text-red-500/80 text-sm font-bold tracking-[1em] uppercase mb-4 animate-pulse">Connection Lost</div>
          <h2 className="glitch text-8xl md:text-9xl font-black text-white mb-12 italic tracking-tighter" data-text="FLATLINED">FLATLINED</h2>

          <div className="glass-panel p-10 rounded-2xl border border-white/10 mb-10 w-full max-w-xl relative overflow-hidden group">
            <div className="absolute -inset-px bg-gradient-to-b from-transparent via-red-500/10 to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 pointer-events-none"></div>

            <p className="text-cyan-300 font-mono text-lg mb-8 border-b border-white/10 pb-6">"{deathMessage}"</p>

            <div className="grid grid-cols-2 gap-12">
              <div className="text-left flex flex-col gap-1">
                <div className="text-xs uppercase tracking-widest text-gray-400">Final Score</div>
                <div className="text-5xl font-black text-white tracking-tight">{Math.floor(score)}</div>
              </div>
              <div className="text-right flex flex-col gap-1">
                <div className="text-xs uppercase tracking-widest text-gray-400">High Score</div>
                <div className="text-5xl font-black text-magenta-500 tracking-tight drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">{highScore}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={handleStart}
              className="group w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
              Reboot Matrix
            </button>
            <button
              onClick={() => setStatus(GameStatus.START)}
              className="w-full py-4 border border-white/20 text-white/70 hover:text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-colors text-xs"
            >
              Return to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
