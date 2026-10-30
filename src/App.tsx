import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Repertoire, SessionSummary } from './lib/types';
import { emptyStat, parsePgn } from './lib/chess';
import { SAMPLE_WHITE_PGN } from './lib/samples';
import {
  dateKey,
  dayStreak,
  loadActivity,
  loadMuted,
  loadRepertoires,
  newId,
  saveActivity,
  saveMuted,
  saveRepertoires,
  type Activity,
} from './lib/storage';
import { Dashboard } from './components/Dashboard';
import { Browse } from './components/Browse';
import { Trainer } from './components/Trainer';
import { TopNav } from './components/TopNav';
import { ImportDialog } from './components/ImportDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast, type ToastState } from './components/Toast';
import { unlockAudio } from './lib/sound';

type View =
  | { kind: 'home' }
  | { kind: 'train'; repId: string; mode: 'train' | 'review' }
  | { kind: 'browse'; repId: string };

export default function App() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>(() => loadRepertoires());
  const [activity, setActivity] = useState<Activity>(() => loadActivity());
  const [muted, setMuted] = useState<boolean>(() => loadMuted());
  const [view, setView] = useState<View>({ kind: 'home' });
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastId = useRef(0);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const showToast = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    toastId.current += 1;
    setToast({ message, kind, id: toastId.current });
  }, []);

  useEffect(() => {
    saveRepertoires(repertoires);
  }, [repertoires]);

  useEffect(() => {
    saveActivity(activity);
  }, [activity]);

  useEffect(() => {
    saveMuted(muted);
  }, [muted]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (view.kind !== 'home' && !repertoires.some((rep) => rep.id === view.repId)) {
      setView({ kind: 'home' });
    }
  }, [repertoires, view]);

  const activeRep = useMemo(
    () => (view.kind === 'home' ? null : repertoires.find((rep) => rep.id === view.repId) ?? null),
    [repertoires, view],
  );

  const streak = useMemo(() => dayStreak(activity), [activity]);

  const updateStat = useCallback(
    (repId: string, key: string, updater: (stat: ReturnType<typeof emptyStat>) => ReturnType<typeof emptyStat>) => {
      setRepertoires((previous) =>
        previous.map((rep) => {
          if (rep.id !== repId) return rep;
          const stats = { ...rep.stats };
          stats[key] = updater(stats[key] ?? emptyStat());
          return { ...rep, stats, updatedAt: Date.now() };
        }),
      );
    },
    [],
  );

  const handleComplete = useCallback((repId: string, _summary: SessionSummary) => {
    const now = Date.now();
    setRepertoires((previous) =>
      previous.map((rep) =>
        rep.id === repId
          ? { ...rep, sessions: rep.sessions + 1, lastTrainedAt: now, updatedAt: now }
          : rep,
      ),
    );
    setActivity((previous) => {
      const key = dateKey();
      return { ...previous, [key]: (previous[key] ?? 0) + 1 };
    });
  }, []);

  const handleAdd = useCallback(
    (rep: Repertoire) => {
      setRepertoires((previous) => [rep, ...previous]);
      setImportOpen(false);
      showToast(`“${rep.name}” is ready to drill`, 'success');
      setView({ kind: 'train', repId: rep.id, mode: 'train' });
    },
    [showToast],
  );

  const loadSample = useCallback(() => {
    const name = 'Italian Game — White';
    const parsed = parsePgn(SAMPLE_WHITE_PGN);
    const now = Date.now();
    const rep: Repertoire = {
      id: newId(),
      name,
      color: 'w',
      pgn: SAMPLE_WHITE_PGN,
      opening: parsed.opening,
      createdAt: now,
      updatedAt: now,
      lastTrainedAt: null,
      sessions: 0,
      stats: {},
    };
    setRepertoires((previous) => [rep, ...previous]);
    showToast('Sample repertoire added — Italian Game for White', 'success');
    setView({ kind: 'home' });
  }, [showToast]);

  const repToDelete = repertoires.find((rep) => rep.id === deleteId) ?? null;

  const confirmDelete = () => {
    if (!repToDelete) return;
    setRepertoires((previous) => previous.filter((rep) => rep.id !== repToDelete.id));
    if (view.kind !== 'home' && view.repId === repToDelete.id) setView({ kind: 'home' });
    setDeleteId(null);
    showToast(`Deleted “${repToDelete.name}”`, 'info');
  };

  const onImport = useCallback(() => setImportOpen(true), []);
  const onHome = useCallback(() => setView({ kind: 'home' }), []);
  const toggleMute = useCallback(() => {
    unlockAudio();
    setMuted((value) => !value);
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true">
        <span className="bg-orb orb-a" />
        <span className="bg-orb orb-b" />
        <span className="bg-grid" />
      </div>

      <TopNav
        view={view.kind}
        context={activeRep?.name}
        streak={streak}
        muted={muted}
        onHome={onHome}
        onImport={onImport}
        onToggleMute={toggleMute}
      />

      <div className="app-content">
        {view.kind === 'home' && (
          <Dashboard
            repertoires={repertoires}
            activity={activity}
            onImport={onImport}
            onSample={loadSample}
            onTrain={(id) => setView({ kind: 'train', repId: id, mode: 'train' })}
            onReview={(id) => setView({ kind: 'train', repId: id, mode: 'review' })}
            onBrowse={(id) => setView({ kind: 'browse', repId: id })}
            onDelete={setDeleteId}
          />
        )}

        {view.kind === 'train' && activeRep && (
          <Trainer
            key={`${activeRep.id}-${view.mode}`}
            repertoire={activeRep}
            muted={muted}
            initialMode={view.mode}
            onExit={onHome}
            onBrowse={() => setView({ kind: 'browse', repId: activeRep.id })}
            onUpdateStat={(key, updater) => updateStat(activeRep.id, key, updater)}
            onComplete={(summary) => handleComplete(activeRep.id, summary)}
          />
        )}

        {view.kind === 'browse' && activeRep && (
          <Browse
            key={activeRep.id}
            repertoire={activeRep}
            onBack={onHome}
            onTrain={() => setView({ kind: 'train', repId: activeRep.id, mode: 'train' })}
            onDelete={() => setDeleteId(activeRep.id)}
            onToast={showToast}
          />
        )}
      </div>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onAdd={handleAdd}
        />
      )}

      {repToDelete && (
        <ConfirmDialog
          title={`Delete “${repToDelete.name}”?`}
          message="This removes the PGN and all training history for this repertoire. It can't be undone."
          onConfirm={confirmDelete}
          onClose={() => setDeleteId(null)}
        />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
