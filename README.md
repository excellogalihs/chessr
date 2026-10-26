# chessr

A personal opening-repertoire trainer. Paste a PGN, pick the side you play, and drill your moves
while chessr auto-plays the opponent's replies. Every variation in the PGN stays drillable.

## Features

- Variation-aware PGN import — builds one merged move tree from mainlines, sidelines and comments.
- White or Black repertoires, with automatic opponent replies.
- Interactive board with legal-move dots, drag or click moves, promotion picker, hints and arrows.
- Spaced review for positions that are due, plus normal training runs that walk random lines.
- Progress per position: mastery levels 0–5, streaks, due dates and simple session summaries.
- Line browser with search, board navigation and per-position recall details.
- Local-first: repertoires, stats and streak activity live in `localStorage`.

## Stack

Vite · React · TypeScript · chess.js

## Run locally

```bash
bun install
bun run dev
```

The dev server prints its local URL (normally `http://localhost:5173`).

## Checks

```bash
bun run typecheck
bun run build
bun run preview
```

## PGN notes

PGN comments are preserved as position notes. Engine directives such as `[%clk ...]` and
`[%eval ...]` are stripped when the PGN is parsed. Click the **Italian · White** or
**Caro-Kann · Black** sample in the import dialog to try the trainer immediately.

## Project layout

- `src/components` — board, dashboard, trainer, browser, import and dialog UI.
- `src/lib/chess.ts` — PGN parser, move tree helpers, spaced-repetition and stats logic.
- `src/lib/storage.ts` — localStorage persistence and daily activity.
- `src/styles` — base design system plus dashboard, trainer and browser styles.
