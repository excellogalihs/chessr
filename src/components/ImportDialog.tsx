import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Color, Repertoire } from '../lib/types';
import { parsePgn, quizPositions, sideName } from '../lib/chess';
import { newId } from '../lib/storage';
import { pieceSrc } from '../lib/assets';
import { SAMPLE_BLACK_PGN, SAMPLE_WHITE_PGN } from '../lib/samples';
import { IconCheck, IconInfo, IconSparkles, IconUpload, IconX } from './Icons';
import { Modal } from './Modal';

interface ImportDialogProps {
  onClose: () => void;
  onAdd: (repertoire: Repertoire) => void;
}

export function ImportDialog({ onClose, onAdd }: ImportDialogProps) {
  const [pgn, setPgn] = useState('');
  const [color, setColor] = useState<Color>('w');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const deferredPgn = useDeferredValue(pgn);
  const preview = useMemo(() => {
    if (!deferredPgn.trim()) return null;
    return parsePgn(deferredPgn);
  }, [deferredPgn]);

  const positions = useMemo(
    () => (preview ? quizPositions(preview.root, color) : []),
    [preview, color],
  );

  useEffect(() => {
    if (nameTouched || !preview || preview.errors.length > 0) return;
    const suggested =
      preview.event ??
      (preview.opening ? `${preview.opening} — ${sideName(color)}` : 'My repertoire');
    setName(suggested);
  }, [preview, color, nameTouched]);

  const valid =
    !!preview &&
    preview.errors.length === 0 &&
    preview.moves > 0 &&
    positions.length > 0 &&
    name.trim().length > 0;

  const loadSample = (sample: 'white' | 'black') => {
    setPgn(sample === 'white' ? SAMPLE_WHITE_PGN : SAMPLE_BLACK_PGN);
    setColor(sample === 'white' ? 'w' : 'b');
    setName(sample === 'white' ? 'Italian Game — White' : 'Caro-Kann — Black');
    setNameTouched(true);
  };

  const submit = () => {
    if (!valid || !preview) return;
    const now = Date.now();
    onAdd({
      id: newId(),
      name: name.trim(),
      color,
      pgn,
      opening: preview.opening,
      createdAt: now,
      updatedAt: now,
      lastTrainedAt: null,
      sessions: 0,
      stats: {},
    });
  };

  const colorName = sideName(color);

  return (
    <Modal className="import-modal" onClose={onClose} title="New repertoire">
      <div className="modal-head">
        <div>
          <span className="eyebrow">
            <IconUpload size={14} /> Import
          </span>
          <h2>Build a repertoire</h2>
          <p>Paste your opening PGN. Every variation becomes a line to master.</p>
        </div>
      </div>

      <div className="sample-strip">
        <span>No PGN handy?</span>
        <button type="button" className="sample-chip" onClick={() => loadSample('white')}>
          <img src={pieceSrc('w', 'k')} alt="" />
          Italian · White
        </button>
        <button type="button" className="sample-chip" onClick={() => loadSample('black')}>
          <img src={pieceSrc('b', 'k')} alt="" />
          Caro-Kann · Black
        </button>
      </div>

      <div className="import-fields">
        <label className="field">
          <span className="field-label">Repertoire name</span>
          <input
            value={name}
            placeholder="e.g. Italian Game — White"
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
            }}
          />
        </label>

        <div className="field">
          <span className="field-label">I play</span>
          <div className="color-toggle" role="group" aria-label="Choose your color">
            <button
              type="button"
              className={`color-option ${color === 'w' ? 'active' : ''}`}
              onClick={() => setColor('w')}
            >
              <img src={pieceSrc('w', 'k')} alt="" />
              White
            </button>
            <button
              type="button"
              className={`color-option ${color === 'b' ? 'active' : ''}`}
              onClick={() => setColor('b')}
            >
              <img src={pieceSrc('b', 'k')} alt="" />
              Black
            </button>
          </div>
        </div>
      </div>

      <div className="field pgn-field">
        <div className="field-label-row">
          <span className="field-label">PGN</span>
          <span className="field-hint">Variations and comments are preserved</span>
        </div>
        <textarea
          value={pgn}
          onChange={(event) => setPgn(event.target.value)}
          spellCheck={false}
          placeholder={`[Event "My repertoire"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5\n(3... Nf6 4. d3 Bc5 5. c3)\n4. c3 Nf6 5. d3 d6 6. O-O`}
          aria-label="PGN input"
        />
      </div>

      {preview && (
        <div className={`parse-panel ${preview.errors.length > 0 ? 'has-errors' : 'is-valid'}`}>
          {preview.errors.length > 0 ? (
            <div className="parse-errors">
              <div className="parse-error-title">
                <IconX size={16} />
                We couldn't read this PGN
              </div>
              <ul>
                {preview.errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="parse-stats">
                <div>
                  <strong>{preview.moves}</strong>
                  <span>moves</span>
                </div>
                <div>
                  <strong>{preview.leaves}</strong>
                  <span>lines</span>
                </div>
                <div>
                  <strong>{positions.length}</strong>
                  <span>{colorName.toLowerCase()} positions</span>
                </div>
              </div>
              <div className="parse-verdict">
                {positions.length > 0 ? (
                  <>
                    <IconCheck size={15} />
                    Ready to drill
                    {(preview.opening || preview.event) && (
                      <span className="parse-opening">
                        · {preview.opening ?? preview.event}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <IconInfo size={15} />
                    No {colorName.toLowerCase()} moves found — try the other color.
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!preview && (
        <div className="parse-empty">
          <IconSparkles size={16} />
          Paste a PGN to see your repertoire take shape.
        </div>
      )}

      <div className="modal-footer">
        <span className="privacy-note">Saved privately in this browser</span>
        <div className="modal-footer-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={submit}>
            <IconUpload size={16} />
            Create repertoire
          </button>
        </div>
      </div>
    </Modal>
  );
}
