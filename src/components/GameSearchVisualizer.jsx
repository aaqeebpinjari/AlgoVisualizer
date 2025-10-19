// src/components/GameSearchVisualizer.jsx
import React, { useState, useEffect } from "react";
import "../styles/global-theme.css";

const GameSearchVisualizer = ({
  defaultAlgorithm = "minimax",
  autoLoadExample = false,
  boardSize = 3
}) => {
  const [algorithm, setAlgorithm] = useState(defaultAlgorithm);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [message, setMessage] = useState("Select an algorithm and run.");
  const [speedMs, setSpeedMs] = useState(500); // playback speed
  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 0;
  
  // keep algorithm in sync if parent changes defaultAlgorithm
  useEffect(() => { setAlgorithm(defaultAlgorithm); }, [defaultAlgorithm]);

  const copySteps = (arr) => arr.map((row) => Array.isArray(row) ? [...row] : row);

  // ================= Game Search Algorithms =================

  // Sample Tic-Tac-Toe board: 0=empty, 1=X, -1=O
  const sampleBoard = Array(boardSize * boardSize).fill(0);


  // auto-run on mount / when props that should trigger a new demo change
  useEffect(() => {
    if (autoLoadExample) {
      runAlgorithm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadExample, boardSize, algorithm]);

  // 1️⃣ Minimax
// Replace your current runMinimax with this:
const runMinimax = (board = sampleBoard) => {
  const stepsArr = [];
  const size = boardSize;

  // Build all winning lines for an NxN tic-tac-toe board
  const lines = [];
  for (let r = 0; r < size; r++) lines.push([...Array(size)].map((_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push([...Array(size)].map((_, r) => r * size + c));
  lines.push([...Array(size)].map((_, i) => i * size + i));                           // main diag
  lines.push([...Array(size)].map((_, i) => (i + 1) * size - (i + 1)));               // anti diag

  const winner = (b) => {
    for (const line of lines) {
      const sum = line.reduce((acc, idx) => acc + b[idx], 0);
      if (sum === size) return 1;     // X wins
      if (sum === -size) return -1;   // O wins
    }
    return 0; // no winner
  };

  const evalBoard = (b) => {
    const w = winner(b);
    if (w !== 0) return w * 10; // reward terminal results strongly
    // Simple heuristic: count open lines for X minus open lines for O
    let score = 0;
    for (const line of lines) {
      const vals = line.map(i => b[i]);
      if (!vals.includes(-1)) score += 1; // line open for X
      if (!vals.includes(1))  score -= 1; // line open for O
    }
    return score;
  };

  const empties = (b) => b.reduce((acc, v, i) => (v === 0 ? (acc.push(i), acc) : acc), []);
  const clone = (b) => [...b];

  stepsArr.push({ board: copySteps(board), message: "Running Minimax..." });

  // Depth-limited minimax to keep the viz snappy
  const minimax = (b, maximizing, depth = 0) => {
    const w = winner(b);
    const empty = empties(b);

    if (w !== 0 || empty.length === 0 || depth > 6) {
      const val = evalBoard(b);
      stepsArr.push({ board: copySteps(b), message: `Depth ${depth}: leaf score = ${val}` });
      return val;
    }

    if (maximizing) {
      let best = -Infinity;
      for (const idx of empty) {
        const nb = clone(b);
        nb[idx] = 1; // X
        stepsArr.push({ board: copySteps(nb), message: `Try X at ${idx} (depth ${depth})` });
        const val = minimax(nb, false, depth + 1);
        best = Math.max(best, val);
        stepsArr.push({ board: copySteps(nb), message: `Backtrack X at ${idx} → score ${val}` });
      }
      return best;
    } else {
      let best = Infinity;
      for (const idx of empty) {
        const nb = clone(b);
        nb[idx] = -1; // O
        stepsArr.push({ board: copySteps(nb), message: `Try O at ${idx} (depth ${depth})` });
        const val = minimax(nb, true, depth + 1);
        best = Math.min(best, val);
        stepsArr.push({ board: copySteps(nb), message: `Backtrack O at ${idx} → score ${val}` });
      }
      return best;
    }
  };

  minimax(board, true, 0);
  stepsArr.push({ board: copySteps(board), message: "Minimax complete." });
  return stepsArr;
};


  // 2️⃣ Alpha-Beta Pruning
// 2️⃣ Alpha-Beta Pruning (step-recording)
const runAlphaBeta = (board = sampleBoard) => {
  const stepsArr = [];
  const size = boardSize;

  // Build all winning lines for an NxN tic-tac-toe board (same as minimax)
  const lines = [];
  for (let r = 0; r < size; r++) lines.push([...Array(size)].map((_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push([...Array(size)].map((_, r) => r * size + c));
  lines.push([...Array(size)].map((_, i) => i * size + i));
  lines.push([...Array(size)].map((_, i) => (i + 1) * size - (i + 1)));

  const winner = (b) => {
    for (const line of lines) {
      const sum = line.reduce((acc, idx) => acc + b[idx], 0);
      if (sum === size) return 1;
      if (sum === -size) return -1;
    }
    return 0;
  };

  const evalBoard = (b) => {
    const w = winner(b);
    if (w !== 0) return w * 10;
    let score = 0;
    for (const line of lines) {
      const vals = line.map(i => b[i]);
      if (!vals.includes(-1)) score += 1;
      if (!vals.includes(1))  score -= 1;
    }
    return score;
  };

  const empties = (b) => b.reduce((acc, v, i) => (v === 0 ? (acc.push(i), acc) : acc), []);
  const clone = (b) => [...b];

  const push = (b, message, meta = {}) =>
    stepsArr.push({ board: copySteps(b), message, meta });

  push(board, "Running Alpha-Beta Pruning...", { alpha: -Infinity, beta: Infinity, depth: 0 });

  const alphabeta = (b, depth, alpha, beta, maximizing) => {
    const w = winner(b);
    const moves = empties(b);

    // Depth limit to keep things snappy
    if (w !== 0 || moves.length === 0 || depth > 6) {
      const val = evalBoard(b);
      push(b, `Depth ${depth}: leaf score = ${val}`, { alpha, beta, depth, leaf: true });
      return val;
    }

    if (maximizing) {
      let value = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        const idx = moves[i];
        const nb = clone(b);
        nb[idx] = 1; // X
        push(nb, `Try X at ${idx} (α=${fmt(alpha)}, β=${fmt(beta)}, d=${depth})`, { alpha, beta, depth, move: idx, player: 'X' });
        const child = alphabeta(nb, depth + 1, alpha, beta, false);
        value = Math.max(value, child);
        alpha = Math.max(alpha, value);
        push(nb, `Backtrack X at ${idx} → ${child} (α=${fmt(alpha)}, β=${fmt(beta)})`, { alpha, beta, depth, backtrack: true });

        if (beta <= alpha) {
          // prune remaining moves
          push(nb, `Prune remaining ${moves.length - i - 1} branches (β ≤ α)`, { alpha, beta, depth, pruned: true });
          break;
        }
      }
      return value;
    } else {
      let value = Infinity;
      for (let i = 0; i < moves.length; i++) {
        const idx = moves[i];
        const nb = clone(b);
        nb[idx] = -1; // O
        push(nb, `Try O at ${idx} (α=${fmt(alpha)}, β=${fmt(beta)}, d=${depth})`, { alpha, beta, depth, move: idx, player: 'O' });
        const child = alphabeta(nb, depth + 1, alpha, beta, true);
        value = Math.min(value, child);
        beta = Math.min(beta, value);
        push(nb, `Backtrack O at ${idx} → ${child} (α=${fmt(alpha)}, β=${fmt(beta)})`, { alpha, beta, depth, backtrack: true });

        if (beta <= alpha) {
          push(nb, `Prune remaining ${moves.length - i - 1} branches (β ≤ α)`, { alpha, beta, depth, pruned: true });
          break;
        }
      }
      return value;
    }
  };

  const fmt = (v) => (v === Infinity ? "+∞" : v === -Infinity ? "−∞" : v);

  alphabeta(board, 0, -Infinity, Infinity, true);
  push(board, "Alpha-Beta Pruning complete.", { done: true });
  return stepsArr;
};


  // 3️⃣ Expectimax
// 3️⃣ Expectimax (Max player X; opponent is a chance node that picks uniformly at random)
const runExpectimax = (board = sampleBoard) => {
  const stepsArr = [];
  const size = boardSize;

  // Build win lines (same as minimax)
  const lines = [];
  for (let r = 0; r < size; r++) lines.push([...Array(size)].map((_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push([...Array(size)].map((_, r) => r * size + c));
  lines.push([...Array(size)].map((_, i) => i * size + i));
  lines.push([...Array(size)].map((_, i) => (i + 1) * size - (i + 1)));

  const winner = (b) => {
    for (const line of lines) {
      const sum = line.reduce((acc, idx) => acc + b[idx], 0);
      if (sum === size) return 1;     // X wins
      if (sum === -size) return -1;   // O wins
    }
    return 0;
  };

  const evalBoard = (b) => {
    const w = winner(b);
    if (w !== 0) return w * 10; // terminal bias
    // simple heuristic: open lines X minus open lines O
    let score = 0;
    for (const line of lines) {
      const vals = line.map(i => b[i]);
      if (!vals.includes(-1)) score += 1;
      if (!vals.includes(1))  score -= 1;
    }
    return score;
  };

  const empties = (b) => b.reduce((acc, v, i) => (v === 0 ? (acc.push(i), acc) : acc), []);
  const clone = (b) => [...b];
  const push = (b, message, meta = {}) => stepsArr.push({ board: copySteps(b), message, meta });

  // Depth limit to keep viz tidy
  const MAX_DEPTH = 6;

  push(board, "Running Expectimax (X = Max, O = Chance)…", { depth: 0, node: "max" });

  // node: "max" | "chance"
  const expectimax = (b, depth, node) => {
    const w = winner(b);
    const moves = empties(b);

    // leaf / cutoff
    if (w !== 0 || moves.length === 0 || depth > MAX_DEPTH) {
      const val = evalBoard(b);
      push(b, `Depth ${depth}: leaf score = ${val}`, { depth, node, leaf: true, value: val });
      return val;
    }

    if (node === "max") {
      // Max chooses the move with highest expected value
      let best = -Infinity;
      let bestIdx = -1;
      for (const idx of moves) {
        const nb = clone(b);
        nb[idx] = 1; // X
        push(nb, `Max: try X at ${idx} (d=${depth})`, { depth, node: "max", move: idx });
        const val = expectimax(nb, depth + 1, "chance");
        push(nb, `Backtrack from X at ${idx} → expected ${val}`, { depth, node: "max", move: idx, backtrack: true, value: val });
        if (val > best) { best = val; bestIdx = idx; }
      }
      // Annotate best move at this Max node (for clarity)
      push(b, `Max picks best expected = ${best} (d=${depth})`, { depth, node: "max", best: bestIdx, value: best });
      return best;
    } else {
      // Chance node: opponent O picks uniformly among all moves
      let expected = 0;
      const p = 1 / moves.length;
      for (const idx of moves) {
        const nb = clone(b);
        nb[idx] = -1; // O
        push(nb, `Chance: branch O at ${idx} with p=${p.toFixed(2)} (d=${depth})`, { depth, node: "chance", move: idx, p });
        const val = expectimax(nb, depth + 1, "max");
        expected += p * val;
        push(nb, `Chance: contribution p*val = ${(p * val).toFixed(2)}`, { depth, node: "chance", move: idx, p, value: val });
      }
      push(b, `Chance: expected value = ${expected.toFixed(2)} (d=${depth})`, { depth, node: "chance", value: expected });
      return expected;
    }
  };

  expectimax(board, 0, "max");
  push(board, "Expectimax complete.", { done: true });
  return stepsArr;
};


  // 4️⃣ Monte Carlo Tree Search
// 4️⃣ Monte Carlo Tree Search
const runMCTS = (board = sampleBoard) => {
  const stepsArr = [];
  const size = boardSize;

  // ----- Helpers (same patterns as Minimax/Expectimax) -----
  const lines = [];
  for (let r = 0; r < size; r++) lines.push([...Array(size)].map((_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push([...Array(size)].map((_, r) => r * size + c));
  lines.push([...Array(size)].map((_, i) => i * size + i));
  lines.push([...Array(size)].map((_, i) => (i + 1) * size - (i + 1)));

  const winner = (b) => {
    for (const line of lines) {
      const sum = line.reduce((acc, idx) => acc + b[idx], 0);
      if (sum === size) return 1;     // X (max)
      if (sum === -size) return -1;   // O (min)
    }
    return 0;
  };
  const empties = (b) => b.reduce((acc, v, i) => (v === 0 ? (acc.push(i), acc) : acc), []);
  const isTerminal = (b) => winner(b) !== 0 || empties(b).length === 0;
  const clone = (b) => [...b];

  // Quick playout heuristic for non-terminal cutoffs
  const evalBoard = (b) => {
    const w = winner(b);
    if (w !== 0) return w; // +1 X win, -1 O win
    // Tie: mild heuristic — open lines X minus open lines O
    let score = 0;
    for (const line of lines) {
      const vals = line.map(i => b[i]);
      if (!vals.includes(-1)) score += 0.1;
      if (!vals.includes(1))  score -= 0.1;
    }
    // Clamp to [-0.9,0.9] so it doesn't dominate wins/losses
    return Math.max(-0.9, Math.min(0.9, score));
  };

  const push = (b, message, meta = {}) =>
    stepsArr.push({ board: copySteps(b), message, meta });

  // ----- Node structure -----
  class Node {
    constructor(state, player, parent = null, move = null) {
      this.state = state;      // board array
      this.player = player;    // player to move at this node: 1 (X) or -1 (O)
      this.parent = parent;
      this.move = move;        // move that led to this node (index)
      this.children = [];
      this.untriedMoves = empties(state);
      this.N = 0;              // visit count
      this.W = 0;              // total reward from X's perspective
    }
    get Q() { return this.N === 0 ? 0 : this.W / this.N; }
  }

  const rootPlayer = 1; // Assume we plan for X at root
  const root = new Node(board, rootPlayer, null, null);

  // UCB1 (UCT) — exploration constant
  const C = Math.SQRT2;

  const uct = (child) => {
    if (child.N === 0) return Infinity;
    return child.Q + C * Math.sqrt(Math.log(child.parent.N + 1) / child.N);
  };

  const selectChild = (node) => {
    // Select the child with max UCT; push a selection step for visualization
    let best = null, bestScore = -Infinity;
    for (const ch of node.children) {
      const score = uct(ch);
      if (score > bestScore) { best = ch; bestScore = score; }
    }
    const m = best?.move;
    if (m !== undefined) {
      const nb = best.state;
      push(nb, `Selection: choose move ${m} (UCT = ${bestScore === Infinity ? "∞" : bestScore.toFixed(3)}; Q=${best.Q.toFixed(3)}, N=${best.N})`,
        { phase: "selection", move: m, N: best.N, Q: best.Q });
    }
    return best;
  };

  const expand = (node) => {
    if (node.untriedMoves.length === 0) return node;
    const idx = node.untriedMoves.splice(Math.floor(Math.random() * node.untriedMoves.length), 1)[0];
    const next = clone(node.state);
    next[idx] = node.player;               // apply current player's move
    const child = new Node(next, -node.player, node, idx);
    node.children.push(child);
    push(child.state, `Expansion: add move ${idx} → new node (N=0, Q=0)`,
      { phase: "expansion", move: idx, N: 0, Q: 0 });
    return child;
  };

  const rollout = (node, maxDepth = 10) => {
    // Simulate randomly (ε-greedy-ish random)
    let s = clone(node.state);
    let p = node.player;
    let d = 0;
    while (!isTerminal(s) && d < maxDepth) {
      const moves = empties(s);
      const choice = moves[Math.floor(Math.random() * moves.length)];
      s[choice] = p;
      d++;
      p = -p;
    }
    // Reward from X's perspective
    const w = winner(s);
    if (w !== 0) return w;        // +1 X win, -1 O win
    return evalBoard(s);          // draw/heuristic
  };

  const backprop = (node, reward) => {
    // Reward is always from X's perspective
    let cur = node;
    while (cur) {
      cur.N += 1;
      cur.W += reward;
      push(cur.state, `Backprop: update node (N=${cur.N}, W=${cur.W.toFixed(2)}, Q=${cur.Q.toFixed(3)})`,
        { phase: "backprop", N: cur.N, W: cur.W, Q: cur.Q, move: cur.move });
      cur = cur.parent;
    }
  };

  // ----- Run iterations -----
  push(board, "Running MCTS…", { phase: "start" });

  const ITERATIONS = 50;   // keep viz reasonable
  for (let it = 1; it <= ITERATIONS; it++) {
    // Selection
    let node = root;
    while (node.untriedMoves.length === 0 && node.children.length > 0 && !isTerminal(node.state)) {
      node = selectChild(node);
    }

    // Expansion
    if (!isTerminal(node.state) && node.untriedMoves.length > 0) {
      node = expand(node);
    }

    // Simulation
    const reward = rollout(node, 10);
    push(node.state, `Simulation: reward = ${Number.isInteger(reward) ? reward : reward.toFixed(2)} (from X perspective)`,
      { phase: "simulation", reward });

    // Backpropagation
    backprop(node, reward);

    // Optional progress pulse
    push(root.state, `Iteration ${it}/${ITERATIONS} complete`, { phase: "iter", iter: it });
  }

  // One final summary step
  // Choose root child with highest visit count (standard MCTS action)
  let bestChild = null, bestN = -1;
  for (const ch of root.children) {
    if (ch.N > bestN) { bestN = ch.N; bestChild = ch; }
  }
  if (bestChild) {
    push(bestChild.state,
      `MCTS complete: pick move ${bestChild.move} (N=${bestChild.N}, Q=${bestChild.Q.toFixed(3)})`,
      { phase: "done", bestMove: bestChild.move, N: bestChild.N, Q: bestChild.Q });
  } else {
    push(board, "MCTS complete: no expansion occurred (terminal or no moves).", { phase: "done" });
  }

  return stepsArr;
};

  // ================= Animation =================
  const runAlgorithm = () => {
    let generatedSteps = [];
    switch (algorithm) {
      case "minimax": generatedSteps = runMinimax(); break;
      case "alphaBetaPruning": generatedSteps = runAlphaBeta(); break;
      case "expectimax": generatedSteps = runExpectimax(); break;
      case "mcts": generatedSteps = runMCTS(); break;
      default: setMessage("Algorithm not implemented!"); return;
    }
    if (generatedSteps.length === 0) { setMessage("No steps generated."); return; }
    setSteps(generatedSteps);
    setCurrentStep(0);
    setIsVisualizing(true);
  };

   useEffect(() => {
      if (!isVisualizing || steps.length === 0) return;
    // Stop on the LAST valid index (no extra tick past the end)
      if (currentStep >= steps.length - 1) {
          setIsVisualizing(false);
          setMessage("Visualization complete!");
          return;
        }
        const timer = setTimeout(() => setCurrentStep(prev => prev + 1), speedMs);
        return () => clearTimeout(timer);
      }, [currentStep, isVisualizing, steps, speedMs]);

  const prevStep = () => setCurrentStep(prev => Math.max(prev-1,0));
  const nextStep = () => setCurrentStep(prev => Math.min(prev+1,steps.length-1));
  const resetVisualizer = () => { setSteps([]); setCurrentStep(0); setIsVisualizing(false); setMessage("Select an algorithm and run."); };

   const togglePlayPause = () => {
      if (!steps.length) return;
        setIsVisualizing(v => !v);
      };
    
      // identify moved index for highlight
      const getChangedIndex = () => {
        if (currentStep === 0 || !steps[currentStep] || !steps[currentStep-1]) return -1;
        const a = steps[currentStep-1].board || [];
        const b = steps[currentStep].board || [];
        for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return i;
        return -1;
      };
     const changedIndex = getChangedIndex();


  const meta = steps[currentStep]?.meta;

  {meta && (
    <div className="ab-hud">
      {meta.phase && <span>phase: <strong>{meta.phase}</strong></span>}
      {meta.iter && <span>iter: <strong>{meta.iter}</strong></span>}
      {meta.N !== undefined && <span>N: <strong>{meta.N}</strong></span>}
      {meta.Q !== undefined && <span>Q: <strong>{typeof meta.Q === "number" ? meta.Q.toFixed(3) : meta.Q}</strong></span>}
      {meta.reward !== undefined && <span>reward: <strong>{Number.isInteger(meta.reward) ? meta.reward : meta.reward.toFixed(2)}</strong></span>}
    </div>
  )}

  const renderBoard = () => {
    if (!steps[currentStep]) return null;
    const stepBoard = steps[currentStep].board;

      // 1D NxN board → grid of cells with X/O symbols
        if (Array.isArray(stepBoard) && stepBoard.length && typeof stepBoard[0] === 'number') {
          const symbol = (v) => v === 1 ? "X" : v === -1 ? "O" : "";
          return (
            <div
              className="ttt-grid"
              style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
            >
              {stepBoard.map((v, i) => (
                <div
                  key={i}
                  className={`ttt-cell ${i === changedIndex ? "cell-changed" : ""} ${v === 1 ? "cell-x" : v === -1 ? "cell-o" : ""}`}
                >
                  {symbol(v)}
                </div>
              ))}
            </div>
          );
        }

    if (Array.isArray(stepBoard) && stepBoard.length && typeof stepBoard[0]==='object') {
      return (
        <div className="board">
          {stepBoard.map((item,i)=>(
            <div key={i} className="board-row">
              {Object.entries(item).map(([k,v],j)=>(
                <div key={j} className="cell">{`${k}:${v}`}</div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return <pre>{JSON.stringify(stepBoard,null,2)}</pre>;
  };

  return (
    <div className="game-search-visualizer">
      <h2>Game Search Algorithm Visualizer</h2>
      <div className="controls">
        <label>Algorithm:</label>
        <select value={algorithm} onChange={(e)=>setAlgorithm(e.target.value)} disabled={isVisualizing}>
          <option value="minimax">Minimax</option>
          <option value="alphaBetaPruning">Alpha-Beta Pruning</option>
          <option value="expectimax">Expectimax</option>
          <option value="mcts">Monte Carlo Tree Search</option>
        </select>
        <button className="btn-primary" onClick={runAlgorithm} disabled={isVisualizing}>Run</button>
        <button onClick={togglePlayPause} disabled={!steps.length}>{isVisualizing ? "Pause" : "Play"}</button>
        <button onClick={prevStep} disabled={currentStep===0}>Prev</button>
        <button onClick={nextStep} disabled={currentStep===steps.length-1}>Next</button>
        <button onClick={resetVisualizer} disabled={isVisualizing}>Reset</button>
     </div>
     
     <div className="controls secondary">
        <label htmlFor="speed">Speed:</label>
        <input
          id="speed"
          type="range"
          min="100"
          max="1500"
          step="50"
          value={speedMs}
          onChange={(e)=>setSpeedMs(Number(e.target.value))}
          title={`${speedMs} ms`}
        />
        <span className="muted">{speedMs} ms</span>
        <span className="muted">Step {totalSteps ? currentStep + 1 : 0} / {totalSteps || 0}</span>
       </div>
 
      <div className="progressbar">
        <div className="progress" style={{ width: `${progress}%` }} />
      </div>

      {renderBoard()}

      <p className="message-bar">{steps[currentStep]?.message || message}</p>
    </div>
  );
};

export default GameSearchVisualizer;
