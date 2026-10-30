import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Lesson, LessonStep, SessionSummary } from '../lib/types';
import { LESSONS } from '../lib/lessons';
import { ChessBoard, type BoardMove } from './ChessBoard';
import { ProgressRing } from './ProgressRing';
import { pieceSrc } from '../lib/assets';
import { playMoveSound, playSound, preloadSounds } from '../lib/sound';
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconEye,
  IconFlip,
  IconLightbulb,
  IconPlay,
  IconSparkles,
  IconTarget,
  IconTrophy,
  IconX,
} from './Icons';

type Phase = 'intro' | 'answering' | 'transition' | 'finished';
type FeedbackKind = 'correct' | 'wrong' | 'revealed' | 'hint';

interface Feedback {
  kind: FeedbackKind;
  text: string;
  detail: string;
}

interface LearnProps {
  muted: boolean;
  progress: Record<string, string[]>;
  onExit: () => void;
  onStepComplete: (lessonId: string, stepId: string) => void;
  onLessonComplete: (lessonId: string) => void;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${`${seconds % 60}`.padStart(2, '0')}`;
}

function firstIncompleteIndex(lesson: Lesson, completed: string[]): number {
  const done = new Set(completed);
  const index = lesson.steps.findIndex((step) => !done.has(step.id));
  return index < 0 ? 0 : index;
}

function LearnMenu({ progress, onExit, onSelect }: { progress: Record<string, string[]>; onExit: () => void; onSelect: (index: number) => void }) {
  return (
    <div className="learn-menu">
      <section className="page-head">
        <div>
          <span className="eyebrow">
            <IconBook size={14} /> Learn
          </span>
          <h1>Learn chess</h1>
          <p>Short lessons for players who have never played. Every quiz is an interactive board — you play the move yourself.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            Back to dashboard
          </button>
        </div>
      </section>
      <section className="how-grid learn-grid">
        {LESSONS.map((lesson, index) => {
          const completed = progress[lesson.id] ?? [];
          const isDone = completed.length >= lesson.steps.length;
          const stepNumber = isDone ? lesson.steps.length : firstIncompleteIndex(lesson, completed);
          const status = isDone ? 'done' : completed.length > 0 ? 'progress' : 'new';
          return (
            <article className={`how-card learn-card status-${status}`} key={lesson.id}>
              <span className="how-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="how-icon soft-blue">
                <IconBook size={20} />
              </span>
              <h3>{lesson.title}</h3>
              <p>{lesson.tagline}</p>
              <div className="learn-card-meta">
                <span>
                  {lesson.steps.length} step{lesson.steps.length === 1 ? '' : 's'}
                </span>
                <span className={`status-chip ${status === 'done' ? 'is-live' : status === 'progress' ? 'is-due' : ''}`}>
                  {status === 'done' ? 'Completed' : status === 'progress' ? `Up to step ${stepNumber + 1}` : 'New'}
                </span>
              </div>
              <button type="button" className="btn btn-soft btn-block" onClick={() => onSelect(index)}>
                {status === 'done' ? (
                  <>
                    <IconPlay size={15} /> Review lesson
                  </>
                ) : (
                  <>
                    <IconPlay size={15} /> {status === 'progress' ? 'Continue' : 'Start'} lesson
                  </>
                )}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function Learn({ muted, progress, onExit, onStepComplete, onLessonComplete }: LearnProps) {
  const [lessonIndex, setLessonIndex] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [flipped, setFlipped] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [appliedMove, setAppliedMove] = useState<{ from: string; to: string } | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [fen, setFen] = useState<string>(START_FEN);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const chessRef = useRef(new Chess(START_FEN));
  const timersRef = useRef<number[]>([]);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const lesson = lessonIndex === null ? null : LESSONS[lessonIndex];

  const clearTimers = () => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const timer = window.setTimeout(fn, delay);
    timersRef.current.push(timer);
  };

  const resetBoard = ( nextFen: string) => {
    chessRef.current = new Chess(nextFen);
    setFen(nextFen);
    setAppliedMove(null);
  };

  const startQuiz = ( nextLesson: Lesson, nextIndex: number) => {
    const step = nextLesson.steps[nextIndex];
    if (step.type !== 'quiz') return;
    resetBoard(step.fen);
    setPhase('answering');
    setFeedback(null);
    setHintLevel(0);
    setAnsweredCount(0);
    setStreak(0);
    setBestStreak(0);
    streakRef.current = 0;
    bestStreakRef.current = 0;
    finishedRef.current = false;
  };

  const startLesson = ( index: number) => {
    const nextLesson = LESSONS[index];
    const startAt = firstIncompleteIndex(nextLesson, progress[nextLesson.id] ?? []);
    setLessonIndex(index);
    setStepIndex(startAt);
    startRef.current = Date.now();
    finishedRef.current = false;
    const firstStep = nextLesson.steps[startAt];
    if (firstStep.type === 'quiz') startQuiz(nextLesson, startAt);
    else {
      resetBoard(firstStep.fen ?? START_FEN);
      setPhase('intro');
      setFeedback(null);
      setHintLevel(0);
    }
  };

  const moveToNextStep = ( nextLesson: Lesson) => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= nextLesson.steps.length) {
      finishLesson(nextLesson);
      return;
    }
    setStepIndex(nextIndex);
    const next = nextLesson.steps[nextIndex];
    if (next.type === 'quiz') startQuiz(nextLesson, nextIndex);
    else {
      resetBoard(next.fen ?? START_FEN);
      setPhase('intro');
      setFeedback(null);
      setHintLevel(0);
    }
  };

  const finishLesson = ( nextLesson: Lesson) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    const nextSummary: SessionSummary = {
      answered: answeredCount,
      bestStreak: bestStreakRef.current,
      durationMs: Date.now() - startRef.current,
    };
    setSummary(nextSummary);
    setPhase('finished');
    playSound('win', muted);
    onLessonComplete(nextLesson.id);
  };

  const markCurrentStepComplete = ( nextLesson: Lesson) => {
    const step = nextLesson.steps[stepIndex];
    if (step) onStepComplete(nextLesson.id, step.id);
  };

  const resolveMove = ( move: BoardMove) => {
    const candidates = chessRef.current.moves({ verbose: true }).filter(
      (candidate) =>
        candidate.from === move.from &&
        candidate.to === move.to &&
        (candidate.promotion ?? '') === (move.promotion ?? ''),
    );
    return candidates[0] ?? null;
  };

  const applyMove = ( resolved: { san: string; from: string; to: string }) => {
    playMoveSound(resolved.san, true, muted);
    chessRef.current.move(resolved.san);
    setFen(chessRef.current.fen());
    setAppliedMove({ from: resolved.from, to: resolved.to });
  };

  const handleBoardMove = (move: BoardMove) => {
    if (phase !== 'answering') return;
    const resolved = resolveMove(move);
    if (!resolved) {
      setShakeSignal((signal) => signal + 1);
      setStreak(0);
      setFeedback({
        kind: 'wrong',
        text: 'Not quite',
        detail: 'That move is not the lesson move. Try again — or take a hint.',
      });
      playSound('wrong', muted);
      return;
    }

    const firstTry = answeredCount === 0 && hintLevel === 0;
    const resolvedAny = resolved as unknown as { san: string; from: string; to: string };
    setAnsweredCount((count) => count + 1);
    markCurrentStepComplete(lesson!);
    if (firstTry) {
      streakRef.current += 1;
      setStreak(streakRef.current);
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      setBestStreak(bestStreakRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }

    setFeedback({
      kind: 'correct',
      text: resolvedAny.san,
      detail: firstTry ? 'First try — nice work.' : 'Solved it.',
    });
    setHintLevel(0);
    applyMove(resolvedAny);
    setPhase('transition');
    schedule(() => moveToNextStep(lesson!), 1100);
  };

  const revealMove = () => {
    if (phase !== 'answering') return;
    const step = lesson?.steps[stepIndex];
    if (step?.type !== 'quiz') return;
    const resolved = chessRef.current.moves({ verbose: true }).find(
      (candidate) => candidate.from === step.answerFrom && candidate.to === step.answerTo,
    );
    if (!resolved) return;
    const resolvedAny = resolved as unknown as { san: string; from: string; to: string };
    markCurrentStepComplete(lesson!);
    setFeedback({
      kind: 'revealed',
      text: resolvedAny.san,
      detail: 'We played it for you. That will come back around in review.',
    });
    setHintLevel(0);
    applyMove(resolvedAny);
    setPhase('transition');
    schedule(() => moveToNextStep(lesson!), 1100);
  };

  const showHint = () => {
    if (phase !== 'answering') return;
    const step = lesson?.steps[stepIndex];
    if (step?.type !== 'quiz') return;
    if (hintLevel >= 2) return;
    const nextLevel = (hintLevel + 1) as 0 | 1 | 2;
    setHintLevel(nextLevel);
    if (nextLevel === 1) {
      setFeedback({ kind: 'hint', text: 'Look at the highlighted piece', detail: step.hint });
    } else if (nextLevel === 2) {
      setFeedback({ kind: 'hint', text: `Play ${step.answerSan}`, detail: 'The arrow shows the move.' });
    }
  };

  const handleEnd = () => {
    if (phase === 'intro') {
      onExit();
      return;
    }
    finishLesson(lesson!);
  };

  useEffect(() => {
    preloadSounds();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const element = historyRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [answeredCount]);

  useEffect(() => {
    if (phase !== 'answering') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hintLevel]);

  if (lessonIndex === null || !lesson) {
    return <LearnMenu progress={progress} onExit={onExit} onSelect={startLesson} />;
  }

  const step = lesson.steps[stepIndex];
  const isQuiz = step.type === 'quiz';
  const displayKind: Phase | FeedbackKind = phase === 'finished' ? 'finished' : (feedback ? feedback.kind : phase);
  const orientation = flipped ? (chessColor(fen) === 'w' ? 'b' : 'w') : 'w';

  const statusCopy: Record<string, { title: string; detail: string }> = {
    intro: { title: step.type === 'intro' ? step.title : 'Lesson intro', detail: step.type === 'intro' ? step.body.join('\n') : 'Read the step, then answer the quiz when it appears.' },
    answering: { title: 'Your move', detail: 'Find the move the lesson is looking for.' },
    transition: { title: 'Nice work', detail: 'Moving on to the next step.' },
    finished: { title: 'Lesson complete', detail: 'Nicely done. Keep the momentum going.' },
    correct: { title: 'Correct', detail: 'That was the move. On to the next step.' },
    wrong: { title: 'Not quite', detail: 'That move is not the lesson move. Try again — or take a hint.' },
    revealed: { title: "Here's the move", detail: 'We played it for you. That will come back around in review.' },
    hint: { title: 'A nudge', detail: 'A hint was shown — the answer will come back in review.' },
  };

  const currentStatus = statusCopy[displayKind] ?? statusCopy.answering;

  const restartLesson = () => startLesson(lessonIndex);

  return (
    <div className="train-page">
      <div className="train-head">
        <button type="button" className="back-btn" onClick={onExit}>
          <IconChevronLeft size={16} />
          Dashboard
        </button>
        <div className="train-head-title">
          <span className={`side-badge ${chessColor(fen)}`}>
            <img src={pieceSrc(chessColor(fen), 'k')} alt="" />
          </span>
          <div>
            <h1>{lesson.title}</h1>
            <span>
              Lesson {LESSONS.findIndex((item) => item.id === lesson.id) + 1} of {LESSONS.length} · Step {stepIndex + 1} of{' '}
              {lesson.steps.length}
            </span>
          </div>
        </div>
        <div className="train-head-actions">
          <span className="progress-label">{Math.round((stepIndex / Math.max(1, lesson.steps.length)) * 100)}%</span>
          <button type="button" className={`icon-btn ${flipped ? 'is-active' : ''}`} onClick={() => setFlipped((value) => !value)} title="Flip board (F)">
            <IconFlip size={18} />
          </button>
          <button type="button" className="btn btn-soft btn-sm end-btn" onClick={handleEnd} disabled={phase === 'finished'}>
            End session
          </button>
        </div>
        <div className="train-progress">
          <span style={{ width: `${Math.round((stepIndex / Math.max(1, lesson.steps.length)) * 100)}%` }} />
        </div>
      </div>

      <div className="train-layout">
        <aside className="train-left">
          <section className="card session-card">
            <div className="card-head">
              <span className="card-title">Session</span>
              <span className={`status-chip ${phase === 'answering' ? 'is-live' : ''}`}>{phase === 'answering' ? 'Answering' : phase}</span>
            </div>
            <div className="session-ring-row">
              <ProgressRing value={progressValue(lesson, stepIndex)} size={104} stroke={8} label={`${progressValue(lesson, stepIndex)}% complete`}>
                <strong>{Math.min(stepIndex + 1, lesson.steps.length)}</strong>
                <span>of {lesson.steps.length}</span>
              </ProgressRing>
              <div className="session-mini-stats">
                <div>
                  <span>Answered</span>
                  <strong>{answeredCount}</strong>
                </div>
                <div>
                  <span>Best streak</span>
                  <strong>{bestStreakRef.current}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="card rep-mini-card">
            <div className="rep-mini-head">
              <img src={pieceSrc('w', 'k')} alt="" className="side-king" />
              <div>
                <strong>{lesson.title}</strong>
                <span>{lesson.tagline}</span>
              </div>
            </div>
            <div className="rep-mini-facts">
              <span>
                <IconBook size={14} /> {lesson.steps.length} steps
              </span>
              <span>
                <IconTarget size={14} /> {LESSONS.length} lessons
              </span>
            </div>
            <button type="button" className="text-link" onClick={onExit}>
              All lessons <IconArrowRight size={14} />
            </button>
          </section>
        </aside>

        <main className="board-stage">
          <div className="board-frame">
            <ChessBoard
              fen={fen}
              orientation={orientation}
              interactive={phase === 'answering'}
              movableColor="w"
              onMove={handleBoardMove}
              onIllegal={() => playSound('illegal', muted)}
              lastMove={appliedMove}
              hintSquare={phase === 'answering' && hintLevel > 0 && step.type === 'quiz' ? step.answerFrom : null}
              arrow={phase === 'answering' && hintLevel === 2 && step.type === 'quiz' ? { from: step.answerFrom, to: step.answerTo, tone: 'gold' } : null}
              shakeSignal={shakeSignal}
            />
          </div>
          <div className="board-caption">
            <span className="caption-move">{isQuiz ? `Step ${stepIndex + 1}` : 'Lesson step'}</span>
            <span>{step.title}</span>
          </div>
        </main>

        <aside className="train-right">
          <section className={`drill-card card kind-${displayKind}`}>
            <div className="drill-kicker">
              <span className={`drill-kicker-dot dot-${displayKind}`} />
              {isQuiz ? 'Move quiz' : 'Lesson intro'}
              {isQuiz && <span className="drill-kicker-count">{stepIndex + 1}/{lesson.steps.length}</span>}
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
                ) : displayKind === 'finished' ? (
                  <IconTrophy size={26} />
                ) : displayKind === 'transition' ? (
                  <IconSparkles size={26} />
                ) : (
                  <IconTarget size={26} />
                )}
              </span>
              <div>
                <h2>{currentStatus.title}</h2>
                <p>{currentStatus.detail}</p>
              </div>
            </div>

            {feedback && (displayKind === 'correct' || displayKind === 'revealed') && (
              <div className="answer-strip">
                <span className="answer-chip">{feedback.text}</span>
                <span className="answer-note">{displayKind === 'correct' ? 'Correct' : 'Revealed'}</span>
              </div>
            )}

            {hintLevel > 0 && phase === 'answering' && step.type === 'quiz' && (
              <div className="hint-banner">
                <IconLightbulb size={15} />
                <span>
                  {hintLevel === 1 ? `The highlighted piece is the one to move — ${step.hint}` : `Play ${step.answerSan} along the arrow.`}
                </span>
              </div>
            )}

            <div className="drill-footer">
              {phase === 'answering' && step.type === 'quiz' ? (
                <>
                  <button type="button" className="btn btn-soft" onClick={showHint} disabled={hintLevel >= 2}>
                    <IconLightbulb size={16} />
                    {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'More hint' : 'Hint shown'}
                  </button>
                  <button type="button" className="text-btn" onClick={revealMove}>
                    Show solution
                  </button>
                </>
              ) : phase === 'intro' && step.type === 'intro' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    markCurrentStepComplete(lesson);
                    moveToNextStep(lesson);
                  }}
                >
                  Next <IconArrowRight size={15} />
                </button>
              ) : phase === 'finished' ? (
                <button type="button" className="btn btn-primary" onClick={restartLesson}>
                  <IconPlay size={15} /> Restart lesson
                </button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={onExit}>
                  Back to lessons
                </button>
              )}
            </div>
          </section>

          <section className="card history-card">
            <div className="card-head">
              <span className="card-title">Notes</span>
              <span className="history-count">{answeredCount} answers</span>
            </div>
            <div className="history-list" ref={historyRef}>
              <p className="history-empty">Work through the steps in order — each quiz stands on its own.</p>
            </div>
          </section>
        </aside>
      </div>

      {phase === 'finished' && summary && (
        <div className="summary-backdrop" role="dialog" aria-modal="true" aria-label="Lesson complete">
          <div className="summary-card">
            <div className="summary-top">
              <span className="summary-icon">
                <IconTrophy size={26} />
              </span>
              <span className="eyebrow">Lesson complete</span>
            </div>
            <h2>{lesson.title}</h2>
            <p className="summary-sub">You worked through every step of “{lesson.title}”.</p>
            <div className="summary-stats">
              <div>
                <strong>{answeredCount}</strong>
                <span>answers</span>
              </div>
              <div>
                <strong>{bestStreak}</strong>
                <span>best streak</span>
              </div>
              <div>
                <strong>{formatDuration(summary.durationMs)}</strong>
                <span>time</span>
              </div>
            </div>
            <div className="summary-actions">
              {LESSONS.findIndex((item) => item.id === lesson.id) < LESSONS.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => startLesson(LESSONS.findIndex((item) => item.id === lesson.id) + 1)}>
                  Next lesson <IconArrowRight size={15} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={onExit}>
                  Back to dashboard
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={restartLesson}>
                Review lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function chessColor(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

function progressValue(lesson: Lesson, stepIndex: number): number {
  if (lesson.steps.length === 0) return 0;
  return Math.round(((stepIndex + 1) / lesson.steps.length) * 100);
}
