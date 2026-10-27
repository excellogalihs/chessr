export type Color = 'w' | 'b';

export interface MoveNode {
  san: string;
  fen: string;
  ply: number;
  key: string;
  uci: string | null;
  parent: MoveNode | null;
  children: MoveNode[];
  comment?: string;
  nags: string[];
  /** True when this node is the final move of at least one line in the PGN. */
  isLineEnd?: boolean;
}

export interface ParsedGame {
  root: MoveNode;
  moves: number;
  games: number;
  leaves: number;
  event?: string;
  opening?: string;
  errors: string[];
}

export interface PositionStat {
  seen: number;
  streak: number;
  level: number;
  lastSeen: number | null;
  dueAt: number | null;
}

export interface Repertoire {
  id: string;
  name: string;
  color: Color;
  pgn: string;
  opening?: string;
  createdAt: number;
  updatedAt: number;
  lastTrainedAt: number | null;
  sessions: number;
  stats: Record<string, PositionStat>;
}

export interface QuizPosition {
  node: MoveNode;
  moves: MoveNode[];
}

export type SessionMode = 'train' | 'review';

export interface ReviewTarget {
  key: string;
  node: MoveNode;
  moves: MoveNode[];
}

export interface SessionSummary {
  answered: number;
  bestStreak: number;
  durationMs: number;
}
