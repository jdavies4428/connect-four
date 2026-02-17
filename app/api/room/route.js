import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/redis";
import { createBoard, getDropRow, checkWin, genRoomCode, P1, P2 } from "@/lib/game";

// GET /api/room?code=XXXX — poll game state
export async function GET(req) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  return NextResponse.json(room);
}

// POST /api/room — create room, join room, make move, request rematch
export async function POST(req) {
  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const { playerId, playerName } = body;
    let code;
    let attempts = 0;
    do {
      code = genRoomCode();
      const existing = await getRoom(code);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const room = {
      roomCode: code,
      board: createBoard(),
      currentPlayer: P1,
      player1: playerId,
      player1Name: playerName || "PLAYER 1",
      player2: null,
      player2Name: null,
      winner: null,
      winCells: [],
      moveCount: 0,
      lastMove: null,
      rematch: { p1: false, p2: false },
      gameNumber: 0,
      scores: { p1: 0, p2: 0, draws: 0 },
      lastWinner: null,
    };
    await setRoom(code, room);
    return NextResponse.json(room);
  }

  if (action === "join") {
    const { code, playerId, playerName } = body;
    const room = await getRoom(code.toUpperCase());
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.player2 && room.player2 !== playerId) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }
    room.player2 = playerId;
    room.player2Name = playerName || "PLAYER 2";
    await setRoom(code.toUpperCase(), room);
    return NextResponse.json(room);
  }

  if (action === "move") {
    const { code, playerId, col } = body;
    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.winner) return NextResponse.json({ error: "Game over" }, { status: 400 });

    // Validate it's this player's turn
    const playerNum = room.player1 === playerId ? P1 : (room.player2 === playerId ? P2 : null);
    if (!playerNum || playerNum !== room.currentPlayer) {
      return NextResponse.json({ error: "Not your turn" }, { status: 403 });
    }

    const row = getDropRow(room.board, col);
    if (row === -1) return NextResponse.json({ error: "Column full" }, { status: 400 });

    room.board[row][col] = playerNum;
    room.moveCount++;
    room.lastMove = { row, col, player: playerNum };
    room.currentPlayer = playerNum === P1 ? P2 : P1;

    const winResult = checkWin(room.board, row, col);
    if (winResult) {
      room.winner = playerNum;
      room.winCells = winResult;
      room.lastWinner = playerNum;
      room.scores[playerNum === P1 ? "p1" : "p2"]++;
    } else if (room.moveCount >= 42) {
      room.winner = -1;
      room.scores.draws++;
    }
    room.rematch = { p1: false, p2: false };

    await setRoom(code, room);
    return NextResponse.json(room);
  }

  if (action === "rematch") {
    const { code, playerId } = body;
    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const playerNum = room.player1 === playerId ? P1 : P2;
    if (playerNum === P1) room.rematch.p1 = true;
    else room.rematch.p2 = true;

    if (room.rematch.p1 && room.rematch.p2) {
      const starter = room.lastWinner && room.lastWinner !== -1 ? room.lastWinner : P1;
      room.board = createBoard();
      room.currentPlayer = starter;
      room.winner = null;
      room.winCells = [];
      room.moveCount = 0;
      room.lastMove = null;
      room.rematch = { p1: false, p2: false };
      room.gameNumber = (room.gameNumber || 0) + 1;
    }

    await setRoom(code, room);
    return NextResponse.json(room);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
