document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  /* ==========================================
     GAME CONFIGURATION & CONSTANTS
     ========================================== */
  const ROWS = 6;
  const COLS = 7;
  
  // Game state
  let board = []; // 2D array: 0 for empty, 1 for Player 1, 2 for Player 2
  let currentPlayer = 1; // 1 or 2
  let isGameOver = false;
  let gameMode = 'ai'; // 'ai' or 'pvp'
  let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
  let isAiMoving = false;

  // Scores
  let scores = {
    p1: 0,
    p2: 0,
    ties: 0
  };

  /* ==========================================
     DOM ELEMENTS
     ========================================== */
  const boardGrid = document.getElementById('board-grid');
  const turnCard = document.getElementById('turn-card');
  const currentPlayerName = document.getElementById('current-player-name');
  const p1ScoreEl = document.getElementById('p1-score');
  const p2ScoreEl = document.getElementById('p2-score');
  const tieScoreEl = document.getElementById('tie-score');
  const p2Label = document.getElementById('p2-label');
  const p2TokenPreview = document.getElementById('p2-token-preview');
  
  const modeSelect = document.getElementById('mode-select');
  const difficultySelect = document.getElementById('difficulty-select');
  const difficultyGroup = document.getElementById('difficulty-group');
  const columnHoversContainer = document.getElementById('column-hovers');
  
  const btnRestart = document.getElementById('btn-restart');
  const btnReset = document.getElementById('btn-reset');
  
  const endModal = document.getElementById('end-modal');
  const modalCard = endModal.querySelector('.modal-card');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalIcon = document.getElementById('modal-icon');
  const btnModalClose = document.getElementById('btn-modal-close');

  /* ==========================================
     INITIALIZATION & RESTART LOGIC
     ========================================== */
  
  // Create board DOM slots
  function initBoardDOM() {
    boardGrid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const slot = document.createElement('div');
        slot.classList.add('cell-slot');
        slot.dataset.row = r;
        slot.dataset.col = c;
        boardGrid.appendChild(slot);
      }
    }
  }

  // Restart local round
  function resetRound() {
    // Re-init state matrix
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    currentPlayer = 1;
    isGameOver = false;
    isAiMoving = false;
    
    // Reset board DOM cells
    const slots = boardGrid.querySelectorAll('.cell-slot');
    slots.forEach(slot => {
      slot.innerHTML = '';
    });

    updateTurnIndicator();
    
    // If AI is Player 2 and game mode is AI, wait for Player 1 click
    // No action needed since Player 1 always goes first.
  }

  // Reset entire match (including scores)
  function resetMatch() {
    scores.p1 = 0;
    scores.p2 = 0;
    scores.ties = 0;
    
    p1ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    tieScoreEl.textContent = '0';
    
    resetRound();
  }

  /* ==========================================
     GAMEPLAY FUNCTIONS
     ========================================== */

  // Find the lowest empty row in a column (returns index 0-5, or -1 if full)
  function getLowestEmptyRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        return r;
      }
    }
    return -1;
  }

  // Execute a move in a column
  function makeMove(col) {
    if (isGameOver || isAiMoving) return false;

    const row = getLowestEmptyRow(col);
    if (row === -1) return false; // Column is full

    // Update board state
    board[row][col] = currentPlayer;

    // Render token in UI
    const slot = boardGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const chip = document.createElement('div');
    chip.classList.add('chip');
    chip.classList.add(currentPlayer === 1 ? 'p1' : 'p2');
    slot.appendChild(chip);

    // Check win condition
    const winDetails = checkWin(board);
    if (winDetails) {
      handleGameOver(winDetails);
      return true;
    }

    // Check tie condition
    if (checkTie(board)) {
      handleGameOver({ winner: 'tie' });
      return true;
    }

    // Switch turns
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateTurnIndicator();

    // Trigger AI move if applicable
    if (gameMode === 'ai' && currentPlayer === 2 && !isGameOver) {
      triggerAiMove();
    }

    return true;
  }

  // Update Turn Card presentation
  function updateTurnIndicator() {
    const preview = turnCard.querySelector('.token-preview');
    
    turnCard.classList.remove('active-p1', 'active-p2');
    preview.classList.remove('player-1-color', 'player-2-color', 'glow-red', 'glow-cyan');
    
    if (currentPlayer === 1) {
      turnCard.classList.add('active-p1');
      preview.classList.add('player-1-color', 'glow-red');
      currentPlayerName.textContent = 'Player 1';
    } else {
      turnCard.classList.add('active-p2');
      preview.classList.add('player-2-color', 'glow-cyan');
      currentPlayerName.textContent = gameMode === 'ai' ? 'Computer AI' : 'Player 2';
    }
  }

  /* ==========================================
     WIN AND TIE CHECKING ENGINE
     ========================================== */
  
  function checkWin(grid) {
    // 1. Horizontal win check
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = grid[r][c];
        if (val !== 0 && val === grid[r][c+1] && val === grid[r][c+2] && val === grid[r][c+3]) {
          return { winner: val, cells: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
        }
      }
    }

    // 2. Vertical win check
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = grid[r][c];
        if (val !== 0 && val === grid[r+1][c] && val === grid[r+2][c] && val === grid[r+3][c]) {
          return { winner: val, cells: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
        }
      }
    }

    // 3. Diagonal down-right (\) win check
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = grid[r][c];
        if (val !== 0 && val === grid[r+1][c+1] && val === grid[r+2][c+2] && val === grid[r+3][c+3]) {
          return { winner: val, cells: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
        }
      }
    }

    // 4. Diagonal up-right (/) win check
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = grid[r][c];
        if (val !== 0 && val === grid[r-1][c+1] && val === grid[r-2][c+2] && val === grid[r-3][c+3]) {
          return { winner: val, cells: [[r, c], [r-1, c+1], [r-2, c+2], [r-3, c+3]] };
        }
      }
    }

    return null;
  }

  function checkTie(grid) {
    // Tie is true if top row is entirely full
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c] === 0) {
        return false;
      }
    }
    return true;
  }

  /* ==========================================
     GAME OVER HANDLERS
     ========================================== */

  function handleGameOver(result) {
    isGameOver = true;

    // Reset layout attributes
    modalCard.className = 'modal-card';
    
    if (result.winner === 'tie') {
      scores.ties++;
      tieScoreEl.textContent = scores.ties;
      
      modalCard.classList.add('won-tie');
      modalTitle.textContent = "IT'S A DRAW!";
      modalDescription.textContent = "Two great intellects clash, resulting in absolute equilibrium.";
      modalIcon.setAttribute('data-lucide', 'help-circle');
    } else {
      const winner = result.winner;
      
      // Update scores
      if (winner === 1) {
        scores.p1++;
        p1ScoreEl.textContent = scores.p1;
        modalCard.classList.add('won-p1');
        modalTitle.textContent = "PLAYER 1 WINS!";
        modalDescription.textContent = "A masterclass in spatial tactical strategy.";
        modalIcon.setAttribute('data-lucide', 'trophy');
      } else {
        scores.p2++;
        p2ScoreEl.textContent = scores.p2;
        modalCard.classList.add('won-p2');
        modalTitle.textContent = gameMode === 'ai' ? 'COMPUTER WINS!' : 'PLAYER 2 WINS!';
        modalDescription.textContent = gameMode === 'ai' ? "The machine's neural paths out-calculated your moves." : "A crushing victory through superior tactical foresight.";
        modalIcon.setAttribute('data-lucide', 'award');
      }

      // Highlight winning chips with animations
      result.cells.forEach(([r, c]) => {
        const slot = boardGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        const chip = slot.querySelector('.chip');
        if (chip) {
          chip.classList.add('win-highlight');
          // Inject custom color variable to style
          chip.style.color = winner === 1 ? 'var(--player-1)' : 'var(--player-2)';
        }
      });
    }

    lucide.createIcons(); // Update trophy/award icon in modal

    // Show modal overlay after short delay to let animations complete
    setTimeout(() => {
      endModal.classList.add('open');
    }, 800);
  }

  /* ==========================================
     HEURISTIC-BASED MINIMAX AI ENGINE
     ========================================== */
  
  function triggerAiMove() {
    isAiMoving = true;
    
    // Add artificial delay for organic gameplay feel
    const delay = Math.floor(Math.random() * 400) + 400;
    setTimeout(() => {
      let selectedCol = -1;
      
      if (aiDifficulty === 'easy') {
        selectedCol = getEasyMove();
      } else if (aiDifficulty === 'medium') {
        selectedCol = getMediumMove();
      } else {
        selectedCol = getHardMove();
      }

      isAiMoving = false;
      makeMove(selectedCol);
    }, delay);
  }

  // Easy AI: random column, but blocks immediate 4-in-a-row checks
  function getEasyMove() {
    const validMoves = getValidMoves();
    
    // 40% chance of making an intelligent block, 60% random
    if (Math.random() > 0.6) {
      // Check if we can win immediately
      for (let col of validMoves) {
        const tempBoard = copyBoard(board);
        const r = getLowestEmptyRowInGrid(tempBoard, col);
        tempBoard[r][col] = 2;
        if (checkWin(tempBoard)) return col;
      }
      
      // Check if opponent can win immediately and block
      for (let col of validMoves) {
        const tempBoard = copyBoard(board);
        const r = getLowestEmptyRowInGrid(tempBoard, col);
        tempBoard[r][col] = 1;
        if (checkWin(tempBoard)) return col;
      }
    }
    
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // Medium AI: Depth 2 minimax to evaluate moves and blocks
  function getMediumMove() {
    const { column } = minimax(board, 3, -Infinity, Infinity, true);
    return column !== -1 ? column : getEasyMove();
  }

  // Hard AI: Depth 5 minimax with advanced heuristics
  function getHardMove() {
    const { column } = minimax(board, 5, -Infinity, Infinity, true);
    return column !== -1 ? column : getEasyMove();
  }

  // Minimax algorithm with alpha-beta pruning
  function minimax(grid, depth, alpha, beta, isMaximizing) {
    const validCols = getValidMovesInGrid(grid);
    const winDetails = checkWin(grid);
    const isTerminal = winDetails || checkTie(grid) || depth === 0;

    if (isTerminal) {
      if (winDetails) {
        return { score: winDetails.winner === 2 ? 1000000 + depth : -1000000 - depth, column: -1 };
      }
      if (checkTie(grid)) {
        return { score: 0, column: -1 };
      }
      // Heuristic evaluation at leaf
      return { score: evaluateGridScore(grid), column: -1 };
    }

    if (isMaximizing) {
      let value = -Infinity;
      let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
      
      // Prioritize center columns for better positional play
      sortColumnsByCenterPreference(validCols);

      for (let col of validCols) {
        const nextGrid = copyBoard(grid);
        const r = getLowestEmptyRowInGrid(nextGrid, col);
        nextGrid[r][col] = 2; // AI move
        
        const newScore = minimax(nextGrid, depth - 1, alpha, beta, false).score;
        if (newScore > value) {
          value = newScore;
          bestCol = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break; // Pruning
      }
      return { score: value, column: bestCol };
    } else {
      let value = Infinity;
      let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
      
      sortColumnsByCenterPreference(validCols);

      for (let col of validCols) {
        const nextGrid = copyBoard(grid);
        const r = getLowestEmptyRowInGrid(nextGrid, col);
        nextGrid[r][col] = 1; // Human opponent
        
        const newScore = minimax(nextGrid, depth - 1, alpha, beta, true).score;
        if (newScore < value) {
          value = newScore;
          bestCol = col;
        }
        beta = Math.min(beta, value);
        if (alpha >= beta) break; // Pruning
      }
      return { score: value, column: bestCol };
    }
  }

  // Positional preference sorting (center is best)
  function sortColumnsByCenterPreference(cols) {
    const centerOrder = [3, 2, 4, 1, 5, 0, 6];
    cols.sort((a, b) => centerOrder.indexOf(a) - centerOrder.indexOf(b));
  }

  function getValidMoves() {
    const moves = [];
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === 0) moves.push(c);
    }
    return moves;
  }

  function getValidMovesInGrid(grid) {
    const moves = [];
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c] === 0) moves.push(c);
    }
    return moves;
  }

  function getLowestEmptyRowInGrid(grid, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === 0) return r;
    }
    return -1;
  }

  function copyBoard(src) {
    return src.map(row => [...row]);
  }

  // Heuristic scorer for leaf nodes
  function evaluateGridScore(grid) {
    let score = 0;

    // Center column preference evaluation (gives positional strength)
    const centerCol = 3;
    let centerCount = 0;
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][centerCol] === 2) centerCount++;
    }
    score += centerCount * 3.5;

    // Evaluate slices of 4 cells across the grid
    // 1. Horizontal slices
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        score += scoreSlice([grid[r][c], grid[r][c+1], grid[r][c+2], grid[r][c+3]]);
      }
    }

    // 2. Vertical slices
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        score += scoreSlice([grid[r][c], grid[r+1][c], grid[r+2][c], grid[r+3][c]]);
      }
    }

    // 3. Diagonal slices (Down-Right)
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        score += scoreSlice([grid[r][c], grid[r+1][c+1], grid[r+2][c+2], grid[r+3][c+3]]);
      }
    }

    // 4. Diagonal slices (Up-Right)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        score += scoreSlice([grid[r][c], grid[r-1][c+1], grid[r-2][c+2], grid[r-3][c+3]]);
      }
    }

    return score;
  }

  // Give heuristic values to slices of 4
  function scoreSlice(slice) {
    let score = 0;
    const aiCount = slice.filter(x => x === 2).length;
    const opponentCount = slice.filter(x => x === 1).length;
    const emptyCount = slice.filter(x => x === 0).length;

    if (aiCount === 4) {
      score += 1000;
    } else if (aiCount === 3 && emptyCount === 1) {
      score += 25;
    } else if (aiCount === 2 && emptyCount === 2) {
      score += 6;
    }

    if (opponentCount === 3 && emptyCount === 1) {
      score -= 80; // Hard block weight
    } else if (opponentCount === 2 && emptyCount === 2) {
      score -= 8;
    }

    return score;
  }

  /* ==========================================
     USER INTERACTIVE EVENT LISTENERS
     ========================================== */

  // Listen to column hovers clicked to make a move
  columnHoversContainer.addEventListener('click', (e) => {
    const colStr = e.target.getAttribute('data-col');
    if (colStr !== null) {
      const col = parseInt(colStr);
      makeMove(col);
    }
  });

  // Highlight board hover effects
  columnHoversContainer.addEventListener('mouseover', (e) => {
    const colStr = e.target.getAttribute('data-col');
    if (colStr !== null && !isGameOver && !isAiMoving) {
      // Find the cell slot that would receive the chip
      const col = parseInt(colStr);
      const row = getLowestEmptyRow(col);
      if (row !== -1) {
        const slot = boardGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        slot.style.backgroundColor = currentPlayer === 1 ? 'rgba(255, 62, 108, 0.15)' : 'rgba(0, 240, 255, 0.15)';
      }
    }
  });

  columnHoversContainer.addEventListener('mouseout', (e) => {
    const slots = boardGrid.querySelectorAll('.cell-slot');
    slots.forEach(slot => {
      slot.style.backgroundColor = '';
    });
  });

  // Mode Selection Toggle (Multiplayer vs AI)
  modeSelect.addEventListener('change', (e) => {
    gameMode = e.target.value;
    if (gameMode === 'pvp') {
      difficultyGroup.style.display = 'none';
      p2Label.textContent = 'PLAYER 2';
      p2TokenPreview.className = 'token-preview player-2-color';
    } else {
      difficultyGroup.style.display = 'flex';
      p2Label.textContent = 'COMPUTER AI';
      p2TokenPreview.className = 'token-preview player-2-color';
    }
    resetMatch();
  });

  // Difficulty Toggle
  difficultySelect.addEventListener('change', (e) => {
    aiDifficulty = e.target.value;
    resetMatch();
  });

  // Action Buttons
  btnRestart.addEventListener('click', resetRound);
  btnReset.addEventListener('click', resetMatch);
  
  // Close End Modal Overlay
  btnModalClose.addEventListener('click', () => {
    endModal.classList.remove('open');
    resetRound();
  });

  /* ==========================================
     START PLAYGROUND
     ========================================== */
  initBoardDOM();
  resetMatch();
});
