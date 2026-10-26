import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  MoveNode,
  PositionStat,
  Repertoire,
  ReviewTarget,
  SessionMode,
  SessionSummary,
} from '../lib/types';
import {
  DAY,
  allLeaves,
  duePositions,
  lineSnippet,
  parsePgn,
  pathTo,
  positionLabel,
  quizPositions,
  recordCorrect,
  recordWrong,
  sideName,
  turnOf,
  otherColor,
} from '../lib/chess';
import { playSound } from '../lib/sound';
import { ChessBoard, type BoardMove } from './ChessBoard';
import { ProgressRing } from './ProgressRing';
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconClock,
  IconEye,
  IconFlip,
  IconLayers,
  IconLightbulb,
  IconPlay,
  IconSparkles,
  IconTarget,
  IconTrophy,
  IconX,
} from './Icons';

type Phase = 'playing' | 'thinking' | 'transition' | 'finished';
type FeedbackKind = 'correct' | 'wrong' | 'revealed' | 'hint' | 'line';

interface Feedback {
  kind: FeedbackKind;
  text: string;
  detail: string;
}

interface Encounter {
  key: string;
  failed: boolean;
  assisted: boolean;
  wrongRecorded: boolean;
  resolved: boolean;
}

interface TrainerProps {
  repertoire: Repertoire;
  muted: boolean;
  initialMode?: SessionMode;
  initialReviewKeys?: string[];
  onExit: () => void;
  onBrowse: () => void;
  onUpdateStat: (key: string, updater: (stat: PositionStat) => PositionStat) => void;
  onComplete: (summary: SessionSummary) => void;
}

const REVIEW_LIMIT = 16;
const TRAIN_LIMIT = 20;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = temp;
  }
  return copy;
}

function lineHasUnanswered(
  leaf: MoveNode,
  color: Repertoire['color'],
  answered: Set<string>,
): boolean {
  let lineRoot = leaf;
  while (lineRoot.parent) lineRoot = lineRoot.parent;
  if (
    lineRoot.children.length > 0 &&
    turnOf(lineRoot.fen) === color &&
    !answered.has(lineRoot.key)
  ) {
    return true;
  }
  return pathTo(leaf).some(
    (node) =>
      node.children.length > 0 && turnOf(node.fen) === color && !answered.has(node.key),
  );
}

function takeRandomLine(
  leaves: MoveNode[],
  color: Repertoire['color'],
  answered: Set<string>,
  bag: MoveNode[],
): MoveNode | null {
  const eligible = leaves.filter((leaf) => lineHasUnanswered(leaf, color, answered));
  if (eligible.length === 0) return null;
  const eligibleKeys = new Set(eligible.map((leaf) => leaf.key));
  for (let index = bag.length - 1; index >= 0; index -= 1) {
    if (!eligibleKeys.has(bag[index]!.key)) bag.splice(index, 1);
  }
  if (bag.length === 0) bag.push(...shuffle(eligible));
  return bag.pop() ?? eligible[0] ?? null;
}

function randomLineUnder(node: MoveNode): MoveNode | null {
  const options = allLeaves(node);
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

function nextOnLine(line: MoveNode | null, node: MoveNode): MoveNode | null {
  if (!line) return null;
  const path = pathTo(line);
  if (node.parent === null) return path[0] ?? null;
  const index = path.findIndex((entry) => entry.key === node.key);
  return index >= 0 ? path[index + 1] ?? null : null;
}

function buildIndex(root: MoveNode): Map<string, MoveNode> {
  const map = new Map<string, MoveNode>();
  const walk = (node: MoveNode) => {
    map.set(node.key, node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return map;
}

function buildReviewTargets(
  parsedRoot: MoveNode,
  color: Repertoire['color'],
  stats: Record<string, PositionStat>,
  keys?: string[],
): ReviewTarget[] {
  if (keys && keys.length > 0) {
    const index = buildIndex(parsedRoot);
    return keys
      .map((key) => index.get(key))
      .filter((node): node is MoveNode => !!node && node.children.length > 0)
      .map((node) => ({ key: node.key, node, moves: node.children }));
  }

  const due = duePositions(parsedRoot, color, stats);
  const seen = shuffle(due.filter((target) => (stats[target.key]?.seen ?? 0) > 0));
  const unseen = shuffle(due.filter((target) => (stats[target.key]?.seen ?? 0) === 0));
  return [...seen, ...unseen].slice(0, REVIEW_LIMIT);
}

export function Trainer({
  repertoire,
  muted,
  initialMode = 'train',
  initialReviewKeys,
  onExit,
  onBrowse,
  onUpdateStat,
  onComplete,
}: TrainerProps) {
  const parsed = useMemo(() => parsePgn(repertoire.pgn), [repertoire.pgn]);
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [reviewKeys, setReviewKeys] = useState<string[] | undefined>(initialReviewKeys);
  const [sessionKey, setSessionKey] = useState(0);

  const restart = (nextMode: SessionMode, keys?: string[]) => {
    setMode(nextMode);
    setReviewKeys(keys);
    setSessionKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DrillSession
      key={`${mode}-${reviewKeys?.join(',') ?? 'auto'}-${sessionKey}`}
      repertoire={repertoire}
      parsed={parsed}
      mode={mode}
      reviewKeys={reviewKeys}
      muted={muted}
      onExit={onExit}
      onBrowse={onBrowse}
      onUpdateStat={onUpdateStat}
      onComplete={onComplete}
      onRestart={restart}
    />
  );
}

interface DrillSessionProps {
  repertoire: Repertoire;
  parsed: ReturnType<typeof parsePgn>;
  mode: SessionMode;
  reviewKeys?: string[];
  muted: boolean;
  onExit: () => void;
  onBrowse: () => void;
  onUpdateStat: (key: string, updater: (stat: PositionStat) => PositionStat) => void;
  onComplete: (summary: SessionSummary) => void;
  onRestart: (mode: SessionMode, keys?: string[]) => void;
}

function DrillSession({
  repertoire,
  parsed,
  mode,
  reviewKeys,
  muted,
  onExit,
  onBrowse,
  onUpdateStat,
  onComplete,
  onRestart,
}: DrillSessionProps) {
  const root = parsed.root;
  const color = repertoire.color;
  const positions = useMemo(() => quizPositions(root, color), [root, color]);
  const leaves = useMemo(() => allLeaves(root), [root]);
  const lineBagRef = useRef<MoveNode[]>([]);
  const [targetLine, setTargetLine] = useState<MoveNode | null>(() =>
    mode === 'train'
      ? takeRandomLine(leaves, color, new Set<string>(), lineBagRef.current)
      : null,
  );
  const [targets] = useState<ReviewTarget[]>(() =>
    mode === 'review'
      ? buildReviewTargets(root, color, repertoire.stats, reviewKeys)
      : [],
  );

  const initialNode = useMemo(
    () => (mode === 'review' ? targets[0]?.node ?? root : root),
    // Intentionally fixed for the lifetime of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [current, setCurrent] = useState<MoveNode>(initialNode);
  const [played, setPlayed] = useState<MoveNode[]>(() =>
    mode === 'review' ? pathTo(initialNode) : [],
  );
  const [reviewIndex, setReviewIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(() =>
    mode === 'train' && turnOf(initialNode.fen) !== color ? 'thinking' : 'playing',
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [flipped, setFlipped] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const encounterRef = useRef<Encounter | null>(
    turnOf(initialNode.fen) === color
      ? { key: initialNode.key, failed: false, assisted: false, wrongRecorded: false, resolved: false }
      : null,
  );
  const answeredRef = useRef<Set<string>>(new Set());
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);

  const goal = mode === 'review' ? targets.length : Math.min(positions.length, TRAIN_LIMIT);
  const shownAnswered = Math.min(answeredCount, goal);
  const progress = goal > 0 ? Math.round((shownAnswered / goal) * 100) : 0;
  const orientation = flipped ? otherColor(color) : color;
  const turn = turnOf(current.fen);
  const targetChild = nextOnLine(targetLine, current);
  const bestMove = targetChild ?? current.children[0] ?? null;
  const lineNumber = targetLine
    ? leaves.findIndex((leaf) => leaf.key === targetLine.key) + 1
    : 0;
  const reviewTarget = mode === 'review' ? targets[reviewIndex] : undefined;
  const reviewTotal = targets.length;

  const schedule = (fn: () => void, delay: number) => {
    const timer = window.setTimeout(fn, delay);
    timersRef.current.push(timer);
  };

  const clearTimers = () => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  };

  const prepareEncounter = (node: MoveNode | null) => {
    setHintLevel(0);
    setFeedback(null);
    if (!node) {
      encounterRef.current = null;
      return;
    }
    encounterRef.current = {
      key: node.key,
      failed: false,
      assisted: false,
      wrongRecorded: false,
      resolved: false,
    };
  };

  const markAnswered = (node: MoveNode) => {
    if (answeredRef.current.has(node.key)) return;
    answeredRef.current.add(node.key);
    setAnsweredCount(answeredRef.current.size);
  };

  const finishSession = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    const snapshot: SessionSummary = {
      answered: answeredRef.current.size,
      bestStreak: bestStreakRef.current,
      durationMs: Date.now() - startRef.current,
    };
    setPhase('finished');
    setSummary(snapshot);
    playSound('win', muted);
    onComplete(snapshot);
  };

  const startNewRun = () => {
    if (finishedRef.current) return;
    const nextLine = takeRandomLine(leaves, color, answeredRef.current, lineBagRef.current);
    if (!nextLine) {
      finishSession();
      return;
    }
    setTargetLine(nextLine);
    setCurrent(root);
    setPlayed([]);
    setShakeSignal(0);
    if (turnOf(root.fen) === color) {
      prepareEncounter(root);
      setPhase('playing');
    } else {
      prepareEncounter(null);
      setPhase('thinking');
    }
  };

  const lineComplete = () => {
    if (mode === 'review') return;
    setPhase('transition');
    if (answeredRef.current.size >= goal) {
      setFeedback({
        kind: 'line',
        text: 'Line complete',
        detail: 'That line is finished. Wrapping up the session.',
      });
      schedule(finishSession, 600);
      return;
    }
    setFeedback({
      kind: 'line',
      text: 'Line complete',
      detail: 'Next random line coming up.',
    });
    schedule(startNewRun, 500);
  };

  const continueAfterResolvedMove = (child: MoveNode) => {
    if (mode === 'review') {
      if (reviewIndex + 1 >= targets.length) {
        schedule(finishSession, 250);
        return;
      }
      schedule(() => {
        const nextIndex = reviewIndex + 1;
        const target = targets[nextIndex];
        if (!target) {
          finishSession();
          return;
        }
        setReviewIndex(nextIndex);
        setCurrent(target.node);
        setPlayed(pathTo(target.node));
        prepareEncounter(target.node);
        setPhase('playing');
      }, 300);
      return;
    }

    if (child.children.length === 0) {
      lineComplete();
      return;
    }
    if (turnOf(child.fen) === color) {
      schedule(() => {
        prepareEncounter(child);
        setPhase('playing');
      }, 100);
    } else {
      schedule(() => {
        prepareEncounter(null);
        setPhase('thinking');
      }, 80);
    }
  };

  const playMove = (child: MoveNode) => {
    setPlayed((history) => [...history, child]);
    setCurrent(child);
    setPhase('transition');
  };

  const handleBoardMove = (move: BoardMove) => {
    if (phase !== 'playing' || turnOf(current.fen) !== color) return;
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    const child = current.children.find((candidate) => candidate.uci === uci);
    if (!child) {
      const encounter = encounterRef.current;
      if (encounter && !encounter.wrongRecorded) {
        onUpdateStat(current.key, (stat) => recordWrong(stat));
        encounter.wrongRecorded = true;
      }
      if (encounter) encounter.failed = true;
      streakRef.current = 0;
      setStreak(0);
      setShakeSignal((signal) => signal + 1);
      setFeedback({
        kind: 'wrong',
        text: 'Not in your repertoire',
        detail: "That move is legal, but it isn't in this line. Try again — or take a hint.",
      });
      playSound('wrong', muted);
      return;
    }

    const onTargetLine = targetChild?.key === child.key;
    if (!onTargetLine) {
      const nextLine = randomLineUnder(child);
      if (nextLine) setTargetLine(nextLine);
    }

    const encounter = encounterRef.current;
    if (encounter?.resolved) return;
    const firstTry = !encounter?.failed && !encounter?.assisted;
    const resolvedEncounter = encounter ?? {
      key: current.key,
      failed: false,
      assisted: false,
      wrongRecorded: false,
      resolved: false,
    };
    resolvedEncounter.resolved = true;
    encounterRef.current = resolvedEncounter;

    onUpdateStat(current.key, (stat) => recordCorrect(stat, firstTry));
    markAnswered(current);
    playSound('correct', muted);

    if (firstTry) {
      streakRef.current += 1;
      setStreak(streakRef.current);
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }

    setFeedback({
      kind: 'correct',
      text: child.san,
      detail: firstTry
        ? 'First try — mastery up.'
        : resolvedEncounter.assisted
          ? 'Solved with a hint.'
          : 'Found it.',
    });
    setHintLevel(0);
    playMove(child);
    schedule(() => continueAfterResolvedMove(child), 220);
  };

  const revealMove = () => {
    if (phase !== 'playing' || !bestMove) return;
    const encounter = encounterRef.current;
    if (encounter?.resolved) return;
    const resolvedEncounter = encounter ?? {
      key: current.key,
      failed: false,
      assisted: false,
      wrongRecorded: false,
      resolved: false,
    };
    resolvedEncounter.resolved = true;
    resolvedEncounter.failed = true;
    encounterRef.current = resolvedEncounter;

    if (!resolvedEncounter.wrongRecorded) {
      onUpdateStat(current.key, (stat) => recordWrong(stat));
      resolvedEncounter.wrongRecorded = true;
    }
    markAnswered(current);
    streakRef.current = 0;
    setStreak(0);
    setFeedback({
      kind: 'revealed',
      text: bestMove.san,
      detail: "We've played it for you. This position will come back soon.",
    });
    setHintLevel(0);
    playSound('move', muted);
    playMove(bestMove);
    schedule(() => continueAfterResolvedMove(bestMove), 800);
  };

  const showHint = () => {
    if (phase !== 'playing' || !bestMove) return;
    const encounter = encounterRef.current;
    if (encounter) encounter.assisted = true;
    if (hintLevel === 0) {
      setHintLevel(1);
      setFeedback({
        kind: 'hint',
        text: 'Look at the highlighted piece',
        detail: 'Its best square is part of your repertoire. Not sure yet? Ask for one more hint.',
      });
    } else if (hintLevel === 1) {
      setHintLevel(2);
      setFeedback({
        kind: 'hint',
        text: `Play ${bestMove.san}`,
        detail: 'The arrow shows the move. Playing it now will not count as a first-try.',
      });
    }
  };

  const handleEnd = () => {
    if (answeredRef.current.size === 0) {
      onExit();
      return;
    }
    finishSession();
  };

  useEffect(() => {
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'thinking' || mode !== 'train' || finishedRef.current) return;
    const timer = window.setTimeout(() => {
      if (current.children.length === 0) {
        lineComplete();
        return;
      }
      let child = nextOnLine(targetLine, current);
      if (!child) {
        const fallbackLine = randomLineUnder(current);
        if (fallbackLine) {
          setTargetLine(fallbackLine);
          child = nextOnLine(fallbackLine, current);
        }
      }
      if (!child) child = current.children[Math.floor(Math.random() * current.children.length)] ?? null;
      if (!child) return;

      playSound('move', muted);
      setPlayed((history) => [...history, child]);
      setCurrent(child);

      if (child.children.length === 0) {
        lineComplete();
      } else if (turnOf(child.fen) === color) {
        prepareEncounter(child);
        setPhase('playing');
      } else {
        setPhase('thinking');
      }
    }, 160);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current, mode, color, muted, targetLine]);

  useEffect(() => {
    const element = historyRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [played.length]);

  useEffect(() => {
    if (summary) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === 'h') {
        event.preventDefault();
        showHint();
      } else if (event.key === 's') {
        event.preventDefault();
        revealMove();
      } else if (event.key === 'f') {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (mode === 'review' && targets.length === 0) {
    return (
      <div className="train-page">
        <TrainHeader
          repertoire={repertoire}
          mode={mode}
          onExit={onExit}
          onBrowse={onBrowse}
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
          progress={0}
          progressLabel="Nothing due"
          onEnd={handleEnd}
          endDisabled
        />
        <div className="empty-session card">
          <div className="empty-session-icon">
            <IconCheck size={28} />
          </div>
          <h2>All caught up</h2>
          <p>
            Nothing is due for review right now. Keep the momentum going with a normal training
            run, or come back later.
          </p>
          <div className="empty-session-actions">
            <button type="button" className="btn btn-primary" onClick={() => onRestart('train')}>
              <IconPlay size={15} />
              Train anyway
            </button>
            <button type="button" className="btn btn-ghost" onClick={onExit}>
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const summaryTitle = summary && summary.answered > 0 ? 'Well drilled.' : 'Session ended.';

  const displayKind: FeedbackKind | 'idle' | 'thinking' =
    feedback?.kind ?? (phase === 'thinking' ? 'thinking' : 'idle');

  return (
    <div className="train-page">
      <TrainHeader
        repertoire={repertoire}
        mode={mode}
        onExit={onExit}
        onBrowse={onBrowse}
        flipped={flipped}
        onFlip={() => setFlipped((value) => !value)}
        progress={progress}
        progressLabel={`${shownAnswered} of ${goal} positions`}
        onEnd={handleEnd}
        endDisabled={phase === 'finished'}
      />

      <div className="train-layout">
        <aside className="train-left">
          <section className="card session-card">
            <div className="card-head">
              <span className="card-title">Session</span>
              <span className={`status-chip ${mode === 'review' ? 'is-review' : ''}`}>
                {mode === 'review' ? 'Review' : `Line ${lineNumber || 1}`}
              </span>
            </div>
            <div className="session-ring-row">
              <ProgressRing value={progress} size={104} stroke={8} label={`${progress}% complete`}>
                <strong>{shownAnswered}</strong>
                <span>of {goal}</span>
              </ProgressRing>
              <div className="session-mini-stats">
                <div>
                  <span>Remaining</span>
                  <strong>{Math.max(0, goal - shownAnswered)}</strong>
                </div>
                <div>
                  <span>Best streak</span>
                  <strong>{Math.max(bestStreakRef.current, streak)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="card rep-mini-card">
            <div className="rep-mini-head">
              <img
                src={`/pieces/staunty/${color}K.svg`}
                alt=""
                className="side-king"
              />
              <div>
                <strong>{repertoire.name}</strong>
                <span>{sideName(color)} repertoire</span>
              </div>
            </div>
            <div className="rep-mini-facts">
              <span>
                <IconLayers size={14} /> {parsed.leaves} lines
              </span>
              <span>
                <IconTarget size={14} /> {positions.length} positions
              </span>
            </div>
            <button type="button" className="text-link" onClick={onBrowse}>
              Browse repertoire <IconArrowRight size={14} />
            </button>
          </section>

          <section className="card shortcuts-card">
            <span className="card-title">Shortcuts</span>
            <div className="shortcut-row">
              <span>Hint</span>
              <kbd>H</kbd>
            </div>
            <div className="shortcut-row">
              <span>Solution</span>
              <kbd>S</kbd>
            </div>
            <div className="shortcut-row">
              <span>Flip board</span>
              <kbd>F</kbd>
            </div>
          </section>
        </aside>

        <main className="board-stage">
          <PlayerBar
            color={orientation === 'w' ? 'b' : 'w'}
            isUser={otherColor(orientation) === color}
            active={turn === otherColor(orientation)}
            thinking={turn === otherColor(orientation) && phase === 'thinking'}
          />
          <div className="board-frame">
            <ChessBoard
              fen={current.fen}
              orientation={orientation}
              interactive={phase === 'playing' && turn === color}
              movableColor={color}
              lastMove={
                current.uci
                  ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) }
                  : null
              }
              hintSquare={
                hintLevel > 0 && bestMove?.uci ? bestMove.uci.slice(0, 2) : null
              }
              arrow={
                hintLevel === 2 && bestMove?.uci
                  ? { from: bestMove.uci.slice(0, 2), to: bestMove.uci.slice(2, 4), tone: 'gold' }
                  : null
              }
              shakeSignal={shakeSignal}
              onMove={handleBoardMove}
            />
          </div>
          <PlayerBar
            color={orientation}
            isUser={orientation === color}
            active={turn === orientation}
            thinking={turn === orientation && phase === 'thinking'}
          />
          <div className="board-caption">
            <span className="caption-move">
              {mode === 'review'
                ? `Review ${reviewIndex + 1} of ${reviewTotal}`
                : `Line ${lineNumber || 1}`}
            </span>
            <span>{positionLabel(current)}</span>
            {current.san && (
              <span className="caption-last">
                Last move <strong>{current.san}</strong>
              </span>
            )}
          </div>
        </main>

        <aside className="train-right">
          <section className={`drill-card card kind-${displayKind}`}>
            <div className="drill-kicker">
              <span className={`drill-kicker-dot dot-${displayKind}`} />
              {mode === 'review' ? 'Spaced review' : 'Repertoire drill'}
              {mode === 'review' && (
                <span className="drill-kicker-count">
                  {reviewIndex + 1}/{reviewTotal}
                </span>
              )}
            </div>

            <div className="drill-status">
              <span className={`status-orb orb-${displayKind}`}>
                {displayKind === 'correct' ? (
                  <IconCheck size={26} />
                ) : displayKind === 'wrong' ? (
                  <IconX size={26} />
                ) : displayKind === 'revealed' ? (
                  <IconEye size={26} />
                ) : displayKind === 'hint' ? (
                  <IconLightbulb size={26} />
                ) : displayKind === 'line' ? (
                  <IconSparkles size={26} />
                ) : displayKind === 'thinking' ? (
                  <span className="thinking-dots" aria-label="Thinking">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <IconTarget size={26} />
                )}
              </span>
              <div>
                <h2>
                  {displayKind === 'correct'
                    ? 'Correct'
                    : displayKind === 'wrong'
                      ? 'Not in the repertoire'
                      : displayKind === 'revealed'
                        ? "Here's the move"
                        : displayKind === 'hint'
                          ? 'A nudge'
                          : displayKind === 'line'
                            ? 'Line complete'
                            : displayKind === 'thinking'
                              ? `${sideName(otherColor(color))} is playing`
                              : 'Your move'}
                </h2>
                <p>
                  {displayKind === 'idle'
                    ? `Find the ${sideName(color)} move from your repertoire.`
                    : displayKind === 'thinking'
                      ? 'Sit tight — the repertoire is choosing its line.'
                      : feedback?.detail ?? ''}
                </p>
              </div>
            </div>

            {feedback && (displayKind === 'correct' || displayKind === 'revealed') && (
              <div className="answer-strip">
                <span className="answer-chip">{feedback.text}</span>
                <span className="answer-note">
                  {displayKind === 'correct' ? 'In your repertoire' : 'Revealed'}
                </span>
              </div>
            )}

            {hintLevel > 0 && bestMove && displayKind !== 'correct' && displayKind !== 'revealed' && (
              <div className="hint-banner">
                <IconLightbulb size={15} />
                <span>
                  {hintLevel === 1
                    ? 'The highlighted piece is the one to move.'
                    : `Play ${bestMove.san} along the arrow.`}
                </span>
              </div>
            )}

            {displayKind === 'idle' && reviewTarget && (
              <div className="review-context">
                <span className="review-tag">Due for review</span>
                <span>{lineSnippet(reviewTarget.node, 4)}</span>
              </div>
            )}

            <div className="drill-footer">
              <button
                type="button"
                className="btn btn-soft"
                onClick={showHint}
                disabled={phase !== 'playing' || hintLevel >= 2}
              >
                <IconLightbulb size={16} />
                {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'More hint' : 'Hint shown'}
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={revealMove}
                disabled={phase !== 'playing'}
              >
                Show solution
              </button>
            </div>
          </section>

          <section className="card history-card">
            <div className="card-head">
              <span className="card-title">Line</span>
              <span className="history-count">{played.length} moves</span>
            </div>
            <div className="history-list" ref={historyRef}>
              {played.length === 0 ? (
                <p className="history-empty">You're at the start of the line.</p>
              ) : (
                <MoveHistory nodes={played} />
              )}
            </div>
          </section>
        </aside>
      </div>

      {summary && (
        <div className="summary-backdrop" role="dialog" aria-modal="true" aria-label="Session summary">
          <div className="summary-card">
            <div className="summary-top">
              <span className="summary-icon">
                <IconTrophy size={26} />
              </span>
              <span className="eyebrow">Session complete</span>
            </div>
            <h2>{summaryTitle}</h2>
            <p className="summary-sub">
              {summary.answered === 0
                ? 'No positions completed this time.'
                : `You completed ${summary.answered} position${summary.answered === 1 ? '' : 's'}.`}
            </p>

            <div className="summary-stats">
              <div>
                <strong>{summary.answered}</strong>
                <span>positions</span>
              </div>
              <div>
                <strong>{summary.bestStreak}</strong>
                <span>best streak</span>
              </div>
              <div>
                <strong>{formatDuration(summary.durationMs)}</strong>
                <span>time</span>
              </div>
            </div>

            <div className="summary-actions">
              <button type="button" className="btn btn-primary" onClick={() => onRestart('train')}>
                <IconPlay size={15} />
                Train again
              </button>
              <button type="button" className="btn btn-ghost" onClick={onExit}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${`${seconds % 60}`.padStart(2, '0')}`;
}

function TrainHeader({
  repertoire,
  mode,
  onExit,
  onBrowse,
  flipped,
  onFlip,
  progress,
  progressLabel,
  onEnd,
  endDisabled,
}: {
  repertoire: Repertoire;
  mode: SessionMode;
  onExit: () => void;
  onBrowse: () => void;
  flipped: boolean;
  onFlip: () => void;
  progress: number;
  progressLabel: string;
  onEnd: () => void;
  endDisabled?: boolean;
}) {
  return (
    <div className="train-head">
      <button type="button" className="back-btn" onClick={onExit}>
        <IconChevronLeft size={16} />
        Dashboard
      </button>
      <div className="train-head-title">
        <span className={`side-badge ${repertoire.color}`}>
          <img src={`/pieces/staunty/${repertoire.color}K.svg`} alt="" />
        </span>
        <div>
          <h1>{repertoire.name}</h1>
          <span>
            {repertoire.opening ?? 'Custom repertoire'} · {mode === 'review' ? 'Spaced review' : 'Training'}
          </span>
        </div>
      </div>
      <div className="train-head-actions">
        <span className="progress-label">{progressLabel}</span>
        <button
          type="button"
          className={`icon-btn ${flipped ? 'is-active' : ''}`}
          onClick={onFlip}
          title="Flip board (F)"
        >
          <IconFlip size={18} />
        </button>
        <button type="button" className="btn btn-ghost btn-sm browse-btn" onClick={onBrowse}>
          <IconBook size={15} />
          Lines
        </button>
        <button
          type="button"
          className="btn btn-soft btn-sm end-btn"
          onClick={onEnd}
          disabled={endDisabled}
        >
          End session
        </button>
      </div>
      <div className="train-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PlayerBar({
  color,
  isUser,
  active,
  thinking,
}: {
  color: 'w' | 'b';
  isUser: boolean;
  active: boolean;
  thinking: boolean;
}) {
  return (
    <div className={`player-bar ${active ? 'is-active' : ''}`}>
      <span className={`player-avatar ${color}`}>
        <img src={`/pieces/staunty/${color}K.svg`} alt="" />
      </span>
      <div className="player-info">
        <strong>{isUser ? 'You' : 'Repertoire'}</strong>
        <span>{sideName(color)}</span>
      </div>
      <div className="player-state">
        {thinking ? (
          <span className="thinking-label">
            Playing
            <span className="thinking-dots small">
              <i />
              <i />
              <i />
            </span>
          </span>
        ) : active ? (
          <span className="to-move">
            <span className="turn-dot" /> To move
          </span>
        ) : (
          <span className="waiting-label">Waiting</span>
        )}
      </div>
    </div>
  );
}

function MoveHistory({ nodes }: { nodes: MoveNode[] }) {
  const rows: { number: number; white?: MoveNode; black?: MoveNode }[] = [];
  for (const node of nodes) {
    const number = Math.ceil(node.ply / 2);
    if (node.ply % 2 === 1) {
      rows.push({ number, white: node });
    } else {
      const row = rows[rows.length - 1];
      if (row) row.black = node;
      else rows.push({ number, black: node });
    }
  }

  return (
    <div className="move-history">
      {rows.map((row) => (
        <div className="history-row" key={`${row.number}-${row.white?.key ?? row.black?.key}`}>
          <span className="history-num">{row.number}.</span>
          <span className={`history-move ${row.white?.key === nodes[nodes.length - 1]?.key ? 'is-current' : ''}`}>
            {row.white?.san ?? ''}
          </span>
          <span className={`history-move ${row.black?.key === nodes[nodes.length - 1]?.key ? 'is-current' : ''}`}>
            {row.black?.san ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}
