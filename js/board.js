// js/board.js

export const ROWS = 6;
export const COLS = 7;

export class BoardManager {
  constructor() {
    this.grid = [];
    this.currentPlayer = 1;
    this.isGameOver = false;
    
    // Undo / Redo Stacks
    this.historyStack = []; // Elements: { col, row, player }
    this.redoStack = [];

    // Match Series Tracker
    this.seriesMode = 'unlimited'; // 'bo3', 'bo bo5', 'bo7', 'unlimited'
    this.seriesScores = { p1: 0, p2: 0, ties: 0 };
    this.seriesWinner = null; // 1, 2, or null
    
    // Playback Replay Log
    this.replayMoves = []; // Log of columns selected: [3, 4, 3, 2, ...]
    this.undoCountThisMatch = 0;
    this.opponentLosesCount = 0; // tracking if opponent had potential wins blocked
  }

  init() {
    this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    this.currentPlayer = 1;
    this.isGameOver = false;
    this.historyStack = [];
    this.redoStack = [];
  }

  startNewMatch(seriesMode = 'unlimited') {
    this.seriesMode = seriesMode;
    this.seriesScores = { p1: 0, p2: 0, ties: 0 };
    this.seriesWinner = null;
    this.replayMoves = [];
    this.undoCountThisMatch = 0;
    this.init();
  }

  startNewRound() {
    this.init();
  }

  getLowestEmptyRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r][col] === 0) {
        return r;
      }
    }
    return -1;
  }

  placeDisc(col) {
    if (this.isGameOver) return null;

    const row = this.getLowestEmptyRow(col);
    if (row === -1) return null; // Column is full

    this.grid[row][col] = this.currentPlayer;
    
    const move = { col, row, player: this.currentPlayer };
    this.historyStack.push(move);
    this.replayMoves.push(col);
    this.redoStack = []; // clear redo stack on new move

    return move;
  }

  undo() {
    if (this.historyStack.length === 0 || this.isGameOver) return null;

    const lastMove = this.historyStack.pop();
    this.grid[lastMove.row][lastMove.col] = 0;
    this.redoStack.push(lastMove);
    this.undoCountThisMatch++;

    // Switch player turn back
    this.currentPlayer = lastMove.player;

    return lastMove;
  }

  redo() {
    if (this.redoStack.length === 0 || this.isGameOver) return null;

    const nextMove = this.redoStack.pop();
    this.grid[nextMove.row][nextMove.col] = nextMove.player;
    this.historyStack.push(nextMove);
    
    // Switch player turn forward
    this.currentPlayer = nextMove.player === 1 ? 2 : 1;

    return nextMove;
  }

  // Returns target wins needed to complete a series
  getSeriesTargetWins() {
    if (this.seriesMode === 'bo3') return 2;
    if (this.seriesMode === 'bo5') return 3;
    if (this.seriesMode === 'bo7') return 4;
    return Infinity; // Unlimited mode
  }

  recordRoundOutcome(winner) {
    if (winner === 1) {
      this.seriesScores.p1++;
    } else if (winner === 2) {
      this.seriesScores.p2++;
    } else {
      this.seriesScores.ties++;
    }

    const target = this.getSeriesTargetWins();
    if (this.seriesScores.p1 >= target) {
      this.seriesWinner = 1;
    } else if (this.seriesScores.p2 >= target) {
      this.seriesWinner = 2;
    }
    
    return {
      scores: this.seriesScores,
      seriesWinner: this.seriesWinner,
      targetWins: target
    };
  }

  checkWin() {
    // Horizontal Check
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r][c+1] && val === this.grid[r][c+2] && val === this.grid[r][c+3]) {
          return { winner: val, cells: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
        }
      }
    }

    // Vertical Check
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r+1][c] && val === this.grid[r+2][c] && val === this.grid[r+3][c]) {
          return { winner: val, cells: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
        }
      }
    }

    // Diagonal (\) Check
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r+1][c+1] && val === this.grid[r+2][c+2] && val === this.grid[r+3][c+3]) {
          return { winner: val, cells: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
        }
      }
    }

    // Diagonal (/) Check
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r-1][c+1] && val === this.grid[r-2][c+2] && val === this.grid[r-3][c+3]) {
          return { winner: val, cells: [[r, c], [r-1, c+1], [r-2, c+2], [r-3, c+3]] };
        }
      }
    }

    return null;
  }

  checkTie() {
    for (let c = 0; c < COLS; c++) {
      if (this.grid[0][c] === 0) {
        return false;
      }
    }
    return true;
  }
}
