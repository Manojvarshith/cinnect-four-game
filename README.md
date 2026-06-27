# Quantum Connect Four

Quantum Connect Four is a modern, responsive, and visually stunning web implementation of the classic Connect Four game. Designed with a premium dark neon theme, it offers a smooth, glassmorphic layout, fluid falling-chip animations, and score tracking.

Play locally with a friend or test your skills against a highly tactical Minimax AI opponent.

---

## ✨ Features

- **Double Game Modes**:
  - **VS Computer AI**: Play single-player against the computer.
  - **Local Multiplayer**: Challenge a friend sitting next to you.
- **Three AI Intellect Levels**:
  - **Novice**: Perfect for casual practice (mixes random moves with simple wins/blocks).
  - **Warrior**: Highly analytical depth-3 Minimax agent.
  - **Master**: Advanced depth-5 Minimax agent utilizing Alpha-Beta Pruning and center-column positional heuristics.
- **Premium Styling**:
  - Harmonious, HSL-tailored neon glow aesthetics.
  - Responsive layout optimized for desktop, tablets, and mobile screens.
  - Glassmorphic panels with blur backdrop filters.
- **Fluid Micro-Animations**:
  - Satisfying CSS physics-based drop animations for falling tokens.
  - Glowing pulse transitions for highlighting the winning combination of 4 chips.
  - High-end trophy winner overlay dialog.
- **Scoreboard Memory**: Keeps count of Player 1, Player 2/AI, and Draw scores during the match.

---

## 🛠️ Technical Stack

- **Frontend Core**: Semantic HTML5 & Javascript (ES6+).
- **Styling**: Vanilla CSS3 (Custom grid architecture, HSL palettes, drop-shadow glow filters).
- **Icons**: Lucide Icons CDN.
- **Typography**: Google Fonts (Orbitron for sci-fi statistics; Outfit for modern UI labels).

---

## 📂 Project Structure

```
connect-four/
├── .gitignore         # Ignores IDE files and logs
├── index.html         # Main app markup & DOM containers
├── style.css          # Glassmorphic layouts, neon glows & animations
├── script.js          # Main board engine, score memory, and Minimax AI
└── README.md          # Project instructions & specifications
```

---

## 🚀 How to Play

1. **Objective**: Be the first player to connect four of your colored tokens in a row (horizontally, vertically, or diagonally).
2. **Dropping Chips**: Click on any of the seven columns. The chip will drop down to the lowest empty slot in that column.
3. **Turn Indicator**: Look at the active player glowing card at the top to see whose turn it is.
4. **Win Notification**: Once a player gets 4-in-a-row, the winning tokens will pulse and glow, and the victory card overlay will display. Click **Play Again** to start a new round while keeping the scoreboard scores!
