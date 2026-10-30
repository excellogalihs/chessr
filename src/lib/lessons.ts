import type { Lesson } from './types';

/**
 * The chessr learning path — a sequence of bite-size lessons for players who
 * are new to chess. Every quiz step shows a real position on the board and
 * waits for the player to make the taught move themselves, the same way the
 * repertoire trainer drills opening moves.
 */
export const LESSONS: Lesson[] = [
  {
    id: 'pieces',
    title: 'How the pieces move',
    tagline: 'Meet your army piece by piece.',
    steps: [
      {
        type: 'intro',
        id: 'p-intro',
        title: 'Welcome to the board',
        body: [
          'Chess is a game of two armies of 16 pieces. Your goal is simple: trap the enemy king so it cannot escape — that is checkmate.',
          'You will learn how every piece moves, one piece at a time. Each lesson ends with a small quiz where you play the move on the board yourself.',
        ],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      },
      {
        type: 'quiz',
        id: 'p-rook',
        title: 'The rook: straight lines',
        body: [
          'The rook moves in straight lines — any number of squares horizontally or vertically.',
          'It can never move diagonally. Rooks are powerful in open positions, especially along files and ranks.',
        ],
        fen: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1',
        answerFrom: 'a1',
        answerTo: 'a5',
        answerSan: 'Ra5',
        hint: 'The rook travels in straight lines: along a file or a rank.',
      },
      {
        type: 'quiz',
        id: 'p-bishop',
        title: 'The bishop: long diagonals',
        body: [
          'The bishop moves diagonally, any number of squares.',
          'Bishops are long-range pieces that love open diagonals. There are two of them, one per colour.',
        ],
        fen: '4k3/8/8/8/8/8/8/2B3K1 w - - 0 1',
        answerFrom: 'c1',
        answerTo: 'g5',
        answerSan: 'Bg5',
        hint: 'The bishop moves on diagonals only.',
      },
      {
        type: 'quiz',
        id: 'p-queen',
        title: 'The queen: everything together',
        body: [
          'The queen moves like both the rook and the bishop combined — straight lines and diagonals.',
          'She is the most powerful piece on the board, which is why she is also a common early target.',
        ],
        fen: '4k3/8/8/8/8/8/8/3Q2K1 w - - 0 1',
        answerFrom: 'd1',
        answerTo: 'h5',
        answerSan: 'Qh5+',
        hint: 'The queen moves like a rook and a bishop at the same time.',
      },
      {
        type: 'quiz',
        id: 'p-knight',
        title: 'The knight: the L',
        body: [
          'The knight moves in an L-shape: two squares one way, then one square sideways.',
          'Unlike other pieces it can jump over other pieces.',
        ],
        fen: '4k3/8/8/8/8/5N2/8/6K1 w - - 0 1',
        answerFrom: 'f3',
        answerTo: 'd4',
        answerSan: 'Nd4',
        hint: 'The knight travels in an L: two steps one way, one step perpendicular.',
      },
      {
        type: 'quiz',
        id: 'p-pawn',
        title: 'The pawn: slow and steady',
        body: [
          'Pawns move forward one square at a time, or two from their starting squares.',
          'They never move backwards, and they capture diagonally only.',
        ],
        fen: '4k3/8/8/8/8/8/4P3/6K1 w - - 0 1',
        answerFrom: 'e2',
        answerTo: 'e4',
        answerSan: 'e4',
        hint: 'Pawns move forward (one or two squares from the start) and capture diagonally.',
      },
      {
        type: 'quiz',
        id: 'p-pawn-capture',
        title: 'Capturing with pawns',
        body: [
          'Pawns capture by moving diagonally forward onto an enemy piece.',
          'That is how pawns take part in the fight — and how they promote when they reach the other side.',
        ],
        fen: '4k3/8/8/3p4/4P3/8/8/6K1 w - - 0 1',
        answerFrom: 'e4',
        answerTo: 'd5',
        answerSan: 'exd5',
        hint: 'Pawns capture diagonally, one square forward at an angle.',
      },
    ],
  },
  {
    id: 'checkmate',
    title: 'Checkmate & special moves',
    tagline: 'Finish the game and stay safe.',
    steps: [
      {
        type: 'intro',
        id: 'c-intro',
        title: 'How games end',
        body: [
          'Checkmate wins the game: the king is attacked and has no safe square to move to.',
          'Castling is the only move where two pieces move at once — the king jumps two squares towards the rook, and the rook jumps over it.',
        ],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      },
      {
        type: 'quiz',
        id: 'c-castle',
        title: 'Castling in one move',
        body: [
          'Castling moves the king two squares towards a rook and puts the rook on the square the king crossed.',
          'It keeps your king safe and brings a rook into the game.',
        ],
        fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
        answerFrom: 'e1',
        answerTo: 'g1',
        answerSan: 'O-O',
        hint: 'Castle towards the rook on the h-file: king e1 to g1.',
      },
      {
        type: 'quiz',
        id: 'c-mate',
        title: 'Checkmate ends everything',
        body: [
          'Checkmate is the end of the game, and it usually comes from a direct attack on the king.',
          'A classic pattern: the enemy king is stuck behind its own pawns on the back rank — a rook or queen delivers the final blow.',
        ],
        fen: '6k1/5ppp/8/8/8/8/8/3RK3 w - - 0 1',
        answerFrom: 'd1',
        answerTo: 'd8',
        answerSan: 'Rd8#',
        hint: 'The black king is trapped behind its own pawns on the back rank — slide the rook to the 8th rank for checkmate.',
      },
    ],
  },
  {
    id: 'principles',
    title: 'Basic principles',
    tagline: 'Play good moves from move one.',
    steps: [
      {
        type: 'intro',
        id: 'pr-intro',
        title: 'The three habits of good play',
        body: [
          'Before every move ask: does it control the centre, develop a piece, and keep the king safe?',
          'Small good habits early in the game save you from whole bad middlegames.',
        ],
      },
      {
        type: 'quiz',
        id: 'pr-centre',
        title: 'Control the centre',
        body: [
          'The centre squares (d4, e4, d5, e5) matter most. A central pawn also opens lines for your other pieces.',
          'Your first big move is often to push a centre pawn.',
        ],
        fen: '4k3/8/8/8/8/8/4P3/6K1 w - - 0 1',
        answerFrom: 'e2',
        answerTo: 'e4',
        answerSan: 'e4',
        hint: 'Push the pawn on e2 towards e4 to stake a claim in the centre.',
      },
      {
        type: 'quiz',
        id: 'pr-develop',
        title: 'Develop a piece',
        body: [
          'Bring out knights and bishops before moving the same expensive piece twice or rushing the queen.',
          'A developed piece is a piece that can fight for the centre.',
        ],
        fen: '4k3/8/8/8/8/8/8/1N1Q2K1 w - - 0 1',
        answerFrom: 'b1',
        answerTo: 'c3',
        answerSan: 'Nc3',
        hint: 'Develop the knight from b1 to c3 — a natural, quiet developing move.',
      },
    ],
  },
  {
    id: 'tactics',
    title: 'Simple tactics',
    tagline: 'Spot the quick wins.',
    steps: [
      {
        type: 'intro',
        id: 't-intro',
        title: 'What is a tactic?',
        body: [
          'Tactics are short sequences of moves that win material or force checkmate — usually in just a few moves.',
          'The three building blocks every beginner should know: forks, free captures, and simple checkmates.',
        ],
      },
      {
        type: 'quiz',
        id: 't-fork',
        title: 'The fork',
        body: [
          'A fork is a double attack: one piece threatens two targets at once, so the defender can only save one.',
          'The queen can fork the king and a rook.',
        ],
        fen: '4r3/8/2k5/8/3Q4/8/8/6K1 w - - 0 1',
        answerFrom: 'd4',
        answerTo: 'e4',
        answerSan: 'Qe4+',
        hint: 'Move the queen to e4 — it will attack the black king and the rook on the e-file at the same time.',
      },
      {
        type: 'quiz',
        id: 't-free',
        title: 'The free capture',
        body: [
          'If a piece is attacked and undefended, take it. That is the simplest winning tactic there is.',
          'Before every move, ask: is anything hanging?',
        ],
        fen: '4r3/6k1/8/8/Q7/8/8/6K1 w - - 0 1',
        answerFrom: 'a4',
        answerTo: 'e8',
        answerSan: 'Qxe8',
        hint: 'The black rook on e8 is undefended — take it.',
      },
      {
        type: 'quiz',
        id: 't-discovered',
        title: 'The discovered attack',
        body: [
          'Moving one piece can unleash an attack from another piece that was previously blocked.',
          'A discovered check is one of the most powerful tricks in chess.',
        ],
        fen: 'R7/8/8/6k1/5B2/8/3Q4/6K1 w - - 0 1',
        answerFrom: 'f4',
        answerTo: 'g3',
        answerSan: 'Bg3+',
        hint: 'Move the bishop off the d2-g5 diagonal — the queen behind it will suddenly give check.',
      },
    ],
  },
];
