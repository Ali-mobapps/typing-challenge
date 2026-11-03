# Typing Challenge (CSC336 Web Technologies - Lab Mid)

Name: Ali Hassan
Reg. No: FA24-BSE-013

## How to run
Open `index.html` in any modern browser. No installation or internet needed.

## Modes
- **Bubbles** - press the letter shown in a rising bubble (or tap it). Wrong key = penalty. Game ends at the miss limit. Speed and bubble count rise with level (depth).
- **KeyMagnet** - press the highlighted target key. Choose a key set (home row, top row, bottom row, all letters). Tracks correct, incorrect and response time.

## Difficulty
| Level  | Bubble speed | Miss limit | Penalty | KeyMagnet time | Per-key limit |
|--------|--------------|------------|---------|----------------|---------------|
| Easy   | 60           | 8          | 1       | 60 s           | none          |
| Medium | 95           | 6          | 2       | 45 s           | 3 s           |
| Hard   | 140          | 5          | 3       | 30 s           | 1.8 s         |

## Controls
Start, Restart, Reset (no page reload). Theme button cycles 4 themes. Sound toggle.

## Files
- `index.html` - structure
- `css/style.css` - styling, themes (CSS variables), responsive layout
- `js/script.js` - game logic (all timers cleared by `stopAll()`)
