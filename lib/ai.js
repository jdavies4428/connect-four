import { ROWS, COLS, EMPTY, P1, P2, getDropRow, checkWin } from "./game";

function getValidCols(board) {
  const cols = [];
  for (const c of [3, 2, 4, 1, 5, 0, 6]) {
    if (c < COLS && getDropRow(board, c) >= 0) cols.push(c);
  }
  return cols;
}

function scoreWindow(window, player) {
  const opp = player === P1 ? P2 : P1;
  const p = window.filter(c => c === player).length;
  const e = window.filter(c => c === EMPTY).length;
  const o = window.filter(c => c === opp).length;
  if (p === 4) return 100;
  if (o === 4) return -100;
  if (p === 3 && e === 1) return 5;
  if (p === 2 && e === 2) return 2;
  if (o === 3 && e === 1) return -4;
  return 0;
}

function evaluateBoard(board, player) {
  let score = 0;
  const center = Math.floor(COLS / 2);
  score += board.reduce((s, row) => s + (row[center] === player ? 1 : 0), 0) * 3;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], player);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], player);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], player);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 3; c < COLS; c++)
      score += scoreWindow([board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]], player);
  return score;
}

// lastRow/lastCol: the piece just placed before this call (so we only check that piece for a win)
function minimax(board, depth, alpha, beta, maximizing, aiPlayer, lastRow, lastCol, deadline) {
  if (Date.now() >= deadline) return [null, evaluateBoard(board, aiPlayer)];

  // O(1) terminal check — only the last placed piece can have just created a win
  if (lastRow >= 0 && checkWin(board, lastRow, lastCol)) {
    const aiWon = board[lastRow][lastCol] === aiPlayer;
    return [null, aiWon ? 1000 + depth : -1000 - depth];
  }

  const cols = getValidCols(board);
  if (depth === 0 || cols.length === 0) return [null, evaluateBoard(board, aiPlayer)];

  const human = aiPlayer === P1 ? P2 : P1;
  if (maximizing) {
    let best = -Infinity, bestCol = cols[Math.floor(Math.random() * cols.length)];
    for (const col of cols) {
      const row = getDropRow(board, col);
      const b = board.map(r => [...r]);
      b[row][col] = aiPlayer;
      const [, s] = minimax(b, depth - 1, alpha, beta, false, aiPlayer, row, col, deadline);
      if (s > best) { best = s; bestCol = col; }
      alpha = Math.max(alpha, s);
      if (alpha >= beta) break;
    }
    return [bestCol, best];
  } else {
    let best = Infinity, bestCol = cols[Math.floor(Math.random() * cols.length)];
    for (const col of cols) {
      const row = getDropRow(board, col);
      const b = board.map(r => [...r]);
      b[row][col] = human;
      const [, s] = minimax(b, depth - 1, alpha, beta, true, aiPlayer, row, col, deadline);
      if (s < best) { best = s; bestCol = col; }
      beta = Math.min(beta, s);
      if (alpha >= beta) break;
    }
    return [bestCol, best];
  }
}

export function getAiMove(board, difficulty, aiPlayer = P2) {
  const human = aiPlayer === P1 ? P2 : P1;
  const cols = getValidCols(board);
  if (cols.length === 0) return -1;

  // Always check for immediate win or block first
  for (const col of cols) {
    const row = getDropRow(board, col);
    const b = board.map(r => [...r]);
    b[row][col] = aiPlayer;
    if (checkWin(b, row, col)) return col;
  }
  for (const col of cols) {
    const row = getDropRow(board, col);
    const b = board.map(r => [...r]);
    b[row][col] = human;
    if (checkWin(b, row, col)) return col;
  }

  // Hard cap on think time so the main thread never freezes noticeably
  const deadline = Date.now() + (difficulty === "hard" ? 250 : 120);

  if (difficulty === "easy") {
    if (Math.random() < 0.3) return minimax(board, 2, -Infinity, Infinity, true, aiPlayer, -1, -1, deadline)[0];
    return cols[Math.floor(Math.random() * cols.length)];
  }
  if (difficulty === "medium") {
    return minimax(board, 4, -Infinity, Infinity, true, aiPlayer, -1, -1, deadline)[0];
  }
  return minimax(board, 6, -Infinity, Infinity, true, aiPlayer, -1, -1, deadline)[0];
}
