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

function isTerminal(board) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && checkWin(board, r, c)) return true;
  return getValidCols(board).length === 0;
}

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  const human = aiPlayer === P1 ? P2 : P1;
  if (depth === 0 || isTerminal(board)) return [null, evaluateBoard(board, aiPlayer)];

  const cols = getValidCols(board);
  if (maximizing) {
    let best = -Infinity, bestCol = cols[Math.floor(Math.random() * cols.length)];
    for (const col of cols) {
      const row = getDropRow(board, col);
      const b = board.map(r => [...r]);
      b[row][col] = aiPlayer;
      const [, s] = minimax(b, depth - 1, alpha, beta, false, aiPlayer);
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
      const [, s] = minimax(b, depth - 1, alpha, beta, true, aiPlayer);
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

  // Always check for immediate win or block
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

  if (difficulty === "easy") {
    if (Math.random() < 0.3) return minimax(board, 2, -Infinity, Infinity, true, aiPlayer)[0];
    return cols[Math.floor(Math.random() * cols.length)];
  }
  if (difficulty === "medium") {
    return minimax(board, 3, -Infinity, Infinity, true, aiPlayer)[0];
  }
  return minimax(board, 5, -Infinity, Infinity, true, aiPlayer)[0];
}
