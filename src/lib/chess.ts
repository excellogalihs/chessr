import { Chess } from 'chess.js';
import type { Color, MoveNode, ParsedGame, PositionStat, QuizPosition, ReviewTarget, Repertoire } from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const DAY = 24 * 60 * 60 * 1000;

const GLYPH_NAGS: Record<string, string> = {
  '!': '$1',
  '?': '$2',
  '!!': '$3',
  '??': '$4',
  '!?': '$5',
  '?!': '$6',
};

export function turnOf(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function sideName(color: Color): string {
  return color === 'w' ? 'White' : 'Black';
}

export function otherColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function makeRoot(): MoveNode {
  return {
    san: '',
    fen: START_FEN,
    ply: 0,
    key: '',
    uci: null,
    parent: null,
    children: [],
    nags: [],
  };
}

function cleanComment(raw: string): string {
  return raw
    .replace(/\[%[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A variation-aware PGN parser. It builds one merged tree from every game in
 * the PGN, which is exactly what a repertoire is: a set of branching lines.
 */
export function parsePgn(input: string): ParsedGame {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const root = makeRoot();
  const errors: string[] = [];

  let chess = new Chess();
  let current: MoveNode = root;
  let last: MoveNode | null = null;
  let gameHadMoves = false;
  let broken = false;
  let brokenDepth = -1;
  let moves = 0;
  let games = 0;
  let gameIndex = 1;
  let event: string | undefined;
  let opening: string | undefined;

  const stack: { chess: Chess; current: MoveNode; last: MoveNode | null }[] = [];

  // A "line" in the PGN is not necessarily a leaf of the merged tree: a short
  // line can end at a position that another line continues from. Remember
  // every real line ending so the trainer can drill each one to its own end.
  const markLineEnd = (node: MoveNode | null) => {
    if (!broken && node && node.ply > 0) node.isLineEnd = true;
  };

  const resetGame = (countGame: boolean) => {
    if (countGame && gameHadMoves) {
      games += 1;
      gameIndex += 1;
    }
    chess = new Chess();
    current = root;
    last = null;
    gameHadMoves = false;
    broken = false;
    brokenDepth = -1;
    stack.length = 0;
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (ch === undefined) break;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '{') {
      const end = text.indexOf('}', i + 1);
      const raw = text.slice(i + 1, end === -1 ? text.length : end);
      const comment = cleanComment(raw);
      if (comment) {
        if (last) {
          last.comment = last.comment ? `${last.comment} ${comment}` : comment;
        } else {
          root.comment = root.comment ? `${root.comment} ${comment}` : comment;
        }
      }
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    if (ch === ';') {
      const end = text.indexOf('\n', i + 1);
      const comment = cleanComment(text.slice(i + 1, end === -1 ? text.length : end));
      if (comment && last) {
        last.comment = last.comment ? `${last.comment} ${comment}` : comment;
      }
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    if (ch === '[') {
      const end = text.indexOf(']', i + 1);
      const raw = text.slice(i + 1, end === -1 ? text.length : end);
      i = end === -1 ? text.length : end + 1;

      // A new header block after moves means a new game even if the previous
      // game forgot its result token.
      if (gameHadMoves) {
        markLineEnd(last);
        resetGame(true);
      }

      const header = raw.match(/^\s*(\w+)\s+"((?:[^"\\]|\\.)*)"\s*$/s);
      if (!header) continue;
      const [, tag, value] = header;
      if (tag === 'Event' && value && value !== '?' && !event) event = value;
      if (tag === 'Opening' && value && value !== '?' && !opening) opening = value;
      if (tag === 'Variation' && value && value !== '?') {
        opening = opening ? `${opening}: ${value}` : value;
      }
      continue;
    }

    if (ch === '(') {
      i += 1;
      if (!last) continue;
      stack.push({ chess, current, last });
      const before = last.parent ?? root;
      chess = new Chess(before.fen);
      current = before;
      last = null;
      continue;
    }

    if (ch === ')') {
      i += 1;
      // The move before a closing parenthesis is the end of that variation's
      // line, even when the merged tree has children there from other lines.
      markLineEnd(last);
      const state = stack.pop();
      if (state) {
        chess = state.chess;
        current = state.current;
        last = state.last;
      }
      // A bad move inside a variation should only discard that variation; the
      // mainline (or an enclosing variation) can still be imported.
      if (broken && stack.length < brokenDepth) {
        broken = false;
        brokenDepth = -1;
      }
      continue;
    }

    if (ch === '$') {
      i += 1;
      let j = i;
      while (j < text.length && /\d/.test(text[j] ?? '')) j += 1;
      if (j > i && last) last.nags.push(`$${text.slice(i, j)}`);
      i = j;
      continue;
    }

    // Read a whitespace/comment/paren-delimited token.
    let j = i;
    while (j < text.length && !/[\s(){}[\];$]/.test(text[j] ?? '')) j += 1;
    let token = text.slice(i, j);
    i = j;

    if (!token) continue;

    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      markLineEnd(last);
      resetGame(true);
      continue;
    }

    // Move numbers can be glued to the move: "1.e4", "12...Nf3".
    token = token.replace(/^\d+\.(?:\.\.)?/, '');
    if (!token) continue;

    if (token === '...' || token === '..' || token === '.') continue;
    if (token === '--' || token === 'Z0') continue;

    token = token
      .replace(/0-0-0/g, 'O-O-O')
      .replace(/0-0/g, 'O-O')
      .replace(/^\.+/, '')
      .replace(/…/g, '...');

    if (!token) continue;

    if (broken) continue;

    const nagMatch = token.match(/[!?]+$/);
    let nags: string[] = [];
    if (nagMatch) {
      const glyph = nagMatch[0];
      const nag = GLYPH_NAGS[glyph];
      if (nag) nags = [nag];
      token = token.slice(0, -glyph.length);
    }

    // Normalise rare promotion spellings: e8Q -> e8=Q
    token = token.replace(/^([a-h][18])([QRBN])$/, '$1=$2');

    if (!token) continue;

    let move;
    try {
      move = chess.move(token);
    } catch {
      errors.push(
        `Illegal or unreadable move "${token}" in game ${gameIndex} (after ${current.ply} plies).`,
      );
      broken = true;
      brokenDepth = stack.length;
      continue;
    }

    if (!move) continue;

    let child = current.children.find((c) => c.san === move.san);
    if (!child) {
      child = {
        san: move.san,
        fen: chess.fen(),
        ply: current.ply + 1,
        key: current.key ? `${current.key} ${move.san}` : move.san,
        uci: `${move.from}${move.to}${move.promotion ?? ''}`,
        parent: current,
        children: [],
        nags,
      };
      current.children.push(child);
      moves += 1;
    } else if (nags.length) {
      for (const nag of nags) if (!child.nags.includes(nag)) child.nags.push(nag);
    }

    current = child;
    last = child;
    gameHadMoves = true;
  }

  if (gameHadMoves) {
    markLineEnd(last);
    games += 1;
  }

  if (moves === 0 && errors.length === 0) {
    errors.push('No moves found. Paste a PGN with at least one move.');
  }

  return {
    root,
    moves,
    games,
    leaves: countLeaves(root),
    event,
    opening,
    errors,
  };
}

export function countLeaves(root: MoveNode): number {
  return allLeaves(root).length;
}

export function countMoves(node: MoveNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countMoves(child), 0);
}

export function pathTo(node: MoveNode): MoveNode[] {
  const path: MoveNode[] = [];
  let cursor: MoveNode | null = node;
  while (cursor && cursor.parent) {
    path.unshift(cursor);
    cursor = cursor.parent;
  }
  return path;
}

/**
 * Positions on one specific PGN line where the user has to make a move.
 * The line's final position is excluded, because there is no repertoire move
 * to recall after the line has ended.
 */
export function lineQuizPositions(leaf: MoveNode, color: Color): MoveNode[] {
  const positions: MoveNode[] = [];
  let cursor: MoveNode | null = leaf;
  while (cursor && cursor.parent) {
    const before: MoveNode = cursor.parent;
    if (turnOf(before.fen) === color && before.children.length > 0) {
      positions.unshift(before);
    }
    cursor = before;
  }
  return positions;
}

/**
 * Every PGN line end, in tree order. A line can end before a branch point, so
 * this is not the same thing as the childless leaves of the merged tree.
 */
export function allLeaves(root: MoveNode): MoveNode[] {
  const found: MoveNode[] = [];
  const walk = (node: MoveNode) => {
    if (node.ply > 0 && (node.isLineEnd || node.children.length === 0)) {
      found.push(node);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return found;
}

export function quizPositions(root: MoveNode, color: Color): QuizPosition[] {
  const positions: QuizPosition[] = [];
  const walk = (node: MoveNode) => {
    if (node.children.length > 0 && turnOf(node.fen) === color) {
      positions.push({ node, moves: node.children });
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return positions;
}

export function statsKey(node: MoveNode): string {
  return node.key;
}

export function emptyStat(): PositionStat {
  return {
    seen: 0,
    streak: 0,
    level: 0,
    lastSeen: null,
    dueAt: null,
  };
}

export function intervalForLevel(level: number): number {
  const days = [0, 1, 3, 7, 16, 35];
  return (days[Math.max(0, Math.min(5, level))] ?? 0) * DAY;
}

export function recordCorrect(stat: PositionStat, firstTry: boolean, now = Date.now()): PositionStat {
  const level = firstTry ? Math.min(5, stat.level + 1) : Math.max(1, Math.min(stat.level, 2));
  return {
    ...stat,
    seen: stat.seen + 1,
    streak: firstTry ? stat.streak + 1 : 0,
    level,
    lastSeen: now,
    dueAt: now + (firstTry ? Math.max(5 * 60 * 1000, intervalForLevel(level)) : DAY),
  };
}

export function recordWrong(stat: PositionStat, now = Date.now()): PositionStat {
  return {
    ...stat,
    streak: 0,
    level: Math.max(0, stat.level - 1),
    lastSeen: now,
    dueAt: now + 5 * 60 * 1000,
  };
}

export function isDue(stat: PositionStat | undefined, now = Date.now()): boolean {
  if (!stat || stat.seen === 0) return true;
  return stat.dueAt === null || stat.dueAt <= now;
}

export function duePositions(
  root: MoveNode,
  color: Color,
  stats: Record<string, PositionStat>,
  now = Date.now(),
): ReviewTarget[] {
  return quizPositions(root, color)
    .filter((position) => isDue(stats[position.node.key], now))
    .map((position) => ({ key: position.node.key, node: position.node, moves: position.moves }));
}

export function masteryOf(positions: QuizPosition[], stats: Record<string, PositionStat>): number {
  if (positions.length === 0) return 0;
  const total = positions.reduce((sum, position) => {
    const stat = stats[position.node.key];
    return sum + (stat?.level ?? 0);
  }, 0);
  return Math.round((total / (positions.length * 5)) * 100);
}

export function repertoireStats(rep: Repertoire, root: MoveNode, now = Date.now()) {
  const positions = quizPositions(root, rep.color);
  const stats = rep.stats;
  let due = 0;
  let mastered = 0;
  for (const position of positions) {
    const stat = stats[position.node.key];
    if (stat && stat.level >= 3) mastered += 1;
    if (isDue(stat, now)) due += 1;
  }
  return {
    positions: positions.length,
    due,
    mastered,
    mastery: masteryOf(positions, stats),
  };
}

export function formatRelative(timestamp: number | null): string {
  if (!timestamp) return 'Not trained yet';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function moveLabel(node: MoveNode): string {
  const moveNumber = Math.ceil(node.ply / 2);
  return `${moveNumber}${node.ply % 2 === 1 ? '.' : '...'} ${node.san}`;
}

export function positionLabel(node: MoveNode): string {
  const side = turnOf(node.fen);
  const moveNumber = Math.floor(node.ply / 2) + 1;
  return `${sideName(side)} to move · move ${moveNumber}`;
}

export function lineSnippet(node: MoveNode, length = 5): string {
  const path = pathTo(node).slice(-length);
  if (path.length === 0) return 'Starting position';
  return path
    .map((move) => `${Math.ceil(move.ply / 2)}${move.ply % 2 === 1 ? '.' : '…'}${move.san}`)
    .join(' ');
}

export function turnLabel(node: MoveNode): string {
  return turnOf(node.fen) === 'w' ? 'White to move' : 'Black to move';
}

export function formatDue(timestamp: number | null): string {
  if (!timestamp) return 'New position';
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Due now';
  const minutes = Math.ceil(diff / 60_000);
  if (minutes < 60) return `Due in ${minutes}m`;
  const hours = Math.ceil(diff / 3_600_000);
  if (hours < 24) return `Due in ${hours}h`;
  return `Due in ${Math.ceil(diff / 86_400_000)}d`;
}
