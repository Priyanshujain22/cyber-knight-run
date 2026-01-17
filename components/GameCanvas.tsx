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
  const isMobileRef = useRef<boolean>(false);
  const dprRef = useRef<number>(1);
  const pausedRef = useRef<boolean>(false);
  const lowQualityRef = useRef<boolean>(false);
  const backgroundLayersRef = useRef<number>(5);
  const maxObstaclesRef = useRef<number>(12);
  const maxOrbsRef = useRef<number>(40);
  const frameTimesRef = useRef<number[]>([]);
  
  // Game state held in refs for 60fps performance
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const targetLaneRef = useRef<Lane>(Lane.CENTER);
  const displayXRef = useRef(0);
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

  // Touch / pointer controls
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dt = Date.now() - startTime;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (dt < 250 && absX < 10 && absY < 10) {
        if (playerYRef.current === 0) playerVelYRef.current = JUMP_FORCE;
        return;
      }

      if (absX > 40 && absX > absY) {
        if (dx < 0 && targetLaneRef.current > Lane.LEFT) targetLaneRef.current--;
        if (dx > 0 && targetLaneRef.current < Lane.RIGHT) targetLaneRef.current++;
        return;
      }

      if (dy > 40 && absY > absX) {
        isSlidingRef.current = true;
        slideTimerRef.current = 35;
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const update = (dt: number) => {
    if (status !== GameStatus.PLAYING) return;

    speedRef.current = Math.min(speedRef.current + 0.0015 * dt, 40);
    scoreRef.current += speedRef.current * 0.1 * dt;
    onUpdateScore(Math.floor(scoreRef.current));
    onUpdateSpeed(speedRef.current);

    const targetX = (targetLaneRef.current - 1) * LANE_WIDTH;
    displayXRef.current += (targetX - displayXRef.current) * LERP_SPEED;

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

    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      if (obstaclesRef.current.length < maxObstaclesRef.current) {
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
      } else {
        spawnTimerRef.current = 10;
      }
    }

    obstaclesRef.current.forEach(obs => {
      obs.z -= speedRef.current * dt;
      
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

    obstaclesRef.current = obstaclesRef.current.filter(obs => (obs.z + obs.length) > -100).slice(0, maxObstaclesRef.current);
    orbsRef.current = orbsRef.current.filter(orb => orb.z > -100 && !orb.isCollected).slice(0, maxOrbsRef.current);
  };

  const draw = (ctx: CanvasRenderingContext2D, timeMs: number) => {
    const canvas = ctx.canvas;
    const dpr = dprRef.current || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const project = (x: number, y: number, z: number) => {
      const factor = 600 / (z + 600);
      return {
        x: cssWidth / 2 + (x) * factor,
        y: cssHeight / 2 + (y - cssHeight / 2) * factor,
        scale: factor
      };
    };

    ctx.fillStyle = COLORS.BUILDING;
    const bgLayers = Math.max(1, backgroundLayersRef.current);
    for (let i = -4; i < 5; i++) {
      if (i === 0) continue;
      const bX = (i * 600) + (i > 0 ? 300 : -300);
      const bZ = (2000 - backgroundOffsetRef.current * 0.5) % 2000;
      for (let j = 0; j < bgLayers; j++) {
        const pZ = (bZ + j * 400) % 2000;
        const p = project(bX, cssHeight, pZ);
        const h = 400 * p.scale;
        const w = 200 * p.scale;
        ctx.fillRect(p.x - w/2, p.y - h, w, h);
        if (!lowQualityRef.current) {
          ctx.strokeStyle = COLORS.CYAN;
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x - w/2, p.y - h, w, h);
          ctx.fillStyle = COLORS.CYAN + '33';
          ctx.fillRect(p.x - w/4, p.y - h*0.8, w/2, h*0.1);
        }
      }
    }

    ctx.fillStyle = COLORS.DARK;
    const fL = project(-LANE_WIDTH * 2.5, cssHeight, 0);
    const fR = project(LANE_WIDTH * 2.5, cssHeight, 0);
    const fFL = project(-LANE_WIDTH * 1.5, cssHeight, HORIZON_Z);
    const fFR = project(LANE_WIDTH * 1.5, cssHeight, HORIZON_Z);
    ctx.beginPath();
    ctx.moveTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y); ctx.lineTo(fFR.x, fFR.y); ctx.lineTo(fFL.x, fFL.y);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = COLORS.MAGENTA;
    ctx.lineWidth = 2;
    for (let i = -1.5; i <= 1.5; i += 1) {
      const s = project(i * LANE_WIDTH, cssHeight, 0);
      const e = project(i * LANE_WIDTH, cssHeight, HORIZON_Z);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    }

    orbsRef.current.forEach(orb => {
      const p = project((orb.lane - 1) * LANE_WIDTH, cssHeight - 60, orb.z);
      if (p.scale > 0) {
        ctx.fillStyle = COLORS.GOLD;
        ctx.shadowBlur = isMobileRef.current ? 6 : 10; ctx.shadowColor = COLORS.GOLD;
        ctx.beginPath(); ctx.arc(p.x, p.y, 12 * p.scale, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    obstaclesRef.current.forEach(obs => {
      const startP = project((obs.lane - 1) * LANE_WIDTH, cssHeight, obs.z);
      const endP = project((obs.lane - 1) * LANE_WIDTH, cssHeight, obs.z + obs.length);

      if (startP.scale > 0) {
        ctx.save();
        if (obs.type === 'TRAIN') {
          ctx.fillStyle = COLORS.TRAIN;
          ctx.strokeStyle = COLORS.MAGENTA;
          ctx.lineWidth = 3;
          const wS = 100 * startP.scale;
          const hS = 160 * startP.scale;
          const wE = 100 * endP.scale;
          const hE = 160 * endP.scale;

          ctx.fillRect(endP.x - wE/2, endP.y - hE, wE, hE);
          ctx.beginPath();
          ctx.moveTo(startP.x - wS/2, startP.y); ctx.lineTo(endP.x - wE/2, endP.y);
          ctx.moveTo(startP.x + wS/2, startP.y); ctx.lineTo(endP.x + wE/2, endP.y);
          ctx.moveTo(startP.x - wS/2, startP.y - hS); ctx.lineTo(endP.x - wE/2, endP.y - hE);
          ctx.moveTo(startP.x + wS/2, startP.y - hS); ctx.lineTo(endP.x + wE/2, endP.y - hE);
          if (!lowQualityRef.current) ctx.stroke();
          ctx.fillRect(startP.x - wS/2, startP.y - hS, wS, hS);
          if (!lowQualityRef.current) ctx.strokeRect(startP.x - wS/2, startP.y - hS, wS, hS);
        } else if (obs.type === 'HURDLE') {
          ctx.fillStyle = COLORS.STONE;
          ctx.strokeStyle = COLORS.CYAN;
          ctx.fillRect(startP.x - 60 * startP.scale, startP.y - 40 * startP.scale, 120 * startP.scale, 40 * startP.scale);
          if (!lowQualityRef.current) ctx.strokeRect(startP.x - 60 * startP.scale, startP.y - 40 * startP.scale, 120 * startP.scale, 40 * startP.scale);
        } else if (obs.type === 'SCANNER') {
          ctx.strokeStyle = COLORS.LASER;
          ctx.lineWidth = 5 * startP.scale;
          ctx.beginPath();
          ctx.moveTo(startP.x - 70 * startP.scale, startP.y - 180 * startP.scale);
          ctx.lineTo(startP.x + 70 * startP.scale, startP.y - 180 * startP.scale);
          if (!lowQualityRef.current) ctx.stroke();
          ctx.fillStyle = COLORS.STONE;
          ctx.fillRect(startP.x - 70 * startP.scale, startP.y - 180 * startP.scale, 10 * startP.scale, 180 * startP.scale);
          if (!lowQualityRef.current) ctx.fillRect(startP.x + 60 * startP.scale, startP.y - 180 * startP.scale, 10 * startP.scale, 180 * startP.scale);
        }
        ctx.restore();
      }
    });

    const pProj = project(displayXRef.current, cssHeight + playerYRef.current, PLAYER_Z);
    ctx.save();
    ctx.translate(pProj.x, pProj.y);
    ctx.scale(pProj.scale, pProj.scale);

    const bob = Math.sin(timeMs * 0.001) * 5;

    ctx.fillStyle = COLORS.STONE;
    ctx.strokeStyle = COLORS.CYAN;
    ctx.lineWidth = 4;
    ctx.shadowBlur = isMobileRef.current ? 8 : 15; ctx.shadowColor = COLORS.CYAN;

    if (isSlidingRef.current) {
      ctx.fillRect(-50, -30, 100, 30);
      ctx.strokeRect(-50, -30, 100, 30);
    } else {
      ctx.fillRect(-20, -135 + bob, 40, 40);
      ctx.fillStyle = COLORS.CYAN;
      ctx.fillRect(-15, -120 + bob, 30, 5);
      ctx.fillStyle = COLORS.STONE;
      ctx.fillRect(-35, -100 + bob, 70, 100);
      ctx.strokeRect(-35, -100 + bob, 70, 100);
      ctx.fillStyle = COLORS.MAGENTA + '66';
      ctx.beginPath();
      ctx.moveTo(-35, -90 + bob);
      ctx.lineTo(-60 - (speedRef.current * 0.5), -40 + bob);
      ctx.lineTo(-35, -10 + bob);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const loop = (time: number) => {
    const timeMs = time;
    const dtMs = lastTimeRef.current ? (timeMs - lastTimeRef.current) : (1000 / 60);
    const targetFPS = isMobileRef.current ? 30 : 60;
    const minFrameMs = 1000 / targetFPS;

    if (dtMs < minFrameMs) {
      requestRef.current = requestAnimationFrame(loop);
      return;
    }

    const ft = frameTimesRef.current;
    ft.push(dtMs);
    if (ft.length > 30) ft.shift();
    const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
    
    if (avg > 28) {
      lowQualityRef.current = true;
      backgroundLayersRef.current = Math.max(2, Math.floor(backgroundLayersRef.current / 2));
      maxObstaclesRef.current = Math.max(6, Math.floor(maxObstaclesRef.current * 0.7));
      maxOrbsRef.current = Math.max(12, Math.floor(maxOrbsRef.current * 0.7));
    } else if (avg < 18) {
      lowQualityRef.current = isMobileRef.current ? true : false;
      backgroundLayersRef.current = isMobileRef.current ? 3 : 6;
      maxObstaclesRef.current = isMobileRef.current ? 8 : 16;
      maxOrbsRef.current = isMobileRef.current ? 20 : 60;
    }

    lastTimeRef.current = timeMs;
    const dt = dtMs / 16.67;
    update(dt);

    if (!pausedRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx, timeMs);
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    try { isMobileRef.current = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent) || window.matchMedia('(pointer:coarse)').matches; } catch (e) { isMobileRef.current = false; }
    dprRef.current = Math.min(window.devicePixelRatio || 1, isMobileRef.current ? 1.5 : 2);

    if (isMobileRef.current) {
      lowQualityRef.current = true;
      backgroundLayersRef.current = 3;
      maxObstaclesRef.current = 8;
      maxOrbsRef.current = 20;
    } else {
      lowQualityRef.current = false;
      backgroundLayersRef.current = 6;
      maxObstaclesRef.current = 16;
      maxOrbsRef.current = 60;
    }

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cssW = Math.max(320, window.innerWidth);
      const cssH = Math.max(480, window.innerHeight);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const backingStoreRatio = dprRef.current;
      const w = Math.floor(cssW * backingStoreRatio);
      const h = Math.floor(cssH * backingStoreRatio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(backingStoreRatio, 0, 0, backingStoreRatio, 0, 0);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    if (status === GameStatus.PLAYING) {
      resetGame();
      pausedRef.current = false;
      requestRef.current = requestAnimationFrame(loop);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    const onVisibility = () => {
      if (document.hidden) {
        pausedRef.current = true;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      } else {
        pausedRef.current = false;
        lastTimeRef.current = 0;
        requestRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status]);

  return <canvas ref={canvasRef} className="w-full h-full touch-none" />;
};

export default GameCanvas;
