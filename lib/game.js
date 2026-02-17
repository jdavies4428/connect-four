export const ROWS = 6;
export const COLS = 7;
export const EMPTY = 0;
export const P1 = 1;
export const P2 = 2;

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

export function getDropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) return r;
  }
  return -1;
}

export function checkWin(board, row, col) {
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

export function genRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function genPlayerId() {
  return Math.random().toString(36).slice(2, 10);
}
