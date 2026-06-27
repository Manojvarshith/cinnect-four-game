

export const ROWS = 6;
export const COLS = 7;

export class BoardManager {
  constructor() {
    this.grid = [];
    this.currentPlayer = 1;
    this.isGameOver = false;

    this.historyStack = []; 
    this.redoStack = [];

    this.seriesMode = 'unlimited'; 
    this.seriesScores = { p1: 0, p2: 0, ties: 0 };
    this.seriesWinner = null; 

    this.replayMoves = []; 
    this.undoCountThisMatch = 0;
    this.opponentLosesCount = 0; 
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
    if (row === -1) return null; 

    this.grid[row][col] = this.currentPlayer;
    
    const move = { col, row, player: this.currentPlayer };
    this.historyStack.push(move);
    this.replayMoves.push(col);
    this.redoStack = []; 

    return move;
  }

  undo() {
    if (this.historyStack.length === 0 || this.isGameOver) return null;

    const lastMove = this.historyStack.pop();
    this.grid[lastMove.row][lastMove.col] = 0;
    this.redoStack.push(lastMove);
    this.undoCountThisMatch++;

    this.currentPlayer = lastMove.player;

    return lastMove;
  }

  redo() {
    if (this.redoStack.length === 0 || this.isGameOver) return null;

    const nextMove = this.redoStack.pop();
    this.grid[nextMove.row][nextMove.col] = nextMove.player;
    this.historyStack.push(nextMove);

    this.currentPlayer = nextMove.player === 1 ? 2 : 1;

    return nextMove;
  }

  getSeriesTargetWins() {
    if (this.seriesMode === 'bo3') return 2;
    if (this.seriesMode === 'bo5') return 3;
    if (this.seriesMode === 'bo7') return 4;
    return Infinity; 
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
    
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r][c+1] && val === this.grid[r][c+2] && val === this.grid[r][c+3]) {
          return { winner: val, cells: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
        }
      }
    }

    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r+1][c] && val === this.grid[r+2][c] && val === this.grid[r+3][c]) {
          return { winner: val, cells: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
        }
      }
    }

    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = this.grid[r][c];
        if (val !== 0 && val === this.grid[r+1][c+1] && val === this.grid[r+2][c+2] && val === this.grid[r+3][c+3]) {
          return { winner: val, cells: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
        }
      }
    }

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
