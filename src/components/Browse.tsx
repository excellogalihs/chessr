import { useMemo, useRef, useState } from 'react';
import type { MoveNode, Repertoire } from '../lib/types';
import {
  DAY,
  allLeaves,
  formatDue,
  formatRelative,
  masteryOf,
  parsePgn,
  pathTo,
  positionLabel,
  quizPositions,
  repertoireStats,
  sideName,
  turnOf,
} from '../lib/chess';
import { ChessBoard } from './ChessBoard';
import { ProgressRing } from './ProgressRing';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFlip,
  IconLayers,
  IconPlay,
  IconSearch,
  IconTarget,
  IconTrash,
} from './Icons';

interface BrowseProps {
  repertoire: Repertoire;
  onBack: () => void;
  onTrain: () => void;
  onDelete: () => void;
  onToast: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

const LEVEL_LABELS = ['New', 'Learning', 'Familiar', 'Solid', 'Strong', 'Mastered'];

function firstLeaf(node: MoveNode): MoveNode {
  let cursor = node;
  while (cursor.children.length > 0) {
    cursor = cursor.children[0] as MoveNode;
  }
  return cursor;
}

function nodeMap(root: MoveNode): Map<string, MoveNode> {
  const map = new Map<string, MoveNode>();
  const walk = (node: MoveNode) => {
    map.set(node.key, node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return map;
}

export function Browse({ repertoire, onBack, onTrain, onDelete, onToast }: BrowseProps) {
  const parsed = useMemo(() => parsePgn(repertoire.pgn), [repertoire.pgn]);
  const leaves = useMemo(() => allLeaves(parsed.root), [parsed.root]);
  const index = useMemo(() => nodeMap(parsed.root), [parsed.root]);
  const positions = useMemo(
    () => quizPositions(parsed.root, repertoire.color),
    [parsed.root, repertoire.color],
  );
  const stats = useMemo(
    () => repertoireStats(repertoire, parsed.root),
    [repertoire, parsed.root],
  );

  const [selectedLeafKey, setSelectedLeafKey] = useState<string>(leaves[0]?.key ?? '');
  const [selectedKey, setSelectedKey] = useState<string>(leaves[0]?.key ?? '');
  const [search, setSearch] = useState('');
  const [flipped, setFlipped] = useState(false);
  const linesRef = useRef<HTMLDivElement>(null);

  const selectedLeaf = selectedLeafKey ? index.get(selectedLeafKey) ?? leaves[0] : leaves[0];
  const linePath = selectedLeaf ? pathTo(selectedLeaf) : [];
  const selected = selectedKey ? index.get(selectedKey) : parsed.root;
  const current = selected ?? parsed.root;
  const selectedIndex = linePath.findIndex((node) => node.key === current.key);
  const needsAnswer = turnOf(current.fen) === repertoire.color && current.children.length > 0;
  const stat = repertoire.stats[current.key];
  const currentLineNumber = selectedLeaf
    ? Math.max(1, leaves.findIndex((leaf) => leaf.key === selectedLeaf.key) + 1)
    : 1;

  const filteredLeaves = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leaves;
    return leaves.filter((leaf) => {
      const path = pathTo(leaf);
      return (
        path.some((node) => node.san.toLowerCase().includes(query)) ||
        (leaf.comment ?? '').toLowerCase().includes(query)
      );
    });
  }, [leaves, search]);

  const selectNode = (node: MoveNode) => {
    setSelectedKey(node.key);
    const leaf = firstLeaf(node);
    setSelectedLeafKey(leaf.key);
  };

  const selectLineMove = (leaf: MoveNode, node: MoveNode) => {
    setSelectedLeafKey(leaf.key);
    setSelectedKey(node.key);
  };

  const goPrev = () => {
    if (selectedIndex <= 0) {
      setSelectedKey('');
      return;
    }
    const node = linePath[selectedIndex - 1];
    if (node) setSelectedKey(node.key);
  };

  const goNext = () => {
    if (selectedIndex === -1) {
      const first = linePath[0];
      if (first) setSelectedKey(first.key);
      return;
    }
    const node = linePath[selectedIndex + 1];
    if (node) setSelectedKey(node.key);
  };

  const goStart = () => setSelectedKey('');
  const goEnd = () => {
    if (selectedLeaf) setSelectedKey(selectedLeaf.key);
  };

  const copyPgn = async () => {
    try {
      await navigator.clipboard.writeText(repertoire.pgn);
      onToast('PGN copied to clipboard', 'success');
    } catch {
      onToast('Could not copy PGN', 'error');
    }
  };

  const lineMastery = (leaf: MoveNode) => {
    const path = [parsed.root, ...pathTo(leaf)];
    const linePositions = path.filter(
      (node) => node.children.length > 0 && turnOf(node.fen) === repertoire.color,
    );
    return masteryOf(
      linePositions.map((node) => ({ node, moves: node.children })),
      repertoire.stats,
    );
  };

  return (
    <div className="browse-page">
      <div className="browse-head">
        <button type="button" className="back-btn" onClick={onBack}>
          <IconArrowLeft size={16} />
          Dashboard
        </button>
        <div className="browse-title">
          <span className={`side-badge ${repertoire.color}`}>
            <img src={`/pieces/staunty/${repertoire.color}K.svg`} alt="" />
          </span>
          <div>
            <h1>{repertoire.name}</h1>
            <span>
              {repertoire.opening ?? 'Custom repertoire'} · {sideName(repertoire.color)} repertoire
            </span>
          </div>
        </div>
        <div className="browse-head-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onTrain}>
            <IconPlay size={14} />
            Train
          </button>
        </div>
      </div>

      <div className="browse-stats-row">
        <span className="stat-pill">
          <IconLayers size={15} /> {leaves.length} lines
        </span>
        <span className="stat-pill">
          <IconTarget size={15} /> {positions.length} positions
        </span>
        <span className="stat-pill">
          <IconCheck size={15} /> {stats.mastery}% mastery
        </span>
        <span className={`stat-pill ${stats.due > 0 ? 'is-due' : ''}`}>
          <IconBook size={15} /> {stats.due} due
        </span>
        <span className="stat-pill muted">
          Last trained {formatRelative(repertoire.lastTrainedAt)}
        </span>
      </div>

      <div className="browse-layout">
        <aside className="card lines-panel">
          <div className="lines-head">
            <div>
              <span className="card-title">Lines</span>
              <span className="lines-count">{filteredLeaves.length}</span>
            </div>
            <label className="search-box">
              <IconSearch size={15} />
              <input
                type="search"
                placeholder="Search moves"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search lines"
              />
            </label>
          </div>
          <div className="lines-list" ref={linesRef}>
            {filteredLeaves.length === 0 ? (
              <div className="lines-empty">No lines match “{search}”.</div>
            ) : (
              filteredLeaves.map((leaf) => {
                const path = pathTo(leaf);
                const mastery = lineMastery(leaf);
                const isActive = leaf.key === selectedLeaf?.key;
                return (
                  <div className={`line-item ${isActive ? 'is-active' : ''}`} key={leaf.key}>
                    <div className="line-item-top">
                      <span className="line-index">
                        {String(leaves.findIndex((item) => item.key === leaf.key) + 1).padStart(2, '0')}
                      </span>
                      <span className={`line-mastery ${mastery >= 80 ? 'is-high' : mastery >= 40 ? 'is-mid' : ''}`}>
                        <span style={{ width: `${mastery}%` }} />
                      </span>
                      <span className="line-mastery-label">{mastery}%</span>
                    </div>
                    <div className="line-moves">
                      {path.map((node, moveIndex) => (
                        <span className="line-move-wrap" key={node.key}>
                          {node.ply % 2 === 1 && (
                            <span className="line-move-number">{Math.ceil(node.ply / 2)}.</span>
                          )}
                          <button
                            type="button"
                            className={`line-move ${
                              node.key === current.key ? 'is-current' : ''
                            } ${
                              node.ply % 2 === 0 ? 'is-black-move' : ''
                            }`}
                            onClick={() => selectLineMove(leaf, node)}
                            title={node.comment}
                          >
                            {node.san}
                          </button>
                          {moveIndex === path.length - 1 && leaf.comment && (
                            <span className="line-comment-dot" title={leaf.comment} />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="browse-board">
          <div className="browse-board-top">
            <div>
              <span className="eyebrow">Line {currentLineNumber}</span>
              <h2>{positionLabel(current)}</h2>
            </div>
            <button
              type="button"
              className={`icon-btn ${flipped ? 'is-active' : ''}`}
              onClick={() => setFlipped((value) => !value)}
              title="Flip board"
            >
              <IconFlip size={17} />
            </button>
          </div>
          <div className="board-frame">
            <ChessBoard
              fen={current.fen}
              orientation={flipped ? (repertoire.color === 'w' ? 'b' : 'w') : repertoire.color}
              lastMove={
                current.uci
                  ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) }
                  : null
              }
            />
          </div>
          <div className="browse-nav">
            <button type="button" className="icon-btn" onClick={goStart} disabled={current.key === ''}>
              <IconChevronLeft size={17} />
              <IconChevronLeft size={17} className="double-icon" />
            </button>
            <button type="button" className="icon-btn" onClick={goPrev} disabled={current.key === ''}>
              <IconChevronLeft size={19} />
            </button>
            <span className="browse-nav-label">
              {current.key === ''
                ? 'Starting position'
                : `${Math.ceil(current.ply / 2)}${current.ply % 2 === 1 ? '.' : '...'} ${current.san}`}
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={goNext}
              disabled={selectedIndex === linePath.length - 1}
            >
              <IconChevronRight size={19} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={goEnd}
              disabled={selectedIndex === linePath.length - 1}
            >
              <IconChevronRight size={17} />
              <IconChevronRight size={17} className="double-icon" />
            </button>
          </div>
        </main>

        <aside className="browse-detail">
          <section className="card position-card">
            <div className="card-head">
              <span className="card-title">Position</span>
              <span className={`status-chip ${needsAnswer ? 'is-live' : ''}`}>
                {needsAnswer ? 'Your move' : 'Opponent'}
              </span>
            </div>
            <div className="position-side">
              <span className={`side-dot ${turnOf(current.fen)}`} />
              {sideName(turnOf(current.fen))} to move
            </div>
            {current.comment && <p className="position-comment">{current.comment}</p>}

            <div className="repertoire-moves">
              <span className="detail-label">
                {needsAnswer ? 'Repertoire answers' : 'Next moves'}
              </span>
              {current.children.length > 0 ? (
                <div className="answer-list">
                  {current.children.map((child) => {
                    const childStat = repertoire.stats[child.key];
                    const childNeedsAnswer =
                      turnOf(child.fen) === repertoire.color && child.children.length > 0;
                    return (
                      <button
                        type="button"
                        className="answer-move"
                        key={child.key}
                        onClick={() => selectNode(child)}
                        title={child.comment}
                      >
                        {child.san}
                        {childNeedsAnswer && childStat && (
                          <span className={`answer-level level-${childStat.level}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="detail-muted">End of line</span>
              )}
            </div>

            {needsAnswer && (
              <div className="position-stat-box">
                <div className="position-stat-head">
                  <span>Your recall</span>
                  <span className={`level-label level-text-${stat?.level ?? 0}`}>
                    {LEVEL_LABELS[stat?.level ?? 0]}
                  </span>
                </div>
                <div className="level-dots">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span key={level} className={(stat?.level ?? 0) >= level ? 'filled' : ''} />
                  ))}
                </div>
                <div className="position-stat-meta">
                  <span>{stat ? formatDue(stat.dueAt) : 'Not drilled yet'}</span>
                </div>
              </div>
            )}

            <button type="button" className="btn btn-primary btn-block" onClick={onTrain}>
              <IconPlay size={14} />
              Drill this repertoire
            </button>
          </section>

          <section className="card repertoire-card">
            <div className="card-head">
              <span className="card-title">Repertoire</span>
              <span className="status-chip">{sideName(repertoire.color)}</span>
            </div>
            <div className="repertoire-score">
              <ProgressRing value={stats.mastery} size={76} stroke={7}>
                <strong>{stats.mastery}%</strong>
              </ProgressRing>
              <div className="repertoire-score-facts">
                <div>
                  <strong>{stats.mastered}</strong>
                  <span>solid</span>
                </div>
                <div>
                  <strong>{stats.due}</strong>
                  <span>due</span>
                </div>
              </div>
            </div>
            <div className="repertoire-actions">
              <button type="button" className="btn btn-soft btn-sm" onClick={copyPgn}>
                <IconCopy size={14} />
                Copy PGN
              </button>
              <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={onDelete}>
                <IconTrash size={14} />
                Delete
              </button>
            </div>
          </section>

          <section className="card tip-card">
            <span className="card-title">How it works</span>
            <p>
              You drill the <strong>{sideName(repertoire.color)}</strong> moves. Opponent moves are
              auto-played from the PGN, and your recall is scheduled with spaced review.
            </p>
            <p className="tip-note">
              PGN comments are kept as notes. Engine directives such as [%clk] and [%eval] are
              stripped automatically.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
