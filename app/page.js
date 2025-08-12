"use client";

import { useEffect, useRef, useState } from "react";

// Drop this file into: app/page.js (Next.js App Router)
export default function SnakeGame() {
  const CANVAS_SIZE = 500; // px
  const TILE = 25; // px per grid cell
  const COLS = CANVAS_SIZE / TILE;
  const ROWS = CANVAS_SIZE / TILE;

  const canvasRef = useRef(null);
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [dir, setDir] = useState({ x: 0, y: 0 }); // Start stationary
  const [food, setFood] = useState(randCell([{ x: 10, y: 10 }]));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(150); // ms per tick
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Load best score from local storage on initial render
  useEffect(() => {
    const savedBest = localStorage.getItem("snakeBestScore");
    if (savedBest) {
      setBest(parseInt(savedBest, 10));
    }
  }, []);

  function randCell(blocked = []) {
    const blockedKey = new Set(blocked.map((c) => `${c.x},${c.y}`));
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (blockedKey.has(`${x},${y}`));
    return { x, y };
  }

  // Handle keyboard input
  useEffect(() => {
    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === " " || k === "enter") {
        e.preventDefault();
        toggle();
      }
      if (k === "escape") return reset();
      // Directional controls
      if (k === "arrowup" || k === "w") return turn(0, -1);
      if (k === "arrowdown" || k === "s") return turn(0, 1);
      if (k === "arrowleft" || k === "a") return turn(-1, 0);
      if (k === "arrowright" || k === "d") return turn(1, 0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dir, running, gameOver]);

  // NEW: Starts the game from the initial screen
  function startGame() {
    setDir({ x: 1, y: 0 }); // Start moving to the right
    setRunning(true);
  }

  function turn(dx, dy) {
    // Prevent reversing into itself
    if (dir.x + dx === 0 && dir.y + dy === 0) return;
    setDir({ x: dx, y: dy });
  }

  function toggle() {
    if (gameOver) return reset();
    // Prevent pausing before the game has started
    if (dir.x === 0 && dir.y === 0) return;
    setRunning((r) => !r);
  }

  function reset() {
    setSnake([{ x: 10, y: 10 }]);
    setDir({ x: 0, y: 0 }); // Reset to stationary
    const f = randCell([{ x: 10, y: 10 }]);
    setFood(f);
    setScore(0);
    setGameOver(false);
    setRunning(false);
    setSpeed(150);
  }

  // Game loop
  useEffect(() => {
    if (!running || gameOver) return;

    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const next = { x: head.x + dir.x, y: head.y + dir.y };

        next.x = (next.x + COLS) % COLS;
        next.y = (next.y + ROWS) % ROWS;

        if (prev.some((c) => c.x === next.x && c.y === next.y)) {
          setGameOver(true);
          setRunning(false);
          const newBest = Math.max(best, score);
          setBest(newBest);
          localStorage.setItem("snakeBestScore", newBest);
          return prev;
        }

        const ate = next.x === food.x && next.y === food.y;
        const newSnake = [next, ...prev];
        if (!ate) {
          newSnake.pop();
        } else {
          setScore((s) => s + 1);
          setSpeed((sp) => Math.max(40, sp - 2));
          setFood(randCell(newSnake));
        }
        return newSnake;
      });
    }, speed);

    return () => clearInterval(id);
  }, [running, dir, speed, gameOver, food, score, best]);

  // Draw loop
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");

    ctx.fillStyle = "#010409";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    drawGlowCell(ctx, food.x, food.y, "#F43F5E", "#be123c");

    snake.forEach((seg, i) => {
      const isHead = i === 0;
      drawGlowCell(ctx, seg.x, seg.y, isHead ? "#06B6D4" : "#0284C7", isHead ? "#0891B2" : "#0369A1", isHead);
    });
  }, [snake, food]);

  function drawGlowCell(ctx, x, y, innerColor, outerColor, isHead = false) {
    const px = x * TILE;
    const py = y * TILE;
    const radius = TILE / 2;
    const glowRadius = isHead ? TILE * 1.5 : TILE;

    const grad = ctx.createRadialGradient(px + radius, py + radius, radius * 0.1, px + radius, py + radius, glowRadius * 0.7);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(1, "transparent");

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.fillRect(px - TILE, py - TILE, TILE * 3, TILE * 3);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(px + radius, py + radius, radius * 0.85, 0, 2 * Math.PI);
    ctx.fill();
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center bg-[#010409] font-sans text-slate-200 p-4 gap-8">

      {/* Left Panel: Info & Scores */}
      <div className="w-full md:w-60 flex flex-col items-center gap-6 order-2 md:order-1">
        <header className="w-full text-center p-4 rounded-lg bg-slate-900/50 ring-1 ring-slate-800">
          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-500 mb-4">
            SNAKE
          </h1>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <span className="text-sm opacity-60">SCORE</span>
              <strong className="block text-2xl font-medium tracking-wider">{score}</strong>
            </div>
            <div className="text-center">
              <span className="text-sm opacity-60">BEST</span>
              <strong className="block text-2xl font-medium tracking-wider">{Math.max(best, score)}</strong>
            </div>
          </div>
        </header>
        <footer className="text-center text-xs opacity-50 space-y-1">
          <p><strong>MOVE:</strong> WASD or Arrow Keys</p>
          <p><strong>PAUSE/PLAY:</strong> Spacebar</p>
        </footer>
      </div>

      {/* Center Panel: Game Canvas */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/10 ring-1 ring-slate-700 order-1 md:order-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="block w-full h-auto"
        />
        {/* UPDATED: Game Overlay Logic */}
        {(gameOver || (dir.x === 0 && dir.y === 0 && !running)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-10">
            {gameOver ? (
              <>
                <h2 className="font-bold text-4xl tracking-wider animate-pulse text-rose-500">
                  GAME OVER
                </h2>
                <p className="mt-2 text-sm opacity-70">
                  Press Enter or click Restart
                </p>
              </>
            ) : (
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-lg bg-cyan-600/70 hover:bg-cyan-500/90 text-cyan-100 font-bold text-xl ring-2 ring-cyan-500/50 transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
              >
                Start Game
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Controls */}
      <div className="w-full md:w-60 flex flex-col items-center gap-4 order-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="px-5 py-2 w-28 rounded-lg bg-cyan-600/50 hover:bg-cyan-500/70 text-cyan-100 font-semibold ring-1 ring-cyan-500/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={dir.x === 0 && dir.y === 0 && !gameOver}
          >
            {running ? "Pause" : gameOver ? "Restart" : "Play"}
          </button>
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold ring-1 ring-slate-600 transition-all active:scale-95"
          >
            Reset
          </button>
        </div>

        <div className="w-full p-4 rounded-lg bg-slate-900/50 ring-1 ring-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-60">SPEED</label>
            <input
              type="range"
              min="40"
              max="200"
              step="10"
              value={240 - speed}
              onChange={(e) => setSpeed(240 - parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button onClick={() => turn(0, -1)} className="p-3 rounded-lg bg-slate-800/70 aspect-square active:bg-cyan-500/50 text-xl font-bold transition-colors">↑</button>
            <div />
            <button onClick={() => turn(-1, 0)} className="p-3 rounded-lg bg-slate-800/70 aspect-square active:bg-cyan-500/50 text-xl font-bold transition-colors">←</button>
            <button onClick={() => turn(0, 1)} className="p-3 rounded-lg bg-slate-800/70 aspect-square active:bg-cyan-500/50 text-xl font-bold transition-colors">↓</button>
            <button onClick={() => turn(1, 0)} className="p-3 rounded-lg bg-slate-800/70 aspect-square active:bg-cyan-500/50 text-xl font-bold transition-colors">→</button>
          </div>
        </div>
      </div>

    </div>
  );
}