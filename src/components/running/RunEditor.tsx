import { useState } from "react";
import {
  createSegment,
  formatClock,
  formatMiles,
  formatPace,
  runTotals,
  segmentDistance,
  segmentLabels,
  segmentTypes,
  type RunSegment,
  type RunWorkout,
  type SegmentType,
} from "../../domain/running.ts";

function numberValue(value: number | null): string {
  return value == null ? "" : String(value);
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RunEditor({
  run,
  saved,
  templateSaved,
  onChange,
  onSave,
  onSaveTemplate,
  onClose,
  onDelete,
}: {
  run: RunWorkout;
  saved: boolean;
  templateSaved: boolean;
  onChange: (run: RunWorkout) => void;
  onSave: () => void;
  onSaveTemplate: () => void;
  onClose: () => void;
  onDelete: (() => void) | null;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totals = runTotals(run.segments);

  function updateSegment(segmentId: string, patch: Partial<RunSegment>) {
    onChange({
      ...run,
      segments: run.segments.map((segment) => (segment.id === segmentId ? { ...segment, ...patch } : segment)),
    });
  }

  function moveSegment(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= run.segments.length) return;
    const segments = run.segments.slice();
    const [item] = segments.splice(index, 1);
    if (!item) return;
    segments.splice(target, 0, item);
    onChange({ ...run, segments });
  }

  return (
    <form
      className="editor-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="totals" aria-label="Treadmill totals">
        <article className="target-card">
          <p>Running distance</p>
          <strong>{formatMiles(totals.runningMiles)}</strong>
          <span>Running segments only</span>
        </article>
        <article className="target-card">
          <p>Running time</p>
          <strong>{formatClock(totals.runningMinutes)}</strong>
          <span>Walking time excluded</span>
        </article>
        <article className="target-card">
          <p>Average pace</p>
          <strong>{formatPace(totals.paceSecondsPerMile)}</strong>
          <span>Total running time ÷ distance</span>
        </article>
        <article className="target-card">
          <p>Treadmill time</p>
          <strong>{formatClock(totals.totalMinutes)}</strong>
          <span>Includes walking</span>
        </article>
        <article className="target-card">
          <p>Treadmill distance</p>
          <strong>{formatMiles(totals.totalMiles)}</strong>
          <span>Includes walking</span>
        </article>
      </div>

      <div className="editor-bar">
        <label className="field">
          <span>Date</span>
          <input type="date" required value={run.date} onChange={(event) => onChange({ ...run, date: event.target.value })} />
        </label>
        <label className="field grow">
          <span>Session</span>
          <input required value={run.name} onChange={(event) => onChange({ ...run, name: event.target.value })} />
        </label>
      </div>

      {run.segments.map((segment, index) => {
        const counted = segment.type === "running";
        return (
          <article className={counted ? "segment-card" : "segment-card is-walking"} key={segment.id}>
            <div className="segment-grid">
              <label className="field">
                <span>Type</span>
                <select
                  value={segment.type}
                  onChange={(event) => updateSegment(segment.id, { type: event.target.value as SegmentType })}
                >
                  {segmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {segmentLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Minutes</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numberValue(segment.minutes)}
                  onChange={(event) => updateSegment(segment.id, { minutes: parseNumber(event.target.value) ?? 0 })}
                />
              </label>
              <label className="field">
                <span>Seconds</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numberValue(segment.seconds)}
                  onChange={(event) => updateSegment(segment.id, { seconds: parseNumber(event.target.value) ?? 0 })}
                />
              </label>
              <label className="field">
                <span>Speed (mph)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={numberValue(segment.speedMph)}
                  onChange={(event) => updateSegment(segment.id, { speedMph: parseNumber(event.target.value) })}
                />
              </label>
              <p className="segment-distance">
                {segment.label ? <span>{segment.label}</span> : null}
                <strong>{formatMiles(segmentDistance(segment))}</strong>
                <span>{counted ? "Counts toward running" : "Walking, not in pace"}</span>
              </p>
            </div>
            <div className="inline-actions">
              <button type="button" className="button" disabled={index === 0} onClick={() => moveSegment(index, -1)}>
                Move up
              </button>
              <button
                type="button"
                className="button"
                disabled={index === run.segments.length - 1}
                onClick={() => moveSegment(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  const segments = run.segments.slice();
                  segments.splice(index + 1, 0, { ...segment, id: crypto.randomUUID() });
                  onChange({ ...run, segments });
                }}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onChange({ ...run, segments: run.segments.filter((item) => item.id !== segment.id) })}
              >
                Delete
              </button>
            </div>
          </article>
        );
      })}

      <button type="button" className="button" onClick={() => onChange({ ...run, segments: [...run.segments, createSegment()] })}>
        Add segment
      </button>

      <label className="field">
        <span>RPE</span>
        <input
          type="number"
          min="1"
          max="10"
          step="0.5"
          value={run.rpe ?? ""}
          placeholder="1–10, optional"
          onChange={(event) => onChange({ ...run, rpe: parseNumber(event.target.value) })}
        />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea
          rows={3}
          value={run.notes}
          placeholder="How the run felt"
          onChange={(event) => onChange({ ...run, notes: event.target.value })}
        />
      </label>

      <div className="inline-actions">
        <button type="submit" className="button primary">
          {run.status === "skipped" ? "Save skip" : "Save run"}
        </button>
        {run.planWeek ? (
          <button
            type="button"
            className="button"
            onClick={() => onChange({ ...run, status: run.status === "skipped" ? "logged" : "skipped" })}
          >
            {run.status === "skipped" ? "Mark as logged" : "Mark skipped"}
          </button>
        ) : null}
        <button type="button" className="button" onClick={onSaveTemplate}>
          Save as template
        </button>
        <button type="button" className="button" onClick={onClose}>
          Back
        </button>
        {onDelete ? (
          confirmDelete ? (
            <>
              <button type="button" className="button danger" onClick={onDelete}>
                Confirm delete
              </button>
              <button type="button" className="button" onClick={() => setConfirmDelete(false)}>
                Keep run
              </button>
            </>
          ) : (
            <button type="button" className="button danger" onClick={() => setConfirmDelete(true)}>
              Delete run
            </button>
          )
        ) : null}
        {saved ? <p className="ok">Run saved in this browser.</p> : null}
        {templateSaved ? <p className="ok">Template saved in this browser.</p> : null}
      </div>
    </form>
  );
}
