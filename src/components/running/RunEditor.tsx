import { useState } from "react";
import { TestGuide } from "./TestGuide.tsx";
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
  type TestKind,
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
          <p>Average speed</p>
          <strong>{totals.runningMinutes > 0 ? `${(totals.runningMiles / (totals.runningMinutes / 60)).toFixed(2)} mph` : "—"}</strong>
          <span>From the running segments</span>
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

      <div className="editor-bar">
        <label className="field">
          <span>Test</span>
          <select
            value={run.testKind ?? ""}
            onChange={(event) => {
              const testKind = event.target.value === "mile" || event.target.value === "fivek" ? event.target.value : null;
              onChange({
                ...run,
                testKind,
                incline: testKind && run.incline == null ? 1 : run.incline,
                continuous: testKind && run.continuous == null ? true : run.continuous,
              });
            }}
          >
            <option value="">Not a time trial</option>
            <option value="mile">1-mile time trial</option>
            <option value="fivek">5K time trial</option>
          </select>
        </label>
        <label className="field">
          <span>Incline %</span>
          <input
            type="number"
            min="0"
            max="15"
            step="0.5"
            value={run.incline ?? ""}
            placeholder="0.5–1 for a test"
            onChange={(event) => onChange({ ...run, incline: parseNumber(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>Effort</span>
          <select
            value={run.continuous == null ? "" : run.continuous ? "continuous" : "walking"}
            onChange={(event) =>
              onChange({
                ...run,
                continuous: event.target.value === "" ? null : event.target.value === "continuous",
              })
            }
          >
            <option value="">Not recorded</option>
            <option value="continuous">Continuous, no walking</option>
            <option value="walking">Included walking</option>
          </select>
        </label>
      </div>
      {run.testKind ? (
        <>
          <p className="callout">
            Do not run this test if your knee hurts or you are unusually sore. Warm-up and walking segments stay out of the time, distance, and pace. Edit the running segment so its time and speed match what you ran.
          </p>
          <TestGuide kind={run.testKind as TestKind} />
        </>
      ) : null}

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
                  inputMode="numeric"
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
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={numberValue(segment.seconds)}
                  onChange={(event) => updateSegment(segment.id, { seconds: parseNumber(event.target.value) ?? 0 })}
                />
              </label>
              <label className="field">
                <span>Speed</span>
                <input
                  type="number"
                  inputMode="decimal"
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

      <div className="editor-actions">
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
        <p className={saved ? "ok save-note" : "meta save-note"}>{saved ? "Saved on this device." : "Not saved yet."}</p>
        {templateSaved ? <p className="ok save-note">Template saved on this device.</p> : null}
      </div>
    </form>
  );
}
