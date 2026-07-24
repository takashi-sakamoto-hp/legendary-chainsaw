export const SIZE = 4;
export const WIN_LEN = 4;

export const PLAYER = { HUMAN: 1, PC: 2 };
export const PIECE = { EMPTY: 0, BLACK: 1, WHITE: 2 };

const DIRECTIONS = [];
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dy === 0 && dz === 0) continue;
      DIRECTIONS.push([dx, dy, dz]);
    }
  }
}

export function createBoard() {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill(PIECE.EMPTY))
  );
}

export function cloneBoard(board) {
  return board.map((plane) => plane.map((row) => row.slice()));
}

export function getDropY(board, x, z) {
  for (let y = 0; y < SIZE; y++) {
    if (board[x][y][z] === PIECE.EMPTY) return y;
  }
  return -1;
}

export function isColumnFull(board, x, z) {
  return getDropY(board, x, z) === -1;
}

export function dropPiece(board, x, z, piece) {
  const y = getDropY(board, x, z);
  if (y === -1) return null;
  board[x][y][z] = piece;
  return { x, y, z };
}

export function getValidMoves(board) {
  const moves = [];
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      if (!isColumnFull(board, x, z)) moves.push({ x, z });
    }
  }
  return moves;
}

export function checkWinner(board) {
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      for (let z = 0; z < SIZE; z++) {
        const cell = board[x][y][z];
        if (cell === PIECE.EMPTY) continue;

        for (const [dx, dy, dz] of DIRECTIONS) {
          let count = 1;
          for (let i = 1; i < WIN_LEN; i++) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            const nz = z + dz * i;
            if (
              nx < 0 || nx >= SIZE ||
              ny < 0 || ny >= SIZE ||
              nz < 0 || nz >= SIZE ||
              board[nx][ny][nz] !== cell
            ) {
              break;
            }
            count++;
          }
          if (count >= WIN_LEN) return cell;
        }
      }
    }
  }
  return null;
}

export function isBoardFull(board) {
  return getValidMoves(board).length === 0;
}

function countLineScore(line, player) {
  const opponent = player === PIECE.BLACK ? PIECE.WHITE : PIECE.BLACK;
  let mine = 0;
  let theirs = 0;
  let empty = 0;

  for (const cell of line) {
    if (cell === player) mine++;
    else if (cell === opponent) theirs++;
    else empty++;
  }

  if (theirs > 0 && mine > 0) return 0;
  if (mine === 4) return 100000;
  if (mine === 3 && empty === 1) return 500;
  if (mine === 2 && empty === 2) return 20;
  if (mine === 1 && empty === 3) return 2;
  if (theirs === 3 && empty === 1) return -800;
  if (theirs === 2 && empty === 2) return -15;
  return 0;
}

function evaluateBoard(board, player) {
  const winner = checkWinner(board);
  if (winner === player) return 100000;
  if (winner && winner !== player) return -100000;

  let score = 0;
  const lines = collectLines(board);

  for (const line of lines) {
    score += countLineScore(line, player);
    const opponent = player === PIECE.BLACK ? PIECE.WHITE : PIECE.BLACK;
    score -= countLineScore(line, opponent) * 0.9;
  }

  const center = (SIZE - 1) / 2;
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      for (let z = 0; z < SIZE; z++) {
        if (board[x][y][z] === player) {
          const dist =
            Math.abs(x - center) + Math.abs(y - center) + Math.abs(z - center);
          score += (6 - dist) * 0.5;
        }
      }
    }
  }

  return score;
}

function collectLines(board) {
  const lines = [];

  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      lines.push([board[x][y][0], board[x][y][1], board[x][y][2], board[x][y][3]]);
    }
  }
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      lines.push([board[x][0][z], board[x][1][z], board[x][2][z], board[x][3][z]]);
    }
  }
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      lines.push([board[0][y][z], board[1][y][z], board[2][y][z], board[3][y][z]]);
    }
  }

  for (let x = 0; x < SIZE; x++) {
    lines.push([board[x][0][0], board[x][1][1], board[x][2][2], board[x][3][3]]);
    lines.push([board[x][0][3], board[x][1][2], board[x][2][1], board[x][3][0]]);
  }
  for (let y = 0; y < SIZE; y++) {
    lines.push([board[0][y][0], board[1][y][1], board[2][y][2], board[3][y][3]]);
    lines.push([board[0][y][3], board[1][y][2], board[2][y][1], board[3][y][0]]);
  }
  for (let z = 0; z < SIZE; z++) {
    lines.push([board[0][0][z], board[1][1][z], board[2][2][z], board[3][3][z]]);
    lines.push([board[0][3][z], board[1][2][z], board[2][1][z], board[3][0][z]]);
  }

  lines.push([board[0][0][0], board[1][1][1], board[2][2][2], board[3][3][3]]);
  lines.push([board[0][0][3], board[1][1][2], board[2][2][1], board[3][3][0]]);
  lines.push([board[0][3][0], board[1][2][1], board[2][1][2], board[3][0][3]]);
  lines.push([board[0][3][3], board[1][2][2], board[2][1][1], board[3][0][0]]);

  return lines;
}

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  const winner = checkWinner(board);
  if (winner === aiPlayer) return 100000 + depth;
  if (winner && winner !== aiPlayer) return -100000 - depth;
  if (depth === 0 || isBoardFull(board)) {
    return evaluateBoard(board, aiPlayer);
  }

  const moves = getValidMoves(board);
  if (maximizing) {
    let maxEval = -Infinity;
    for (const { x, z } of moves) {
      const next = cloneBoard(board);
      dropPiece(next, x, z, aiPlayer);
      const evalScore = minimax(next, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  }

  const opponent = aiPlayer === PIECE.BLACK ? PIECE.WHITE : PIECE.BLACK;
  let minEval = Infinity;
  for (const { x, z } of moves) {
    const next = cloneBoard(board);
    dropPiece(next, x, z, opponent);
    const evalScore = minimax(next, depth - 1, alpha, beta, true, aiPlayer);
    minEval = Math.min(minEval, evalScore);
    beta = Math.min(beta, evalScore);
    if (beta <= alpha) break;
  }
  return minEval;
}

export function findBestMove(board, aiPlayer, depth = 5) {
  const moves = getValidMoves(board);
  if (moves.length === 0) return null;

  for (const { x, z } of moves) {
    const next = cloneBoard(board);
    dropPiece(next, x, z, aiPlayer);
    if (checkWinner(next) === aiPlayer) return { x, z };
  }

  const opponent = aiPlayer === PIECE.BLACK ? PIECE.WHITE : PIECE.BLACK;
  for (const { x, z } of moves) {
    const next = cloneBoard(board);
    dropPiece(next, x, z, opponent);
    if (checkWinner(next) === opponent) return { x, z };
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = cloneBoard(board);
    dropPiece(next, move.x, move.z, aiPlayer);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
