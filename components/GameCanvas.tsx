
import React, { useRef, useEffect, useCallback } from 'react';
import { GameStatus, Lane, Obstacle, Orb } from '../types';
import { COLORS, LANE_WIDTH, HORIZON_Z, PLAYER_Z, INITIAL_SPEED, GRAVITY, JUMP_FORCE, LERP_SPEED } from '../constants';

interface GameCanvasProps {
  status: GameStatus;
  onGameOver: (score: number) => void;
  onUpdateScore: (score: number) => void;
  onUpdateCoins: (coins: number) => void;
  onUpdateSpeed: (speed: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, onGameOver, onUpdateScore, onUpdateCoins, onUpdateSpeed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Game state held in refs for 60fps performance
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const targetLaneRef = useRef<Lane>(Lane.CENTER);
  const displayXRef = useRef(0); // For smooth lerping
  const playerYRef = useRef(0);
  const playerVelYRef = useRef(0);
  const isSlidingRef = useRef(false);
  const slideTimerRef = useRef(0);
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const backgroundOffsetRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const resetGame = () => {
    scoreRef.current = 0;
    coinsRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    targetLaneRef.current = Lane.CENTER;
    displayXRef.current = 0;
    playerYRef.current = 0;
    playerVelYRef.current = 0;
    isSlidingRef.current = false;
    slideTimerRef.current = 0;
    obstaclesRef.current = [];
    orbsRef.current = [];
    spawnTimerRef.current = 0;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status !== GameStatus.PLAYING) return;

    if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && targetLaneRef.current > Lane.LEFT) {
      targetLaneRef.current--;
    } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && targetLaneRef.current < Lane.RIGHT) {
      targetLaneRef.current++;
    } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') && playerYRef.current === 0) {
      playerVelYRef.current = JUMP_FORCE;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      isSlidingRef.current = true;
      slideTimerRef.current = 35;
    }
  }, [status]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const update = (dt: number) => {
    if (status !== GameStatus.PLAYING) return;

    // Dynamics
    speedRef.current = Math.min(speedRef.current + 0.0015 * dt, 40);
    scoreRef.current += speedRef.current * 0.1 * dt;
    onUpdateScore(Math.floor(scoreRef.current));
    onUpdateSpeed(speedRef.current);

    // Smooth Lane Lerp
    const targetX = (targetLaneRef.current - 1) * LANE_WIDTH;
    displayXRef.current += (targetX - displayXRef.current) * LERP_SPEED;

    // Physics
    playerYRef.current += playerVelYRef.current * dt;
    if (playerYRef.current < 0) {
      playerVelYRef.current += GRAVITY * dt;
    } else {
      playerYRef.current = 0;
      playerVelYRef.current = 0;
    }

    if (slideTimerRef.current > 0) {
      slideTimerRef.current -= dt;
      if (slideTimerRef.current <= 0) isSlidingRef.current = false;
    }

    backgroundOffsetRef.current = (backgroundOffsetRef.current + speedRef.current) % 2000;

    // Spawning Logic
    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      const lane = Math.floor(Math.random() * 3) as Lane;
      const roll = Math.random();
      
      if (roll < 0.4) {
        obstaclesRef.current.push({
          id: Date.now(),
          lane,
          z: HORIZON_Z,
          type: 'TRAIN',
          length: 400 + Math.random() * 600
        });
      } else if (roll < 0.7) {
        obstaclesRef.current.push({
          id: Date.now(),
          lane,
          z: HORIZON_Z,
          type: 'HURDLE',
          length: 20
        });
      } else {
        obstaclesRef.current.push({
          id: Date.now(),
          lane,
          z: HORIZON_Z,
          type: 'SCANNER',
          length: 20
        });
      }

      // Spawn patterns of orbs
      const orbLane = Math.floor(Math.random() * 3) as Lane;
      for (let i = 0; i < 5; i++) {
        orbsRef.current.push({
          id: Date.now() + i,
          lane: orbLane,
          z: HORIZON_Z + 100 + (i * 80),
          isCollected: false
        });
      }

      spawnTimerRef.current = Math.max(12, 50 - (speedRef.current * 1.2));
    }

    // Move & Collide
    obstaclesRef.current.forEach(obs => {
      obs.z -= speedRef.current * dt;
      
      // Tight collision detection
      const obsEnd = obs.z + obs.length;
      if (obs.z < PLAYER_Z + 20 && obsEnd > PLAYER_Z - 20 && obs.lane === targetLaneRef.current) {
        let hit = false;
        if (obs.type === 'TRAIN') hit = true;
        if (obs.type === 'HURDLE' && playerYRef.current >= -40) hit = true;
        if (obs.type === 'SCANNER' && !isSlidingRef.current) hit = true;

        if (hit) onGameOver(Math.floor(scoreRef.current));
      }
    });

    orbsRef.current.forEach(orb => {
      orb.z -= speedRef.current * dt;
      if (orb.z > PLAYER_Z - 30 && orb.z < PLAYER_Z + 30 && orb.lane === targetLaneRef.current) {
        if (!orb.isCollected) {
          orb.isCollected = true;
          coinsRef.current += 1;
          scoreRef.current += 100;
          onUpdateCoins(coinsRef.current);
        }
      }
    });

    obstaclesRef.current = obstaclesRef.current.filter(obs => (obs.z + obs.length) > -100);
    orbsRef.current = orbsRef.current.filter(orb => orb.z > -100 && !orb.isCollected);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    const project = (x: number, y: number, z: number) => {
      const factor = 600 / (z + 600);
      return {
        x: width / 2 + (x) * factor,
        y: height / 2 + (y - height / 2) * factor,
        scale: factor
      };
    };

    // Draw Cityscape Background (Parallax)
    ctx.fillStyle = COLORS.BUILDING;
    for (let i = -10; i < 10; i++) {
      if (i === 0) continue;
      const bX = (i * 600) + (i > 0 ? 300 : -300);
      const bZ = (2000 - backgroundOffsetRef.current * 0.5) % 2000;
      for (let j = 0; j < 5; j++) {
        const pZ = (bZ + j * 400) % 2000;
        const p = project(bX, height, pZ);
        const h = 400 * p.scale;
        const w = 200 * p.scale;
        ctx.fillRect(p.x - w/2, p.y - h, w, h);
        ctx.strokeStyle = COLORS.CYAN;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - w/2, p.y - h, w, h);
        // Windows
        ctx.fillStyle = COLORS.CYAN + '33';
        ctx.fillRect(p.x - w/4, p.y - h*0.8, w/2, h*0.1);
      }
    }

    // Floor
    ctx.fillStyle = COLORS.DARK;
    const fL = project(-LANE_WIDTH * 2.5, height, 0);
    const fR = project(LANE_WIDTH * 2.5, height, 0);
    const fFL = project(-LANE_WIDTH * 1.5, height, HORIZON_Z);
    const fFR = project(LANE_WIDTH * 1.5, height, HORIZON_Z);
    ctx.beginPath();
    ctx.moveTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y); ctx.lineTo(fFR.x, fFR.y); ctx.lineTo(fFL.x, fFL.y);
    ctx.closePath(); ctx.fill();

    // Lanes
    ctx.strokeStyle = COLORS.MAGENTA;
    ctx.lineWidth = 2;
    for (let i = -1.5; i <= 1.5; i += 1) {
      const s = project(i * LANE_WIDTH, height, 0);
      const e = project(i * LANE_WIDTH, height, HORIZON_Z);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    }

    // Orbs
    orbsRef.current.forEach(orb => {
      const p = project((orb.lane - 1) * LANE_WIDTH, height - 60, orb.z);
      if (p.scale > 0) {
        ctx.fillStyle = COLORS.GOLD;
        ctx.shadowBlur = 10; ctx.shadowColor = COLORS.GOLD;
        ctx.beginPath(); ctx.arc(p.x, p.y, 12 * p.scale, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Obstacles
    obstaclesRef.current.forEach(obs => {
      const startP = project((obs.lane - 1) * LANE_WIDTH, height, obs.z);
      const endP = project((obs.lane - 1) * LANE_WIDTH, height, obs.z + obs.length);

      if (startP.scale > 0) {
        ctx.save();
        if (obs.type === 'TRAIN') {
          ctx.fillStyle = COLORS.TRAIN;
          ctx.strokeStyle = COLORS.MAGENTA;
          ctx.lineWidth = 3;
          // Simplified 3D box for train
          const wS = 100 * startP.scale;
          const hS = 160 * startP.scale;
          const wE = 100 * endP.scale;
          const hE = 160 * endP.scale;

          // Back face
          ctx.fillRect(endP.x - wE/2, endP.y - hE, wE, hE);
          // Connecting lines for depth
          ctx.beginPath();
          ctx.moveTo(startP.x - wS/2, startP.y); ctx.lineTo(endP.x - wE/2, endP.y);
          ctx.moveTo(startP.x + wS/2, startP.y); ctx.lineTo(endP.x + wE/2, endP.y);
          ctx.moveTo(startP.x - wS/2, startP.y - hS); ctx.lineTo(endP.x - wE/2, endP.y - hE);
          ctx.moveTo(startP.x + wS/2, startP.y - hS); ctx.lineTo(endP.x + wE/2, endP.y - hE);
          ctx.stroke();
          // Front face
          ctx.fillRect(startP.x - wS/2, startP.y - hS, wS, hS);
          ctx.strokeRect(startP.x - wS/2, startP.y - hS, wS, hS);
        } else if (obs.type === 'HURDLE') {
          ctx.fillStyle = COLORS.STONE;
          ctx.strokeStyle = COLORS.CYAN;
          ctx.fillRect(startP.x - 60 * startP.scale, startP.y - 40 * startP.scale, 120 * startP.scale, 40 * startP.scale);
          ctx.strokeRect(startP.x - 60 * startP.scale, startP.y - 40 * startP.scale, 120 * startP.scale, 40 * startP.scale);
        } else if (obs.type === 'SCANNER') {
          ctx.strokeStyle = COLORS.LASER;
          ctx.lineWidth = 5 * startP.scale;
          ctx.beginPath();
          ctx.moveTo(startP.x - 70 * startP.scale, startP.y - 180 * startP.scale);
          ctx.lineTo(startP.x + 70 * startP.scale, startP.y - 180 * startP.scale);
          ctx.stroke();
          ctx.fillStyle = COLORS.STONE;
          ctx.fillRect(startP.x - 70 * startP.scale, startP.y - 180 * startP.scale, 10 * startP.scale, 180 * startP.scale);
          ctx.fillRect(startP.x + 60 * startP.scale, startP.y - 180 * startP.scale, 10 * startP.scale, 180 * startP.scale);
        }
        ctx.restore();
      }
    });

    // Player
    const pProj = project(displayXRef.current, height + playerYRef.current, PLAYER_Z);
    ctx.save();
    ctx.translate(pProj.x, pProj.y);
    ctx.scale(pProj.scale, pProj.scale);
    
    // Animation bob
    const bob = Math.sin(Date.now() * 0.01) * 5;
    
    ctx.fillStyle = COLORS.STONE;
    ctx.strokeStyle = COLORS.CYAN;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15; ctx.shadowColor = COLORS.CYAN;

    if (isSlidingRef.current) {
      ctx.fillRect(-50, -30, 100, 30);
      ctx.strokeRect(-50, -30, 100, 30);
    } else {
      // Helmet
      ctx.fillRect(-20, -135 + bob, 40, 40);
      ctx.fillStyle = COLORS.CYAN;
      ctx.fillRect(-15, -120 + bob, 30, 5);
      // Body
      ctx.fillStyle = COLORS.STONE;
      ctx.fillRect(-35, -100 + bob, 70, 100);
      ctx.strokeRect(-35, -100 + bob, 70, 100);
      // Cape
      ctx.fillStyle = COLORS.MAGENTA + '66';
      ctx.beginPath();
      ctx.moveTo(-35, -90 + bob);
      ctx.lineTo(-60 - (speedRef.current * 0.5), -40 + bob);
      ctx.lineTo(-35, -10 + bob);
      ctx.fill();
    }
    ctx.restore();
  };

  const loop = (time: number) => {
    const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 16.67 : 1;
    lastTimeRef.current = time;
    update(dt);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      resetGame();
      requestRef.current = requestAnimationFrame(loop);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [status]);

  return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full" />;
};

export default GameCanvas;
