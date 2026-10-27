import {
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { pieceSrc } from '../lib/assets';

export interface BoardMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

interface Arrow {
  from: string;
  to: string;
  tone?: 'gold' | 'mint';
}

interface ChessBoardProps {
  fen: string;
  orientation: Color;
  interactive?: boolean;
  movableColor?: Color;
  lastMove?: { from: string; to: string } | null;
  hintSquare?: string | null;
  arrow?: Arrow | null;
  shakeSignal?: number;
  className?: string;
  onMove?: (move: BoardMove) => void;
  onIllegal?: () => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const FALLBACK_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

function squareName(fileIndex: number, rankIndex: number): Square {
  return `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square;
}

function isLightSquare(fileIndex: number, rankIndex: number): boolean {
  return (fileIndex + rankIndex) % 2 === 1;
}

export function ChessBoard({
  fen,
  orientation,
  interactive = false,
  movableColor,
  lastMove,
  hintSquare,
  arrow,
  shakeSignal = 0,
  className = '',
  onMove,
  onIllegal,
}: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: Color } | null>(null);
  const [shaking, setShaking] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);
  const droppedByDragRef = useRef(false);
  const prevPiecesRef = useRef<Map<string, { color: Color; type: PieceSymbol }> | null>(null);
  const markerId = useId().replace(/:/g, '');

  const chess = useMemo(() => {
    try {
      return new Chess(fen || FALLBACK_FEN);
    } catch {
      return new Chess(FALLBACK_FEN);
    }
  }, [fen]);

  const legalMoves = useMemo<Move[]>(() => {
    if (!selected) return [];
    try {
      return chess.moves({ square: selected, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selected]);

  const legalTargets = useMemo(() => {
    const map = new Map<string, Move[]>();
    for (const move of legalMoves) {
      const list = map.get(move.to) ?? [];
      list.push(move);
      map.set(move.to, list);
    }
    return map;
  }, [legalMoves]);

  const boardPieces = useMemo(() => {
    const rows = chess.board();
    const map = new Map<string, { color: Color; type: PieceSymbol }>();
    rows.forEach((row, rowIndex) => {
      row.forEach((piece, fileIndex) => {
        if (!piece) return;
        const rankIndex = 7 - rowIndex;
        map.set(squareName(fileIndex, rankIndex), { color: piece.color, type: piece.type });
      });
    });
    return map;
  }, [chess]);

  const checkSquare = useMemo(() => {
    if (!chess.isCheck()) return null;
    for (const [square, piece] of boardPieces) {
      if (piece.type === 'k' && piece.color === chess.turn()) return square;
    }
    return null;
  }, [chess, boardPieces]);

  useEffect(() => {
    setSelected(null);
    setPromotion(null);
  }, [fen]);

  useEffect(() => {
    if (!shakeSignal) return;
    setShaking(true);
    const timer = window.setTimeout(() => setShaking(false), 440);
    return () => window.clearTimeout(timer);
  }, [shakeSignal]);

  // Slide the moved piece from its origin square (click moves, opponent moves).
  useLayoutEffect(() => {
    const prev = prevPiecesRef.current;
    prevPiecesRef.current = boardPieces;
    const fromDrag = droppedByDragRef.current;
    droppedByDragRef.current = false;
    if (!prev || fromDrag || !lastMove || !boardRef.current) return;
    const moved = boardPieces.get(lastMove.to);
    const was = prev.get(lastMove.from);
    if (!moved || !was || was.color !== moved.color || boardPieces.get(lastMove.from)) return;
    const board = boardRef.current;
    const toEl = board.querySelector<HTMLElement>(`[data-square="${lastMove.to}"]`);
    const fromEl = board.querySelector<HTMLElement>(`[data-square="${lastMove.from}"]`);
    const img = toEl?.querySelector<HTMLElement>('.piece');
    if (!toEl || !fromEl || !img || typeof img.animate !== 'function') return;
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    const distance = Math.hypot(dx, dy) / Math.max(1, b.width);
    toEl.classList.add('is-animating');
    const anim = img.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
      { duration: Math.min(190, 110 + distance * 14), easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)' },
    );
    const done = () => toEl.classList.remove('is-animating');
    anim.onfinish = done;
    anim.oncancel = done;
  }, [boardPieces, lastMove?.from, lastMove?.to]);

  const turn = chess.turn();
  const canGrab = (pieceColor: Color | undefined): boolean =>
    interactive &&
    !!pieceColor &&
    pieceColor === turn &&
    (movableColor ? pieceColor === movableColor : true);

  const emit = (from: Square, to: Square, promo?: PieceSymbol) => {
    setSelected(null);
    setPromotion(null);
    onMove?.({ from, to, promotion: promo });
  };

  const attempt = (from: Square, to: Square) => {
    if (!interactive || from === to) {
      setSelected(null);
      return;
    }
    let moves: Move[] = [];
    try {
      moves = chess.moves({ square: from, verbose: true });
    } catch {
      moves = [];
    }
    const candidates = moves.filter((move) => move.to === to);
    if (candidates.length === 0) {
      setSelected(null);
      onIllegal?.();
      return;
    }
    if (candidates.some((move) => move.promotion)) {
      setSelected(from);
      setPromotion({ from, to, color: candidates[0]?.color ?? turn });
      return;
    }
    emit(from, to);
  };

  const canMoveTo = (from: Square, to: Square): boolean => {
    try {
      return chess.moves({ square: from, verbose: true }).some((move) => move.to === to);
    } catch {
      return false;
    }
  };

  const onSquareClick = (square: Square) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!interactive) return;
    const piece = boardPieces.get(square);
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (canGrab(piece?.color) && !legalTargets.has(square)) {
        setSelected(square);
        return;
      }
      attempt(selected, square);
      return;
    }
    if (canGrab(piece?.color)) setSelected(square);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, square: Square) => {
    if (!interactive || !event.isPrimary || event.button !== 0 || cleanupDragRef.current) return;
    const piece = boardPieces.get(square);
    if (!piece || !canGrab(piece.color)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const sourcePiece = event.currentTarget.querySelector<HTMLImageElement>('.piece');
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const startX = event.clientX;
    const startY = event.clientY;
    const ghostSize = rect.width;
    const ghostSrc = pieceSrc(piece.color, piece.type);

    let active = false;
    let done = false;
    let hover: Square | null = null;
    let ghost: HTMLDivElement | null = null;
    let frame = 0;
    let settleTimer = 0;
    let pendingX = 0;
    let pendingY = 0;

    const squareAt = (x: number, y: number): Square | null => {
      const element = document.elementFromPoint(x, y);
      const target = element?.closest<HTMLElement>('.square');
      if (!target || !boardRef.current?.contains(target)) return null;
      const name = target.dataset.square;
      return name ? (name as Square) : null;
    };

    const setHover = (target: Square | null) => {
      if (hover === target) return;
      if (hover) {
        boardRef.current?.querySelector(`[data-square="${hover}"]`)?.classList.remove('drag-hover');
      }
      hover = target;
      if (target) {
        boardRef.current?.querySelector(`[data-square="${target}"]`)?.classList.add('drag-hover');
      }
    };

    const paintGhost = () => {
      if (!ghost) return;
      ghost.style.transform = `translate3d(${pendingX - offsetX}px, ${pendingY - offsetY}px, 0)`;
    };

    const positionGhost = (x: number, y: number) => {
      pendingX = x;
      pendingY = y;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        paintGhost();
        setHover(squareAt(pendingX, pendingY));
      });
    };

    const startGhost = (x: number, y: number) => {
      active = true;
      pendingX = x;
      pendingY = y;
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.style.width = `${ghostSize}px`;
      ghost.style.height = `${ghostSize}px`;
      const image = document.createElement('img');
      image.src = ghostSrc;
      image.alt = '';
      image.draggable = false;
      ghost.appendChild(image);
      document.body.appendChild(ghost);
      paintGhost();
      document.body.classList.add('is-dragging-piece');
      if (sourcePiece) sourcePiece.style.opacity = '0';
    };

    const restore = () => {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      setHover(null);
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      if (sourcePiece) sourcePiece.style.opacity = '';
      document.body.classList.remove('is-dragging-piece');
    };

    const removeListeners = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);
    };

    const finish = (x: number | null, y: number | null) => {
      if (done) return;
      done = true;
      const target = x === null || y === null ? null : squareAt(x, y);
      removeListeners();
      if (!active) {
        cleanupDragRef.current = null;
        return;
      }

      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      const wantsMove = !!target && target !== square && canMoveTo(square, target);
      const targetElement =
        wantsMove && target
          ? boardRef.current?.querySelector<HTMLElement>(`[data-square="${target}"]`)
          : null;
      const destination = targetElement?.getBoundingClientRect() ?? rect;

      const drop = () => {
        cleanupDragRef.current = null;
        if (wantsMove && target) {
          droppedByDragRef.current = true;
          attempt(square, target);
        } else {
          if (target && target !== square && interactive) onIllegal?.();
          setSelected(square);
        }
        restore();
      };

      if (!ghost || wantsMove) {
        // Legal drop: snap instantly, like chess.com.
        drop();
        return;
      }

      // Keep the piece under the cursor for its last frame, then glide it into
      // the drop square (or back home when the drop is not a legal move).
      ghost.style.transition = 'none';
      ghost.style.transform = `translate3d(${(x ?? pendingX) - offsetX}px, ${(y ?? pendingY) - offsetY}px, 0)`;
      void ghost.offsetWidth;
      ghost.style.transition = 'transform 110ms cubic-bezier(0.22, 0.85, 0.3, 1)';
      ghost.style.transform = `translate3d(
        ${destination.left + (destination.width - ghostSize) / 2}px,
        ${destination.top + (destination.height - ghostSize) / 2}px,
        0
      )`;
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        drop();
      }, 110);
    };

    function onPointerMove(moveEvent: PointerEvent) {
      if (!moveEvent.isPrimary) return;
      if (!active) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (dx * dx + dy * dy < 25) return;
        startGhost(moveEvent.clientX, moveEvent.clientY);
      }
      moveEvent.preventDefault();
      positionGhost(moveEvent.clientX, moveEvent.clientY);
    }

    function onPointerUp(upEvent: PointerEvent) {
      if (!upEvent.isPrimary) return;
      finish(upEvent.clientX, upEvent.clientY);
    }

    function onPointerCancel() {
      finish(null, null);
    }

    function onWindowBlur() {
      finish(null, null);
    }

    cleanupDragRef.current = () => {
      if (!done) {
        done = true;
        removeListeners();
      }
      cleanupDragRef.current = null;
      restore();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onWindowBlur);
  };

  useEffect(
    () => () => {
      cleanupDragRef.current?.();
    },
    [],
  );

  const ranks = orientation === 'w' ? [...RANKS].reverse() : RANKS;
  const files = orientation === 'w' ? FILES : [...FILES].reverse();

  const coordsFor = (file: string, rank: string) => {
    const rankIndex = RANKS.indexOf(rank);
    const fileIndex = FILES.indexOf(file);
    const x = orientation === 'w' ? fileIndex : 7 - fileIndex;
    const y = orientation === 'w' ? 7 - rankIndex : rankIndex;
    return {
      x: x + 0.5,
      y: y + 0.5,
    };
  };

  const arrowPoints = arrow
    ? (() => {
        const from = coordsFor(arrow.from[0] ?? 'a', arrow.from[1] ?? '1');
        const to = coordsFor(arrow.to[0] ?? 'a', arrow.to[1] ?? '1');
        return { from, to };
      })()
    : null;

  const promoPieces: PieceSymbol[] = ['q', 'r', 'b', 'n'];

  return (
    <div className={`board-wrap ${shaking ? 'is-shaking' : ''} ${className}`}>
      <div
        ref={boardRef}
        className={`board ${interactive ? 'is-interactive' : ''}`}
        role="grid"
        aria-label="Chess board"
      >
        {ranks.map((rank, visualRow) =>
          files.map((file, visualCol) => {
            const square = `${file}${rank}` as Square;
            const piece = boardPieces.get(square);
            const fileIndex = FILES.indexOf(file);
            const rankIndex = RANKS.indexOf(rank);
            const light = isLightSquare(fileIndex, rankIndex);
            const isSelected = selected === square;
            const isLast = lastMove?.from === square || lastMove?.to === square;
            const isCheck = checkSquare === square;
            const isHint = hintSquare === square;
            const showFile = visualRow === 7;
            const showRank = visualCol === 0;

            return (
              <button
                type="button"
                key={square}
                className={[
                  'square',
                  light ? 'light' : 'dark',
                  isLast ? 'last-move' : '',
                  isSelected ? 'selected' : '',
                  isCheck ? 'in-check' : '',
                  isHint ? 'hint' : '',
                  piece && canGrab(piece.color) ? 'can-grab' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-square={square}
                onClick={() => onSquareClick(square)}
                onPointerDown={(event) => onPointerDown(event, square)}
                aria-label={`${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
                tabIndex={-1}
              >
                {showFile && <span className="coord coord-file">{file}</span>}
                {showRank && <span className="coord coord-rank">{rank}</span>}
                {piece && (
                  <img
                    className="piece"
                    src={pieceSrc(piece.color, piece.type)}
                    alt=""
                    draggable={false}
                  />
                )}
              </button>
            );
          }),
        )}

        {arrowPoints && (
          <svg className="board-arrows" viewBox="0 0 8 8" aria-hidden="true">
            <defs>
              <marker
                id={`arrow-${markerId}`}
                markerWidth="4.5"
                markerHeight="4.5"
                refX="3.2"
                refY="2.25"
                orient="auto"
              >
                <path
                  d="M0,0.4 L3.9,2.25 L0,4.1 z"
                  fill={arrow?.tone === 'mint' ? '#8ff0b4' : '#f4c95d'}
                />
              </marker>
            </defs>
            <line
              x1={arrowPoints.from.x}
              y1={arrowPoints.from.y}
              x2={arrowPoints.to.x}
              y2={arrowPoints.to.y}
              stroke={arrow?.tone === 'mint' ? '#8ff0b4' : '#f4c95d'}
              strokeWidth="0.23"
              strokeLinecap="round"
              markerEnd={`url(#arrow-${markerId})`}
              opacity="0.9"
            />
          </svg>
        )}

        {promotion && (
          <div className="promotion-picker" role="dialog" aria-label="Choose promotion piece">
            <span className="promotion-label">Promote to</span>
            <div className="promotion-options">
              {promoPieces.map((piece) => (
                <button
                  type="button"
                  key={piece}
                  className="promotion-option"
                  onClick={() => emit(promotion.from, promotion.to, piece)}
                >
                  <img
                    src={pieceSrc(promotion.color, piece)}
                    alt={piece}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
