import { useMemo } from 'react';
import type { MoveNode, Repertoire } from '../lib/types';
import {
  DAY,
  allLeaves,
  countLeaves,
  formatDue,
  formatRelative,
  masteryOf,
  parsePgn,
  pathTo,
  quizPositions,
  repertoireStats,
  sideName,
  turnOf,
} from '../lib/chess';
import { dateKey, type Activity } from '../lib/storage';
import { HERO_FEN } from '../lib/samples';
import { ChessBoard } from './ChessBoard';
import { ProgressRing } from './ProgressRing';
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBook,
  IconCheck,
  IconClock,
  IconFlame,
  IconLayers,
  IconPlay,
  IconPlus,
  IconSparkles,
  IconTarget,
  IconTrendUp,
  IconUpload,
  IconZap,
} from './Icons';

interface DashboardProps {
  repertoires: Repertoire[];
  activity: Activity;
  onImport: () => void;
  onSample: () => void;
  onTrain: (id: string) => void;
  onReview: (id: string) => void;
  onBrowse: (id: string) => void;
  onDelete: (id: string) => void;
}

interface RepSummary {
  rep: Repertoire;
  root: MoveNode;
  lines: number;
  positions: number;
  due: number;
  mastered: number;
  mastery: number;
}

function summarize(rep: Repertoire): RepSummary {
  const parsed = parsePgn(rep.pgn);
  const stats = repertoireStats(rep, parsed.root);
  return {
    rep,
    root: parsed.root,
    lines: parsed.leaves,
    positions: stats.positions,
    due: stats.due,
    mastered: stats.mastered,
    mastery: stats.mastery,
  };
}

function representativePosition(root: MoveNode): { node: MoveNode; next?: MoveNode } {
  const leaves = allLeaves(root);
  const leaf = leaves[0];
  if (!leaf) return { node: root };
  const path = pathTo(leaf);
  const node = path[Math.min(path.length - 1, Math.max(0, 11))] ?? path[path.length - 1] ?? root;
  return { node, next: node.children[0] };
}

function aggregate(summaries: RepSummary[]) {
  let positions = 0;
  let levels = 0;
  let due = 0;
  let mastered = 0;
  for (const summary of summaries) {
    positions += summary.positions;
    levels += (summary.mastery / 100) * summary.positions * 5;
    due += summary.due;
    mastered += summary.mastered;
  }
  return {
    positions,
    due,
    mastered,
    mastery: positions > 0 ? Math.round((levels / (positions * 5)) * 100) : 0,
  };
}

function lastSevenDays(activity: Activity) {
  const days: { key: string; label: string; count: number; isToday: boolean }[] = [];
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    days.push({
      key: dateKey(date),
      label: labels[date.getDay()] ?? '',
      count: activity[dateKey(date)] ?? 0,
      isToday: offset === 0,
    });
  }
  return days;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late-night session';
  if (hour < 12) return 'Good morning, player';
  if (hour < 18) return 'Good afternoon, player';
  return 'Good evening, player';
}

export function Dashboard({
  repertoires,
  activity,
  onImport,
  onSample,
  onTrain,
  onReview,
  onBrowse,
  onDelete,
}: DashboardProps) {
  const summaries = useMemo(() => repertoires.map(summarize), [repertoires]);
  const totals = useMemo(() => aggregate(summaries), [summaries]);
  const active = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const aTime = a.rep.lastTrainedAt ?? a.rep.updatedAt;
      const bTime = b.rep.lastTrainedAt ?? b.rep.updatedAt;
      return bTime - aTime;
    })[0];
  }, [summaries]);

  const week = lastSevenDays(activity);
  const weekTotal = week.reduce((sum, day) => sum + day.count, 0);
  const streak = (() => {
    let count = 0;
    const date = new Date();
    if ((activity[dateKey(date)] ?? 0) === 0) date.setDate(date.getDate() - 1);
    while ((activity[dateKey(date)] ?? 0) > 0) {
      count += 1;
      date.setDate(date.getDate() - 1);
    }
    return count;
  })();

  if (repertoires.length === 0) {
    return <EmptyDashboard onImport={onImport} onSample={onSample} />;
  }

  const activeStats = active;
  const activeRep = activeStats.rep;
  const activePosition = representativePosition(activeStats.root);
  const activeOverview = repertoireStats(activeRep, activeStats.root);

  return (
    <div className="dashboard">
      <section className="page-head">
        <div>
          <span className="eyebrow">
            <IconZap size={14} /> Your training desk
          </span>
          <h1>{greeting()}</h1>
          <p>Your lines are ready. A focused session now keeps them automatic later.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-ghost" onClick={onImport}>
            <IconUpload size={16} />
            Import PGN
          </button>
          <button type="button" className="btn btn-primary" onClick={onImport}>
            <IconPlus size={16} />
            New repertoire
          </button>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon soft-gold">
            <IconFlame size={19} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Day streak</span>
            <strong className="stat-value">
              {streak}
              <small>{streak === 1 ? 'day' : 'days'}</small>
            </strong>
            <span className="stat-sub">{streak > 0 ? 'Keep the fire alive' : 'Train today to start one'}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon soft-mint">
            <IconTarget size={19} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Due for review</span>
            <strong className="stat-value">{totals.due}</strong>
            <span className="stat-sub">
              {totals.due === 0 ? 'All caught up' : `Across ${repertoires.length} repertoires`}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon soft-blue">
            <IconTrendUp size={19} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Repertoire mastery</span>
            <strong className="stat-value">{totals.mastery}%</strong>
            <span className="stat-sub">
              {totals.mastered} of {totals.positions} positions solid
            </span>
          </div>
          <ProgressRing value={totals.mastery} size={46} stroke={5} />
        </div>
      </section>

      <section className="focus-grid">
        <article className="focus-card">
          <div className="focus-copy">
            <span className="eyebrow">
              <span className="live-dot" /> Continue training
            </span>
            <h2>{activeRep.name}</h2>
            <p>
              {activeRep.opening ?? 'Custom repertoire'} · {sideName(activeRep.color)} repertoire ·{' '}
              {activeStats.lines} lines
            </p>

            <div className="focus-facts">
              <div>
                <span>Mastery</span>
                <strong>{activeOverview.mastery}%</strong>
              </div>
              <div>
                <span>Due now</span>
                <strong className={activeOverview.due > 0 ? 'is-due-text' : ''}>
                  {activeOverview.due}
                </strong>
              </div>
              <div>
                <span>Positions</span>
                <strong>{activeOverview.positions}</strong>
              </div>
              <div>
                <span>Last trained</span>
                <strong className="is-small">{formatRelative(activeRep.lastTrainedAt)}</strong>
              </div>
            </div>

            <div className="focus-progress">
              <span style={{ width: `${activeOverview.mastery}%` }} />
            </div>

            <div className="focus-actions">
              <button type="button" className="btn btn-primary" onClick={() => onTrain(activeRep.id)}>
                <IconPlay size={15} />
                Train now
              </button>
              {activeOverview.due > 0 && (
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => onReview(activeRep.id)}
                >
                  <IconClock size={16} />
                  Review {Math.min(activeOverview.due, 16)} due
                </button>
              )}
              <button type="button" className="text-link" onClick={() => onBrowse(activeRep.id)}>
                Browse lines <IconArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="focus-board">
            <div className="focus-board-top">
              <span>
                <IconBook size={14} /> {activePosition.node.ply > 0 ? `${Math.ceil(activePosition.node.ply / 2)} moves in` : 'Starting position'}
              </span>
              <span className="focus-board-side">
                {sideName(turnOf(activePosition.node.fen))} to move
              </span>
            </div>
            <ChessBoard
              fen={activePosition.node.fen}
              orientation={activeRep.color}
              lastMove={
                activePosition.node.uci
                  ? {
                      from: activePosition.node.uci.slice(0, 2),
                      to: activePosition.node.uci.slice(2, 4),
                    }
                  : null
              }
              arrow={
                activePosition.next?.uci
                  ? {
                      from: activePosition.next.uci.slice(0, 2),
                      to: activePosition.next.uci.slice(2, 4),
                      tone: 'gold',
                    }
                  : null
              }
            />
            {activePosition.next && (
              <div className="focus-move-chip">
                <span className="chip-dot" />
                Repertoire move
                <strong>{activePosition.next.san}</strong>
              </div>
            )}
          </div>
        </article>

        <article className={`review-card card ${totals.due === 0 ? 'is-clear' : ''}`}>
          <div className="review-card-head">
            <span className="card-title">Spaced review</span>
            <span className={`status-chip ${totals.due > 0 ? 'is-live' : ''}`}>
              {totals.due > 0 ? 'Due' : 'Clear'}
            </span>
          </div>
          <div className="review-ring">
            <ProgressRing
              value={
                totals.positions > 0
                  ? Math.round(((totals.positions - totals.due) / totals.positions) * 100)
                  : 100
              }
              size={108}
              stroke={8}
              label="Review coverage"
            >
              <strong>{Math.max(0, totals.positions - totals.due)}</strong>
              <span>of {totals.positions} solid</span>
            </ProgressRing>
          </div>
          <h3>
            {totals.due > 0
              ? `${totals.due} position${totals.due === 1 ? '' : 's'} ready for review`
              : 'Everything is sharp'}
          </h3>
          <p>
            {totals.due > 0
              ? "A short review now is cheaper than a forgotten line in the middlegame."
              : 'No positions are due. Start a fresh drill to keep your pattern recognition warm.'}
          </p>
          {totals.due > 0 ? (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => onReview(activeRep.id)}
            >
              <IconClock size={16} />
              Start review
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-soft btn-block"
              onClick={() => onTrain(activeRep.id)}
            >
              <IconPlay size={15} />
              Train anyway
            </button>
          )}

          <div className="week-strip">
            <div className="week-strip-head">
              <span>This week</span>
              <span>{weekTotal} session{weekTotal === 1 ? '' : 's'}</span>
            </div>
            <div className="week-days">
              {week.map((day) => (
                <div className="week-day" key={day.key}>
                  <span
                    className={`week-bar ${day.count > 0 ? 'has-activity' : ''} ${
                      day.isToday ? 'is-today' : ''
                    }`}
                    title={`${day.count} session${day.count === 1 ? '' : 's'}`}
                  >
                    <span
                      style={{
                        height: `${day.count > 0 ? Math.min(100, 35 + day.count * 22) : 14}%`,
                      }}
                    />
                  </span>
                  <span className="week-label">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="library-section">
        <div className="section-head">
          <div>
            <h2>Your repertoires</h2>
            <p>{repertoires.length} built · every branch drillable</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onImport}>
            <IconPlus size={15} />
            Add repertoire
          </button>
        </div>

        <div className="repertoire-grid">
          {summaries.map((summary) => (
            <RepertoireCard
              key={summary.rep.id}
              summary={summary}
              onTrain={() => onTrain(summary.rep.id)}
              onReview={() => onReview(summary.rep.id)}
              onBrowse={() => onBrowse(summary.rep.id)}
              onDelete={() => onDelete(summary.rep.id)}
            />
          ))}
          <button type="button" className="add-rep-card" onClick={onImport}>
            <span className="add-rep-icon">
              <IconPlus size={20} />
            </span>
            <strong>Add a repertoire</strong>
            <span>Paste another PGN</span>
          </button>
        </div>
      </section>

      <footer className="dashboard-foot">
        <span>chessr keeps your repertoire private and stored in this browser.</span>
        <span className="foot-meta">
          <IconSparkles size={13} /> PGN-aware · variation-first
        </span>
      </footer>
    </div>
  );
}

function RepertoireCard({
  summary,
  onTrain,
  onReview,
  onBrowse,
  onDelete,
}: {
  summary: RepSummary;
  onTrain: () => void;
  onReview: () => void;
  onBrowse: () => void;
  onDelete: () => void;
}) {
  const { rep } = summary;
  const opening = rep.opening ?? 'Custom repertoire';
  return (
    <article className={`rep-card color-${rep.color}`}>
      <div className="rep-card-top">
        <span className={`side-badge ${rep.color}`}>
          <img src={`/pieces/staunty/${rep.color}K.svg`} alt="" />
        </span>
        <div className="rep-card-title">
          <h3>{rep.name}</h3>
          <p>{opening}</p>
        </div>
        <ProgressRing value={summary.mastery} size={52} stroke={5}>
          <strong>{summary.mastery}%</strong>
        </ProgressRing>
      </div>

      <div className="rep-card-facts">
        <span>
          <IconLayers size={14} /> {summary.lines} lines
        </span>
        <span>
          <IconTarget size={14} /> {summary.positions} positions
        </span>
        <span className={summary.due > 0 ? 'is-due-text' : ''}>
          <IconClock size={14} /> {summary.due} due
        </span>
      </div>

      <div className="rep-card-meta">
        <span>{sideName(rep.color)} repertoire</span>
        <span>·</span>
        <span>{formatRelative(rep.lastTrainedAt)}</span>
      </div>

      <div className="rep-card-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onTrain}>
          <IconPlay size={13} />
          Train
        </button>
        {summary.due > 0 && (
          <button type="button" className="btn btn-soft btn-sm" onClick={onReview}>
            Review
          </button>
        )}
        <button type="button" className="icon-btn browse-card-btn" onClick={onBrowse} title="Browse lines">
          <IconArrowUpRight size={16} />
        </button>
        <button
          type="button"
          className="icon-btn delete-card-btn"
          onClick={onDelete}
          title="Delete repertoire"
        >
          <IconXSmall />
        </button>
      </div>
    </article>
  );
}

function IconXSmall() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function EmptyDashboard({ onImport, onSample }: { onImport: () => void; onSample: () => void }) {
  return (
    <div className="dashboard landing">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <IconSparkles size={14} /> The personal repertoire trainer
          </span>
          <h1>
            Turn your openings into <span className="grad-text">muscle memory.</span>
          </h1>
          <p>
            Paste your PGN. chessr keeps every branch intact, auto-plays the opponent, and drills
            your moves until the right one appears without thinking.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onImport}>
              <IconUpload size={17} />
              Import your PGN
            </button>
            <button type="button" className="btn btn-soft btn-lg" onClick={onSample}>
              <IconBook size={17} />
              Try a sample
            </button>
          </div>
          <div className="hero-trust">
            <span>
              <IconCheck size={14} /> Variation-aware
            </span>
            <span>
              <IconCheck size={14} /> Spaced repetition
            </span>
            <span>
              <IconCheck size={14} /> Private by default
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-glow" />
          <div className="hero-board-card">
            <div className="hero-board-head">
              <span className="hero-opening">
                <span className="hero-dot" /> Italian Game
              </span>
              <span className="hero-line">9. Nbd2</span>
            </div>
            <ChessBoard
              fen={HERO_FEN}
              orientation="w"
              lastMove={{ from: 'a7', to: 'a6' }}
              arrow={{ from: 'b1', to: 'd2', tone: 'mint' }}
            />
            <div className="hero-chip hero-chip-top">
              <span className="chip-dot" /> Your move
            </div>
            <div className="hero-chip hero-chip-bottom">
              <IconCheck size={15} />
              <span>Nbd2</span>
              <small>in repertoire</small>
            </div>
          </div>
          <div className="hero-floating-card">
            <div className="floating-head">
              <span>
                <IconTarget size={14} /> Today's review
              </span>
              <strong>12</strong>
            </div>
            <div className="floating-bar">
              <span style={{ width: '72%' }} />
            </div>
            <span className="floating-note">8 already solid</span>
          </div>
        </div>
      </section>

      <section className="how-grid">
        <article className="how-card">
          <span className="how-number">01</span>
          <span className="how-icon soft-mint">
            <IconUpload size={20} />
          </span>
          <h3>Paste any PGN</h3>
          <p>Mainlines, sidelines, comments — everything is read into one clean branching tree.</p>
        </article>
        <article className="how-card">
          <span className="how-number">02</span>
          <span className="how-icon soft-gold">
            <IconTarget size={20} />
          </span>
          <h3>Drill your side</h3>
          <p>Choose White or Black. The opponent replies from your PGN while you recall each move.</p>
        </article>
        <article className="how-card">
          <span className="how-number">03</span>
          <span className="how-icon soft-blue">
            <IconTrendUp size={20} />
          </span>
          <h3>Remember longer</h3>
          <p>Spaced review brings back weak positions exactly when they're about to fade.</p>
        </article>
      </section>

      <section className="landing-note">
        <div>
          <h2>Built for the lines you actually play.</h2>
          <p>
            No opening database to wade through. No engine verdicts. Just your repertoire,
            transformed into a drill that knows exactly where you hesitated.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onImport}>
          Start building
          <IconArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
