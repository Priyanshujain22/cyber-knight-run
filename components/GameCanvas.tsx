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

        let obsType: Obstacle['type'] = 'TRAIN';
        let length = 400 + Math.random() * 600;

        if (roll < 0.3) {
          obsType = 'TRAIN';
        } else if (roll < 0.6) {
          obsType = 'HURDLE';
          length = 20;
        } else if (roll < 0.8) {
          obsType = 'SCANNER';
          length = 20;
        } else {
          obsType = 'RAMP';
          length = 60;
        }

        obstaclesRef.current.push({
          id: Date.now(),
          lane,
          z: HORIZON_Z,
          type: obsType,
          length
        });

        // Spawn coins
        if (obsType === 'RAMP') {
          // Arc over ramp
          for (let i = 0; i < 6; i++) {
            const arcHeight = Math.sin((i / 5) * Math.PI) * 200;
            orbsRef.current.push({
              id: Date.now() + i,
              lane,
              z: HORIZON_Z + (i * 80),
              isCollected: false
            });
          }
        } else {
          const orbLane = Math.floor(Math.random() * 3) as Lane;
          for (let i = 0; i < 5; i++) {
            orbsRef.current.push({
              id: Date.now() + i,
              lane: orbLane,
              z: HORIZON_Z + 100 + (i * 80),
              isCollected: false
            });
          }
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

        if (obs.type === 'RAMP') {
          // Ramp Logic: Boost if on ground
          if (playerYRef.current > -10) {
            playerVelYRef.current = JUMP_FORCE * 1.5; // Super Jump
            hit = false; // Safe
          }
        } else {
          if (obs.type === 'TRAIN') hit = true;
          if (obs.type === 'HURDLE' && playerYRef.current >= -40) hit = true;
          if (obs.type === 'SCANNER' && !isSlidingRef.current) hit = true;
        }

        if (hit) onGameOver(Math.floor(scoreRef.current));
      }
    });

    orbsRef.current.forEach(orb => {
      orb.z -= speedRef.current * dt;
      if (orb.z > PLAYER_Z - 30 && orb.z < PLAYER_Z + 30 && orb.lane === targetLaneRef.current) {
        // Auto collect if jumping high near it (simple proximity)
        const heightDiff = Math.abs(playerYRef.current); // Simple heuristic
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

    // Full reset: clear any transform, shadow, or state
    ctx.resetTransform();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up transform for scaled drawing
    ctx.scale(dpr, dpr);

    // World Curvature Projection
    const project = (x: number, y: number, z: number) => {
      const scale = 600 / (z + 600);
      const x2d = cssWidth / 2 + x * scale;
      // Curvature: items drop down as they get further away
      const yCurve = (z * z) * 0.0001;
      const y2d = cssHeight / 2 + (y + yCurve - cssHeight / 2) * scale;
      return { x: x2d, y: y2d, scale };
    };

    // Draw retro-wave sun
    const sunY = cssHeight / 2 - 50; // Lower sun due to curve
    const sunSize = 400;
    const sunGradient = ctx.createLinearGradient(cssWidth / 2, sunY - sunSize / 2, cssWidth / 2, sunY + sunSize / 2);
    sunGradient.addColorStop(0, '#ffff00');
    sunGradient.addColorStop(0.5, '#ff00ff');
    sunGradient.addColorStop(1, '#9900ff');

    ctx.save();
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(cssWidth / 2, sunY, 150, 0, Math.PI * 2);
    ctx.fill();

    // Sun scanlines
    ctx.fillStyle = '#050505';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(cssWidth / 2 - 160, sunY + 20 + (i * 12), 320, 4 + (i * 0.5));
    }

    // Sun Glow
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(cssWidth / 2, sunY, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw background buildings
    ctx.fillStyle = COLORS.BUILDING;
    const bgLayers = Math.max(1, backgroundLayersRef.current);
    for (let i = -4; i < 5; i++) {
      if (i === 0) continue;
      const bX = (i * 600) + (i > 0 ? 300 : -300);
      const bZ = (2000 - backgroundOffsetRef.current * 0.5) % 2000;
      for (let j = 0; j < bgLayers; j++) {
        const pZ = (bZ + j * 400) % 2000;
        const p = project(bX, cssHeight - 200, pZ); // Lift buildings up slightly against curve
        const h = 600 * p.scale;
        const w = 200 * p.scale;

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(p.x - w / 2, p.y - h, w, h);

        if (!lowQualityRef.current) {
          ctx.strokeStyle = '#2a2a4a';
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x - w / 2, p.y - h, w, h);

          // Building Windows
          ctx.fillStyle = Math.sin(timeMs * 0.002 + i + j) > 0 ? '#00f3ff' : '#ff00ff';
          const winSize = 10 * p.scale;
          const gap = 20 * p.scale;
          for (let wx = 0; wx < 3; wx++) {
            for (let wy = 0; wy < 15; wy++) {
              if (Math.random() > 0.8) {
                ctx.globalAlpha = 0.6;
                ctx.fillRect(
                  (p.x - w / 2) + 10 * p.scale + (wx * (winSize + gap)),
                  (p.y - h) + 10 * p.scale + (wy * (winSize + gap)),
                  winSize,
                  winSize
                );
                ctx.globalAlpha = 1.0;
              }
            }
          }
        }
      }
    }

    // Draw grid floor
    const fL = project(-LANE_WIDTH * 4, cssHeight, 0);
    const fR = project(LANE_WIDTH * 4, cssHeight, 0);
    const fFL = project(-LANE_WIDTH * 2, cssHeight, HORIZON_Z);
    const fFR = project(LANE_WIDTH * 2, cssHeight, HORIZON_Z);

    // Floor Gradient
    const floorGrad = ctx.createLinearGradient(0, cssHeight / 2, 0, cssHeight);
    floorGrad.addColorStop(0, '#0a0014');
    floorGrad.addColorStop(1, '#1a0028');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y); ctx.lineTo(fFR.x, fFR.y); ctx.lineTo(fFL.x, fFL.y);
    ctx.closePath();
    ctx.fill();

    // Moving Grid Lines (Horizontal)
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
    ctx.lineWidth = 1;
    const gridOffset = (backgroundOffsetRef.current % 200);
    for (let z = 0; z < HORIZON_Z; z += 200) {
      const rZ = (z - gridOffset + 2000) % 2000;
      const p1 = project(-LANE_WIDTH * 10, cssHeight, rZ);
      const p2 = project(LANE_WIDTH * 10, cssHeight, rZ);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Vertical Grid Lines
    for (let x = -4; x <= 4; x++) {
      const p1 = project(x * LANE_WIDTH * 1.5, cssHeight, 0);
      const p2 = project(x * LANE_WIDTH * 1.5, cssHeight, HORIZON_Z);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Lane Warnings
    for (let l = 0; l < 3; l++) {
      const lane = l as Lane;
      const obs = obstaclesRef.current.find(o => o.lane === lane && o.z > PLAYER_Z && o.z < PLAYER_Z + 1200);
      if (obs) {
        const wP = project((lane - 1) * LANE_WIDTH, cssHeight - 250, obs.z); // Project above lane
        // Only show if reasonably close
        if (wP.scale > 0 && obs.z < HORIZON_Z) {
          ctx.save();
          ctx.globalAlpha = Math.abs(Math.sin(timeMs * 0.01));
          ctx.fillStyle = '#ff0000';
          ctx.font = `bold ${30 * wP.scale}px Orbitron`;
          ctx.textAlign = 'center';
          ctx.fillText('!', wP.x, wP.y - 100 * wP.scale);

          // Draw arrow
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3 * wP.scale;
          ctx.beginPath();
          ctx.moveTo(wP.x - 10 * wP.scale, wP.y - 80 * wP.scale);
          ctx.lineTo(wP.x, wP.y - 60 * wP.scale);
          ctx.lineTo(wP.x + 10 * wP.scale, wP.y - 80 * wP.scale);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Active Lane Highlight
    const lS = project((targetLaneRef.current - 1) * LANE_WIDTH, cssHeight, 0);
    const lE = project((targetLaneRef.current - 1) * LANE_WIDTH, cssHeight, HORIZON_Z);
    ctx.fillStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(lS.x - 40, lS.y);
    ctx.lineTo(lS.x + 40, lS.y);
    ctx.lineTo(lE.x + 10, lE.y);
    ctx.lineTo(lE.x - 10, lE.y);
    ctx.fill();

    // Draw orbs/coins
    orbsRef.current.forEach(orb => {
      const p = project((orb.lane - 1) * LANE_WIDTH, cssHeight - 60, orb.z);
      if (p.scale > 0) {
        ctx.save();
        ctx.fillStyle = COLORS.GOLD;
        ctx.shadowColor = COLORS.GOLD;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        const osc = Math.sin(timeMs * 0.005 + orb.id) * 5 * p.scale;
        ctx.arc(p.x, p.y + osc, 12 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(p.x - 3 * p.scale, p.y - 3 * p.scale + osc, 4 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // Draw obstacles
    obstaclesRef.current.forEach(obs => {
      const startP = project((obs.lane - 1) * LANE_WIDTH, cssHeight, obs.z);
      const endP = project((obs.lane - 1) * LANE_WIDTH, cssHeight, obs.z + obs.length);

      if (startP.scale > 0) {
        ctx.save();
        if (obs.type === 'TRAIN') {
          ctx.fillStyle = COLORS.TRAIN;
          ctx.strokeStyle = COLORS.MAGENTA;
          ctx.lineWidth = 2;
          ctx.shadowColor = COLORS.MAGENTA;
          ctx.shadowBlur = 5;

          const wS = 100 * startP.scale;
          const hS = 160 * startP.scale;
          const wE = 100 * endP.scale;
          const hE = 160 * endP.scale;

          // Train Body
          ctx.fillRect(endP.x - wE / 2, endP.y - hE, wE, hE);
          ctx.strokeRect(endP.x - wE / 2, endP.y - hE, wE, hE);

          ctx.beginPath();
          ctx.moveTo(startP.x - wS / 2, startP.y);
          ctx.lineTo(endP.x - wE / 2, endP.y);
          ctx.moveTo(startP.x + wS / 2, startP.y);
          ctx.lineTo(endP.x + wE / 2, endP.y);
          ctx.moveTo(startP.x - wS / 2, startP.y - hS);
          ctx.lineTo(endP.x - wE / 2, endP.y - hE);
          ctx.moveTo(startP.x + wS / 2, startP.y - hS);
          ctx.lineTo(endP.x + wE / 2, endP.y - hE);
          ctx.stroke();

          // Front Face
          ctx.fillStyle = '#2a2a4a';
          ctx.fillRect(startP.x - wS / 2, startP.y - hS, wS, hS);
          ctx.strokeRect(startP.x - wS / 2, startP.y - hS, wS, hS);

          // Train Lights
          ctx.fillStyle = '#00f3ff';
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(startP.x - wS / 4, startP.y - hS / 1.5, 5 * startP.scale, 0, Math.PI * 2);
          ctx.arc(startP.x + wS / 4, startP.y - hS / 1.5, 5 * startP.scale, 0, Math.PI * 2);
          ctx.fill();

        } else if (obs.type === 'HURDLE') {
          ctx.fillStyle = '#444';
          ctx.strokeStyle = COLORS.CYAN;
          ctx.lineWidth = 3;
          ctx.shadowColor = COLORS.CYAN;
          ctx.shadowBlur = 10;

          const w = 120 * startP.scale;
          const h = 40 * startP.scale;

          // Cross Bar
          ctx.beginPath();
          ctx.moveTo(startP.x - w / 2, startP.y);
          ctx.lineTo(startP.x - w / 2, startP.y - h);
          ctx.lineTo(startP.x + w / 2, startP.y - h);
          ctx.lineTo(startP.x + w / 2, startP.y);
          ctx.stroke();

          // Neon Stripes
          ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
          ctx.fillRect(startP.x - w / 2, startP.y - h, w, h / 2);

        } else if (obs.type === 'SCANNER') {
          const h = 180 * startP.scale;
          const w = 10 * startP.scale;
          // Emitter Base
          ctx.fillStyle = '#444';
          ctx.fillRect(startP.x - 70 * startP.scale, startP.y - h, w, h);
          ctx.fillRect(startP.x + 60 * startP.scale, startP.y - h, w, h);
          // Laser Beam
          ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(timeMs * 0.02) * 0.4})`;
          ctx.lineWidth = 4 * startP.scale;
          ctx.shadowColor = 'red';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.moveTo(startP.x - 70 * startP.scale, startP.y - h + (10 * startP.scale));
          ctx.lineTo(startP.x + 70 * startP.scale, startP.y - h + (10 * startP.scale));
          ctx.stroke();

        } else if (obs.type === 'RAMP') {
          const w = 100 * startP.scale;
          const h = 40 * startP.scale;
          ctx.fillStyle = '#ff00ff';
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(startP.x - w / 2, startP.y);
          ctx.lineTo(startP.x + w / 2, startP.y);
          ctx.lineTo(startP.x + w / 2, startP.y - h);
          ctx.lineTo(startP.x - w / 2, startP.y - h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Arrow on Ramp
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(startP.x, startP.y - h + 5);
          ctx.lineTo(startP.x - 10, startP.y - 10);
          ctx.lineTo(startP.x + 10, startP.y - 10);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    // Draw player
    ctx.save();
    const pProj = project(displayXRef.current, cssHeight + playerYRef.current, PLAYER_Z);
    ctx.translate(pProj.x, pProj.y);
    ctx.scale(pProj.scale, pProj.scale);

    const bob = Math.sin(timeMs * 0.001) * 5;

    // Player Glow
    ctx.shadowColor = COLORS.CYAN;
    ctx.shadowBlur = 20;

    // Player Trail (simple history effect could be added here, using just opacity for speed for now)

    if (isSlidingRef.current) {
      ctx.fillStyle = '#0a0a0a';
      ctx.strokeStyle = COLORS.CYAN;
      ctx.lineWidth = 3;
      ctx.fillRect(-50, -30, 100, 30);
      ctx.strokeRect(-50, -30, 100, 30);

      // Visor
      ctx.fillStyle = COLORS.MAGENTA;
      ctx.fillRect(-40, -25, 80, 5);

    } else {
      // Body
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-25, -135 + bob, 50, 60); // Chest
      ctx.fillRect(-20, -75 + bob, 40, 75); // Legs

      // Armor Detail
      ctx.strokeStyle = COLORS.CYAN;
      ctx.lineWidth = 2;
      ctx.strokeRect(-25, -135 + bob, 50, 60);

      // Head
      ctx.fillStyle = '#222';
      ctx.fillRect(-20, -170 + bob, 40, 35);
      ctx.strokeRect(-20, -170 + bob, 40, 35);

      // Visor Glow
      ctx.shadowColor = COLORS.MAGENTA;
      ctx.shadowBlur = 15;
      ctx.fillStyle = COLORS.MAGENTA;
      ctx.fillRect(-18, -160 + bob, 36, 10);
      ctx.shadowBlur = 0;

      // Core Reactor
      ctx.fillStyle = COLORS.CYAN;
      ctx.shadowColor = COLORS.CYAN;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -110 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
    }
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
