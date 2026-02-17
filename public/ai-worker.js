// Standalone Web Worker — all game + AI logic inlined (no ES module imports)
const ROWS = 6, COLS = 7, EMPTY = 0, P1 = 1, P2 = 2;

function getDropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) return r;
  }
  return -1;
}

function checkWin(board, row, col) {
  const p = board[row][col];
  if (!p) return null;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells = [[row, col]];
    for (const sign of [1, -1]) {
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i * sign;
        const c = col + dc * i * sign;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === p) {
          cells.push([r, c]);
        } else break;
      }
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return null;
}

function getValidCols(board) {
  const cols = [];
  for (const c of [3, 2, 4, 1, 5, 0, 6]) {
    if (c < COLS && getDropRow(board, c) >= 0) cols.push(c);
  }
  return cols;
}

function scoreWindow(win, player) {
  const opp = player === P1 ? P2 : P1;
  const p = win.filter(c => c === player).length;
  const e = win.filter(c => c === EMPTY).length;
  const o = win.filter(c => c === opp).length;
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

function minimax(board, depth, alpha, beta, maximizing, aiPlayer, lastRow, lastCol, deadline) {
  if (Date.now() >= deadline) return [null, evaluateBoard(board, aiPlayer)];
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

function getAiMove(board, difficulty, aiPlayer) {
  if (aiPlayer === undefined) aiPlayer = P2;
  const human = aiPlayer === P1 ? P2 : P1;
  const cols = getValidCols(board);
  if (cols.length === 0) return -1;
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

self.onmessage = function (e) {
  const { board, difficulty, aiPlayer } = e.data;
  const col = getAiMove(board, difficulty, aiPlayer);
  self.postMessage({ col });
};
