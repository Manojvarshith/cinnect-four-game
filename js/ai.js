// js/ai.js
import { ROWS, COLS } from './board.js';

export class ConnectFourAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  // Get the column to play
  getMove(grid, p1ColorId = 1, aiColorId = 2) {
    const validMoves = this.getValidMoves(grid);
    if (validMoves.length === 0) return -1;

    switch (this.difficulty) {
      case 'easy':
        return this.getEasyMove(validMoves);
      case 'medium':
        return this.getMediumMove(grid, validMoves, p1ColorId, aiColorId);
      case 'hard':
        return this.getHardMove(grid, 3, p1ColorId, aiColorId);
      case 'impossible':
      default:
        return this.getImpossibleMove(grid, 5, p1ColorId, aiColorId);
    }
  }

  getEasyMove(validMoves) {
    // 100% random selection
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  getMediumMove(grid, validMoves, p1, ai) {
    // 1. Check if AI can win immediately
    for (const col of validMoves) {
      const tempGrid = this.copyGrid(grid);
      const r = this.getLowestEmptyRowInGrid(tempGrid, col);
      tempGrid[r][col] = ai;
      if (this.checkWinInGrid(tempGrid, ai)) {
        return col;
      }
    }

    // 2. Check if opponent can win immediately and block
    for (const col of validMoves) {
      const tempGrid = this.copyGrid(grid);
      const r = this.getLowestEmptyRowInGrid(tempGrid, col);
      tempGrid[r][col] = p1;
      if (this.checkWinInGrid(tempGrid, p1)) {
        return col;
      }
    }

    // 3. Fallback to center-weighted move or random
    const centerCols = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerCols) {
      if (validMoves.includes(col)) return col;
    }

    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  getHardMove(grid, depth, p1, ai) {
    const { column } = this.minimax(grid, depth, -Infinity, Infinity, true, p1, ai);
    return column !== -1 ? column : this.getEasyMove(this.getValidMoves(grid));
  }

  getImpossibleMove(grid, depth, p1, ai) {
    const { column } = this.minimax(grid, depth, -Infinity, Infinity, true, p1, ai);
    return column !== -1 ? column : this.getEasyMove(this.getValidMoves(grid));
  }

  /* ==========================================
     MINIMAX ENGINE WITH ALPHA-BETA PRUNING
     ========================================== */

  minimax(grid, depth, alpha, beta, isMaximizing, p1, ai) {
    const validCols = this.getValidMoves(grid);
    const isAiWon = this.checkWinInGrid(grid, ai);
    const isP1Won = this.checkWinInGrid(grid, p1);
    const isTie = validCols.length === 0;

    if (isAiWon) return { score: 10000000 + depth, column: -1 };
    if (isP1Won) return { score: -10000000 - depth, column: -1 };
    if (isTie) return { score: 0, column: -1 };
    if (depth === 0) return { score: this.evaluateGrid(grid, p1, ai), column: -1 };

    // Sort valid columns by center proximity to optimize Alpha-Beta pruning cuts
    const centerOrder = [3, 2, 4, 1, 5, 0, 6];
    validCols.sort((a, b) => centerOrder.indexOf(a) - centerOrder.indexOf(b));

    if (isMaximizing) {
      let value = -Infinity;
      let bestCol = validCols[0];

      for (const col of validCols) {
        const nextGrid = this.copyGrid(grid);
        const r = this.getLowestEmptyRowInGrid(nextGrid, col);
        nextGrid[r][col] = ai;

        const score = this.minimax(nextGrid, depth - 1, alpha, beta, false, p1, ai).score;
        if (score > value) {
          value = score;
          bestCol = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break; // Beta cut-off
      }
      return { score: value, column: bestCol };
    } else {
      let value = Infinity;
      let bestCol = validCols[0];

      for (const col of validCols) {
        const nextGrid = this.copyGrid(grid);
        const r = this.getLowestEmptyRowInGrid(nextGrid, col);
        nextGrid[r][col] = p1;

        const score = this.minimax(nextGrid, depth - 1, alpha, beta, true, p1, ai).score;
        if (score < value) {
          value = score;
          bestCol = col;
        }
        beta = Math.min(beta, value);
        if (alpha >= beta) break; // Alpha cut-off
      }
      return { score: value, column: bestCol };
    }
  }

  // Heuristic Grid Scorer
  evaluateGrid(grid, p1, ai) {
    let score = 0;

    // 1. Center Column Positional Value
    const centerCol = 3;
    let centerCount = 0;
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][centerCol] === ai) centerCount++;
    }
    score += centerCount * 4;

    // 2. Evaluate all slices of 4
    // Horizontal Slices
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        score += this.scoreSlice([grid[r][c], grid[r][c+1], grid[r][c+2], grid[r][c+3]], p1, ai);
      }
    }

    // Vertical Slices
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        score += this.scoreSlice([grid[r][c], grid[r+1][c], grid[r+2][c], grid[r+3][c]], p1, ai);
      }
    }

    // Diagonal Slices (\)
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        score += this.scoreSlice([grid[r][c], grid[r+1][c+1], grid[r+2][c+2], grid[r+3][c+3]], p1, ai);
      }
    }

    // Diagonal Slices (/)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        score += this.scoreSlice([grid[r][c], grid[r-1][c+1], grid[r-2][c+2], grid[r-3][c+3]], p1, ai);
      }
    }

    return score;
  }

  scoreSlice(slice, p1, ai) {
    let score = 0;
    const aiCount = slice.filter(x => x === ai).length;
    const p1Count = slice.filter(x => x === p1).length;
    const emptyCount = slice.filter(x => x === 0).length;

    if (aiCount === 4) {
      score += 100000;
    } else if (aiCount === 3 && emptyCount === 1) {
      score += 150;
    } else if (aiCount === 2 && emptyCount === 2) {
      score += 25;
    }

    if (p1Count === 3 && emptyCount === 1) {
      score -= 300; // Strong block incentive
    } else if (p1Count === 2 && emptyCount === 2) {
      score -= 50;
    }

    return score;
  }

  /* ==========================================
     UTILITIES AND GRID HELPERS
     ========================================== */

  getValidMoves(grid) {
    const moves = [];
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c] === 0) moves.push(c);
    }
    return moves;
  }

  getLowestEmptyRowInGrid(grid, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === 0) return r;
    }
    return -1;
  }

  copyGrid(src) {
    return src.map(row => [...row]);
  }

  checkWinInGrid(grid, player) {
    // Horizontal Check
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (grid[r][c] === player && grid[r][c+1] === player && grid[r][c+2] === player && grid[r][c+3] === player) {
          return true;
        }
      }
    }
    // Vertical Check
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === player && grid[r+1][c] === player && grid[r+2][c] === player && grid[r+3][c] === player) {
          return true;
        }
      }
    }
    // Diagonal (\) Check
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (grid[r][c] === player && grid[r+1][c+1] === player && grid[r+2][c+2] === player && grid[r+3][c+3] === player) {
          return true;
        }
      }
    }
    // Diagonal (/) Check
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (grid[r][c] === player && grid[r-1][c+1] === player && grid[r-2][c+2] === player && grid[r-3][c+3] === player) {
          return true;
        }
      }
    }
    return false;
  }
}
