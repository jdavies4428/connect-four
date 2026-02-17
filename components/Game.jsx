"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ROWS, COLS, EMPTY, P1, P2, createBoard, getDropRow, checkWin, genPlayerId } from "@/lib/game";
import { getAiMove } from "@/lib/ai";
import { roomApi } from "@/lib/api-client";
import { sounds } from "@/lib/sounds";
import Confetti from "./Confetti";

const POLL_MS = 700;
const DIFF = { easy: "ROOKIE", medium: "STANDARD", hard: "BRUTAL" };
const DIFF_COLOR = { easy: "#7bed9f", medium: "#70a1ff", hard: "#ff6b81" };
const DIFF_DESC = { easy: "Goes easy on you", medium: "Puts up a fight", hard: "Good luck" };

export default function Game({ initialCode = "" }) {
  // Core state
  const [screen, setScreen] = useState("lobby");
  const [mode, setMode] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [playerId] = useState(() => genPlayerId());
  const [playerNum, setPlayerNum] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");

  // Game state
  const [board, setBoard] = useState(createBoard);
  const [currentPlayer, setCurrentPlayer] = useState(P1);
  const [winner, setWinner] = useState(null);
  const [winCells, setWinCells] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [scores, setScores] = useState({ p1: 0, p2: 0, draws: 0 });
  const [lastWinner, setLastWinner] = useState(null);
  const [gameNumber, setGameNumber] = useState(0);
  const [rematch, setRematch] = useState({ p1: false, p2: false });

  // UI state
  const [hoverCol, setHoverCol] = useState(-1);
  const [animatingDrop, setAnimatingDrop] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [error, setError] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("muted") === "1"
  );

  const pollRef = useRef(null);
  const aiRef = useRef(null);
  const workerRef = useRef(null);
  const touchedRef = useRef(false);

  const isMyTurn = mode === "ai"
    ? currentPlayer === P1 && !winner
    : playerNum === currentPlayer && !winner;

  const myColor = mode === "ai" ? P1 : playerNum;
  const p1Name = mode === "ai" ? playerName : (playerNum === P1 ? playerName : opponentName) || "P1";
  const p2Name = mode === "ai" ? opponentName : (playerNum === P2 ? playerName : opponentName) || "P2";
  const winnerIsMe = mode === "ai" ? winner === P1 : winner === playerNum;
  const winnerName = winner === P1 ? p1Name : winner === P2 ? p2Name : null;

  // ── Audio init ──
  const initAudio = useCallback(async () => {
    if (!audioReady) { await sounds.init(); setAudioReady(true); }
  }, [audioReady]);

  // ── Reset local state ──
  const resetLocal = (gn, starter) => {
    setBoard(createBoard());
    setCurrentPlayer(starter || P1);
    setWinner(null);
    setWinCells([]);
    setMoveCount(0);
    setRematch({ p1: false, p2: false });
    setShowConfetti(false);
    setAnimatingDrop(null);
    setAiThinking(false);
    if (gn !== undefined) setGameNumber(gn);
  };

  const goToLobby = () => {
    clearTimeout(aiRef.current);
    clearInterval(pollRef.current);
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    setScreen("lobby"); setMode(null); setWinner(null); setShowConfetti(false);
    setError(""); setJoinInput(""); setAiThinking(false); setLoading(false);
    setPlayerName(""); setOpponentName(""); setScores({ p1: 0, p2: 0, draws: 0 });
    setNameInput(""); setLastWinner(null); setHoverCol(-1);
  };

  // ── Create room → name entry ──
  const startCreate = async () => {
    await initAudio();
    setMode("online"); setPlayerNum(P1); setNameInput(""); setScreen("nameEntry");
  };

  const confirmCreate = async () => {
    const name = nameInput.trim() || "PLAYER 1";
    setPlayerName(name);
    setLoading(true);
    try {
      const room = await roomApi.create(playerId, name);
      setRoomCode(room.roomCode);
      setScores({ p1: 0, p2: 0, draws: 0 });
      resetLocal(0);
      setScreen("waiting");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // ── Join room → name entry ──
  const startJoin = async () => {
    await initAudio();
    const code = joinInput.toUpperCase().trim();
    if (code.length !== 4) { setError("Enter a 4-letter code"); return; }
    setLoading(true);
    try {
      const room = await roomApi.poll(code);
      if (room.player2 && room.player2 !== playerId) {
        setError("Room is full"); setLoading(false); return;
      }
      setRoomCode(code);
      setOpponentName(room.player1Name || "PLAYER 1");
      setMode("online"); setPlayerNum(P2); setNameInput(""); setScreen("nameEntry");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const confirmJoin = async () => {
    const name = nameInput.trim() || "PLAYER 2";
    setPlayerName(name);
    setLoading(true);
    try {
      const room = await roomApi.join(roomCode, playerId, name);
      setBoard(room.board); setCurrentPlayer(room.currentPlayer);
      setWinner(room.winner); setWinCells(room.winCells || []);
      setMoveCount(room.moveCount || 0); setGameNumber(room.gameNumber || 0);
      setScores(room.scores || { p1: 0, p2: 0, draws: 0 });
      setScreen("playing");
    } catch (e) {
      setError(e.message);
      setScreen("lobby");
    }
    setLoading(false);
  };

  // ── Start AI game ──
  const startAi = async (diff) => {
    await initAudio();
    const prevScores = scores.p1 + scores.p2 + scores.draws > 0 ? { ...scores } : { p1: 0, p2: 0, draws: 0 };
    const prevLW = lastWinner;
    setDifficulty(diff); setMode("ai"); setPlayerNum(P1);
    setPlayerName(playerName || "YOU"); setOpponentName(`CPU ${DIFF[diff]}`);
    resetLocal(undefined, prevLW || P1);
    setScores(prevScores); setLastWinner(prevLW);
    setScreen("playing");
  };

  const startAiFresh = (diff) => {
    setScores({ p1: 0, p2: 0, draws: 0 }); setLastWinner(null);
    setPlayerName("YOU"); setOpponentName(`CPU ${DIFF[diff]}`);
    setDifficulty(diff); setMode("ai"); setPlayerNum(P1);
    resetLocal(undefined, P1);
    setScreen("playing");
  };

  // ── Online polling ──
  useEffect(() => {
    if (mode !== "online") return;
    if (!["waiting", "playing", "gameOver"].includes(screen)) return;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const room = await roomApi.poll(roomCode);
        if (!active) return;

        if (playerNum === P1 && room.player2Name && !opponentName) setOpponentName(room.player2Name);
        if (room.scores) setScores(room.scores);

        if (screen === "waiting" && room.player2) {
          setOpponentName(room.player2Name || "PLAYER 2");
          setScreen("playing"); sounds.turn();
        }

        if (room.board) {
          const remoteGN = room.gameNumber || 0;
          if (remoteGN > gameNumber) {
            resetLocal(remoteGN, room.currentPlayer);
            if (room.scores) setScores(room.scores);
            setScreen("playing"); sounds.turn();
            return;
          }

          if (room.moveCount > moveCount && room.lastMove) {
            const lm = room.lastMove;
            setAnimatingDrop({ row: lm.row, col: lm.col, player: lm.player });
            setTimeout(() => { setAnimatingDrop(null); sounds.land(); }, 400);
          }

          setBoard(room.board); setCurrentPlayer(room.currentPlayer);
          setMoveCount(room.moveCount || 0);

          if (room.winner && !winner) {
            setWinner(room.winner); setWinCells(room.winCells || []);
            if (room.winner !== -1) setLastWinner(room.winner);
            if (room.winner === playerNum) {
              sounds.win(); setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 4000);
            } else if (room.winner !== -1) sounds.lose();
            setScreen("gameOver");
          }
          setRematch(room.rematch || { p1: false, p2: false });
        }
      } catch {}
    };

    pollRef.current = setInterval(poll, POLL_MS);
    poll();
    return () => { active = false; clearInterval(pollRef.current); };
  }, [screen, roomCode, moveCount, winner, playerNum, mode, gameNumber, opponentName]);

  // Sync mute state to sounds module + localStorage
  useEffect(() => {
    sounds.setMuted(muted);
    localStorage.setItem("muted", muted ? "1" : "0");
  }, [muted]);

  // Pre-fill join input when arriving via a share link (/room/CODE)
  useEffect(() => {
    if (initialCode) setJoinInput(initialCode.toUpperCase().slice(0, 4));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI move ──
  useEffect(() => {
    if (mode !== "ai" || currentPlayer !== P2 || winner || aiThinking) return;
    setAiThinking(true);

    let done = false;

    // Shared logic: apply whatever column was chosen
    const applyCol = (col) => {
      if (done) return;
      done = true;
      const row = col >= 0 ? getDropRow(board, col) : -1;
      if (col < 0 || row < 0) { setAiThinking(false); return; }
      aiRef.current = setTimeout(() => {
        sounds.drop();
        const nb = board.map(r => [...r]);
        nb[row][col] = P2;
        const mc = moveCount + 1;
        setAnimatingDrop({ row, col, player: P2 });
        setTimeout(() => { setAnimatingDrop(null); sounds.land(); }, 350);
        const wr = checkWin(nb, row, col);
        const w = wr ? P2 : mc >= 42 ? -1 : null;
        setBoard(nb); setCurrentPlayer(P1); setMoveCount(mc); setAiThinking(false);
        if (w) {
          setWinner(w); setWinCells(wr || []);
          if (w !== -1) setLastWinner(w);
          setScores(prev => ({
            p1: prev.p1,
            p2: w === P2 ? prev.p2 + 1 : prev.p2,
            draws: w === -1 ? prev.draws + 1 : prev.draws,
          }));
          w === -1 ? sounds.turn() : sounds.lose();
          setScreen("gameOver");
        }
      }, 200);
    };

    // Sync fallback — always works, short deadline keeps it fast enough
    const syncFallback = () => {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => {
        try { applyCol(getAiMove(board, difficulty)); }
        catch { if (!done) { done = true; setAiThinking(false); } }
      }));
      return id;
    };

    // Try Worker first (non-blocking); if it fails or goes silent, sync saves us
    let worker = null;
    let rafId = null;
    let watchdog = null;

    try {
      worker = new Worker("/ai-worker.js");
      workerRef.current = worker;
      worker.onmessage = (e) => { worker.terminate(); workerRef.current = null; applyCol(e.data.col); };
      worker.onerror  = ()  => { worker.terminate(); workerRef.current = null; if (!done) rafId = syncFallback(); };
      worker.postMessage({ board, difficulty });
      // If worker goes silent (stale/suspended on mobile), sync kicks in after 800ms
      watchdog = setTimeout(() => {
        if (done) return;
        worker.onmessage = null; worker.terminate(); workerRef.current = null;
        rafId = syncFallback();
      }, 800);
    } catch {
      rafId = syncFallback();
    }

    return () => {
      done = true;
      clearTimeout(watchdog); clearTimeout(aiRef.current);
      if (rafId) cancelAnimationFrame(rafId);
      if (worker) { worker.onmessage = null; worker.terminate(); workerRef.current = null; }
    };
  }, [mode, currentPlayer, winner, board, difficulty, moveCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Human move ──
  const makeMove = async (col) => {
    if (!isMyTurn || animatingDrop || aiThinking) return;
    await initAudio();
    const row = getDropRow(board, col);
    if (row === -1) return;

    // Haptic
    if (navigator.vibrate) navigator.vibrate(10);

    sounds.drop();
    const player = mode === "ai" ? P1 : playerNum;
    const nb = board.map(r => [...r]);
    nb[row][col] = player;
    const mc = moveCount + 1;
    const next = currentPlayer === P1 ? P2 : P1;

    setAnimatingDrop({ row, col, player });
    setTimeout(() => { setAnimatingDrop(null); sounds.land(); }, 350);

    const wr = checkWin(nb, row, col);
    const w = wr ? player : mc >= 42 ? -1 : null;

    setBoard(nb); setCurrentPlayer(next); setMoveCount(mc);

    if (w) {
      setWinner(w); setWinCells(wr || []);
      if (w !== -1) setLastWinner(w);
      const ns = { ...scores };
      if (w === P1) ns.p1++; else if (w === P2) ns.p2++; else ns.draws++;
      setScores(ns);
      if (w === player) { sounds.win(); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }
      else if (w === -1) sounds.turn();
      setScreen("gameOver");
    }

    if (mode === "online") {
      try { await roomApi.move(roomCode, playerId, col); } catch {}
    }
  };

  // ── Rematch ──
  const requestRematch = async () => {
    if (mode === "ai") {
      const s = { ...scores }; const lw = lastWinner;
      resetLocal(undefined, lw || P1);
      setScores(s); setLastWinner(lw);
      setScreen("playing");
      return;
    }
    try {
      const room = await roomApi.rematch(roomCode, playerId);
      if (room.rematch.p1 && room.rematch.p2) {
        // Both agreed
        resetLocal(room.gameNumber, room.currentPlayer);
        setScores(room.scores || scores);
        setScreen("playing");
      } else {
        setRematch(room.rematch);
      }
    } catch {}
  };

  // ── Helpers ──
  const isWinCell = (r, c) => winCells.some(([wr, wc]) => wr === r && wc === c);
  const previewRow = hoverCol >= 0 && isMyTurn && !aiThinking ? getDropRow(board, hoverCol) : -1;
  const myRematchSent = playerNum === P1 ? rematch.p1 : rematch.p2;

  // ── Render ──
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center font-pixel text-[#e0e0ff] overflow-hidden safe-bottom"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #121230 50%, #0d0d25 100%)" }}
      onClick={initAudio}>

      <div className="scanlines" />
      {showConfetti && <Confetti />}

      {/* Mute toggle */}
      <button
        className="absolute top-3 right-3 font-pixel text-[10px] border px-2 py-1.5 transition-all duration-150"
        style={{ color: muted ? "#2a2a2a" : "#555", borderColor: muted ? "#1a1a1a" : "#333" }}
        onClick={(e) => { e.stopPropagation(); setMutedState(m => !m); }}
      >
        {muted ? "MUTE" : "SFX"}
      </button>

      {/* Title */}
      <h1 className="text-xl sm:text-3xl font-bold mb-0.5 animate-shimmer bg-clip-text text-transparent"
        style={{ backgroundImage: "linear-gradient(90deg, #ff4757, #ffd32a, #ff4757)", backgroundSize: "200% auto" }}>
        CONNECT FOUR
      </h1>
      <div className="text-[9px] text-[#555] tracking-[4px] mb-5">MULTIPLAYER ARCADE</div>

      {/* ── LOBBY ── */}
      {screen === "lobby" && (
        <div className="flex flex-col items-center gap-5 animate-slideUp">
          <button className="btn w-56 text-[#eccc68] border-[#eccc68]"
            onClick={() => setScreen("difficulty")}>VS COMPUTER</button>

          <div className="text-[10px] text-[#333] tracking-[4px]">— ONLINE —</div>

          <button className="btn w-56 text-[#7bed9f] border-[#7bed9f]"
            onClick={startCreate}>CREATE ROOM</button>

          <div className="flex flex-col items-center gap-3">
            <input className="input-code" value={joinInput}
              onChange={e => { setJoinInput(e.target.value.slice(0, 4)); setError(""); }}
              placeholder="CODE" maxLength={4} />
            <button className="btn w-56 text-[#70a1ff] border-[#70a1ff]"
              onClick={startJoin} disabled={loading}>
              {loading ? "..." : "JOIN ROOM"}
            </button>
          </div>
          {error && <div className="text-[#ff4757] text-xs">{error}</div>}
        </div>
      )}

      {/* ── DIFFICULTY ── */}
      {screen === "difficulty" && (
        <div className="flex flex-col items-center gap-4 animate-slideUp">
          <div className="text-sm text-[#888] mb-1">SELECT DIFFICULTY</div>
          {["easy", "medium", "hard"].map(d => (
            <button key={d} className="btn w-56 text-center" onClick={() => startAiFresh(d)}
              style={{ color: DIFF_COLOR[d], borderColor: DIFF_COLOR[d] }}>
              {DIFF[d]}
              <div className="text-[9px] mt-1 opacity-60 tracking-normal">{DIFF_DESC[d]}</div>
            </button>
          ))}
          <button className="btn btn-sm text-[#555] border-[#333] mt-2" onClick={goToLobby}>BACK</button>
        </div>
      )}

      {/* ── NAME ENTRY ── */}
      {screen === "nameEntry" && (
        <div className="flex flex-col items-center gap-5 animate-slideUp">
          <div className="text-sm text-[#888]">ENTER YOUR NAME</div>
          {playerNum === P2 && opponentName && (
            <div className="text-[11px] text-[#555]">VS <span className="text-[#ff4757]">{opponentName}</span></div>
          )}
          <input className="input-name" value={nameInput}
            onChange={e => setNameInput(e.target.value.slice(0, 12))}
            placeholder={playerNum === P1 ? "PLAYER 1" : "PLAYER 2"}
            maxLength={12} autoFocus
            onKeyDown={e => { if (e.key === "Enter") playerNum === P1 ? confirmCreate() : confirmJoin(); }} />
          <button className="btn text-[#eccc68] border-[#eccc68]" disabled={loading}
            onClick={playerNum === P1 ? confirmCreate : confirmJoin}>
            {loading ? "..." : playerNum === P1 ? "CREATE" : "JOIN"}
          </button>
          <button className="btn btn-sm text-[#555] border-[#333]" onClick={goToLobby}>BACK</button>
          {error && <div className="text-[#ff4757] text-xs">{error}</div>}
        </div>
      )}

      {/* ── WAITING ── */}
      {screen === "waiting" && (
        <div className="flex flex-col items-center gap-5 animate-slideUp">
          <div className="text-[11px] text-[#666]">WELCOME, <span className="text-[#ff4757]">{playerName}</span></div>
          <div className="text-sm text-[#aaa]">ROOM CODE</div>
          <div className="text-4xl font-bold tracking-[12px] text-[#7bed9f]"
            style={{ textShadow: "0 0 20px rgba(123,237,159,0.4)" }}>{roomCode}</div>
          <button
            className="btn btn-sm border-[#7bed9f] text-[#7bed9f]"
            style={{ minWidth: 160, transition: "all 0.15s" }}
            onClick={async () => {
              const url = `${window.location.origin}/room/${roomCode}`;
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? "✓ LINK COPIED!" : "SHARE LINK"}
          </button>
          <div className="text-xs text-[#666] animate-glow">WAITING FOR OPPONENT...</div>
          <button className="btn btn-sm text-[#666] border-[#333] mt-1" onClick={goToLobby}>BACK</button>
        </div>
      )}

      {/* ── PLAYING / GAME OVER ── */}
      {(screen === "playing" || screen === "gameOver") && (
        <div className="flex flex-col items-center gap-3 animate-boardEntry">

          {/* Status */}
          <div className="text-xs sm:text-sm px-5 py-2 rounded text-center min-w-[200px] transition-all"
            style={{
              background: winner ? "#1a1a2e" : isMyTurn ? "#1a1a2e" : "#0d0d1a",
              border: `1px solid ${winner ? "#555" : isMyTurn ? (myColor === P1 ? "#ff475744" : "#ffd32a44") : "#222"}`,
              color: winner ? (winner === -1 ? "#aaa" : winnerIsMe ? "#7bed9f" : "#ff6b81") : isMyTurn ? "#e0e0ff" : "#666",
            }}>
            {winner
              ? winner === -1 ? "DRAW!" : `${winnerName?.toUpperCase()} WINS!`
              : aiThinking
                ? <span>{p2Name.toUpperCase()} THINKING<span className="animate-thinkDot">...</span></span>
                : isMyTurn
                  ? `${(mode === "ai" ? playerName : playerName).toUpperCase()}'S TURN`
                  : `${(mode === "ai" ? opponentName : opponentName).toUpperCase()}'S TURN`
            }
          </div>

          {/* Scoreboard */}
          <div className="flex items-center gap-3 text-[11px] bg-[#0d0d1a] rounded-lg px-3 py-2 border border-[#1a1a3a]">
            <div className="flex items-center gap-2" style={{ opacity: currentPlayer === P1 && !winner ? 1 : 0.5 }}>
              <div className="w-3.5 h-3.5 rounded-full bg-[#ff4757] shrink-0"
                style={{ boxShadow: currentPlayer === P1 && !winner ? "0 0 8px #ff4757" : "none" }} />
              <span className="text-[#ff4757] max-w-[72px] truncate">{p1Name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-lg font-bold min-w-[60px] justify-center">
              <span className="text-[#ff4757]">{scores.p1}</span>
              <span className="text-[#444] text-xs">-</span>
              {scores.draws > 0 && <>
                <span className="text-[#666] text-sm">{scores.draws}</span>
                <span className="text-[#444] text-xs">-</span>
              </>}
              <span className="text-[#ffd32a]">{scores.p2}</span>
            </div>
            <div className="flex items-center gap-2" style={{ opacity: currentPlayer === P2 && !winner ? 1 : 0.5 }}>
              <span className="text-[#ffd32a] max-w-[72px] truncate">{p2Name}</span>
              <div className="w-3.5 h-3.5 rounded-full bg-[#ffd32a] shrink-0"
                style={{ boxShadow: currentPlayer === P2 && !winner ? "0 0 8px #ffd32a" : "none" }} />
            </div>
          </div>

          {/* Board */}
          <div className="rounded-xl p-2 pb-3"
            style={{
              background: "linear-gradient(180deg, #1a237e, #0d1557)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
              border: "2px solid #283593",
            }}>
            {/* Column indicators */}
            <div className="grid gap-1 mb-1 px-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {Array.from({ length: COLS }, (_, c) => (
                <div key={c} className="h-1.5 rounded-full transition-all duration-200"
                  style={{
                    background: hoverCol === c && isMyTurn && !aiThinking
                      ? (myColor === P1 ? "#ff4757" : "#ffd32a") : "transparent",
                    boxShadow: hoverCol === c && isMyTurn && !aiThinking
                      ? `0 0 8px ${myColor === P1 ? "#ff4757" : "#ffd32a"}` : "none",
                  }} />
              ))}
            </div>

            {/* Grid */}
            <div className="grid gap-[3px] sm:gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {board.map((row, r) => row.map((cell, c) => {
                const isAnim = animatingDrop?.row === r && animatingDrop?.col === c;
                const isPreview = previewRow === r && hoverCol === c && !cell;
                const isWin = isWinCell(r, c);
                const p = isAnim ? animatingDrop.player : cell;

                return (
                  <div
                    key={`${r}-${c}`}
                    className="rounded-full flex items-center justify-center relative"
                    style={{
                      width: "clamp(40px, calc((100vw - 48px) / 7), 56px)",
                      height: "clamp(40px, calc((100vw - 48px) / 7), 56px)",
                      background: "#0a0e3d",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                      cursor: isMyTurn && !aiThinking && getDropRow(board, c) >= 0 ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (touchedRef.current) { touchedRef.current = false; return; }
                      makeMove(c);
                    }}
                    onMouseEnter={() => { setHoverCol(c); if (isMyTurn && !aiThinking && audioReady) sounds.hover(); }}
                    onMouseLeave={() => setHoverCol(-1)}
                    onTouchStart={() => {
                      touchedRef.current = true;
                      setHoverCol(c);
                      makeMove(c);
                    }}
                    onTouchEnd={() => setHoverCol(-1)}
                  >
                    {p !== EMPTY && (
                      <div
                        className={isAnim ? `drop-${r}` : isWin ? "animate-pulse" : ""}
                        style={{
                          width: "82%", height: "82%", borderRadius: "50%",
                          background: p === P1
                            ? "radial-gradient(circle at 35% 35%, #ff6b81, #ff4757 60%, #c0392b)"
                            : "radial-gradient(circle at 35% 35%, #ffe066, #ffd32a 60%, #d4a017)",
                          boxShadow: isWin
                            ? `0 0 20px ${p === P1 ? "#ff4757" : "#ffd32a"}, 0 0 40px ${p === P1 ? "#ff475755" : "#ffd32a55"}, inset 0 -2px 4px rgba(0,0,0,0.3)`
                            : "inset 0 -2px 4px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      />
                    )}
                    {isPreview && (
                      <div className="absolute w-[82%] h-[82%] rounded-full animate-previewBlink"
                        style={{ border: `2px dashed ${myColor === P1 ? "#ff475744" : "#ffd32a44"}` }} />
                    )}
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Room / mode label */}
          <div className="text-[10px] text-[#333] tracking-widest">
            {mode === "ai" ? `VS CPU · ${DIFF[difficulty]}` : `ROOM ${roomCode}`}
          </div>

          {/* Game over actions */}
          {(winner || moveCount >= 42) && (
            <div className="flex flex-col items-center gap-3 animate-slideUp mt-1">
              {mode === "ai" ? (
                <div className="flex gap-3 flex-wrap justify-center">
                  <button className="btn text-[#7bed9f] border-[#7bed9f] text-base px-8 py-3"
                    onClick={requestRematch}>REMATCH</button>
                  <button className="btn text-[#70a1ff] border-[#70a1ff]"
                    onClick={() => {
                      const s = { ...scores }; const lw = lastWinner;
                      resetLocal(undefined, P1); setScores(s); setLastWinner(lw);
                      setScreen("difficulty");
                    }}>DIFFICULTY</button>
                </div>
              ) : (
                !myRematchSent ? (
                  <button className="btn text-[#7bed9f] border-[#7bed9f] text-base px-8 py-3"
                    onClick={requestRematch}>REMATCH?</button>
                ) : (
                  <div className="text-[11px] text-[#7bed9f] animate-glow">
                    REMATCH REQUESTED — WAITING...
                  </div>
                )
              )}
              <button className="btn btn-sm text-[#888] border-[#444]" onClick={goToLobby}>
                BACK TO MENU
              </button>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-3 text-[9px] text-[#222] tracking-widest">DROP FOUR TO WIN</div>
    </div>
  );
}
