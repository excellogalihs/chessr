import { pieceSrc } from '../lib/assets';
import { IconFlame, IconPlus, IconVolume, IconVolumeOff } from './Icons';

interface TopNavProps {
  view: 'home' | 'train' | 'browse';
  context?: string;
  streak: number;
  muted: boolean;
  onHome: () => void;
  onImport: () => void;
  onToggleMute: () => void;
}

export function TopNav({
  view,
  context,
  streak,
  muted,
  onHome,
  onImport,
  onToggleMute,
}: TopNavProps) {
  const label = view === 'home' ? 'Dashboard' : view === 'train' ? 'Training' : 'Repertoire';

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="brand" onClick={onHome} aria-label="chessr home">
          <span className="brand-mark">
            <img src={pieceSrc('w', 'n')} alt="" />
          </span>
          <span className="brand-word">chessr</span>
        </button>

        <div className="topbar-crumb">
          <span className="crumb-dim">{label}</span>
          {view !== 'home' && context && (
            <>
              <span className="crumb-slash">/</span>
              <span className="crumb-current">{context}</span>
            </>
          )}
        </div>

        <div className="topbar-actions">
          <div className={`streak-pill ${streak === 0 ? 'is-empty' : ''}`} title="Consecutive training days">
            <IconFlame size={16} />
            <span className="streak-count">{streak}</span>
            <span className="streak-label">{streak === 1 ? 'day' : 'days'}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleMute}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
          </button>
          <button type="button" className="btn btn-primary btn-sm new-rep-btn" onClick={onImport}>
            <IconPlus size={16} />
            <span>New repertoire</span>
          </button>
        </div>
      </div>
    </header>
  );
}
