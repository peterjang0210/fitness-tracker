import { useState } from "react";
import type { ExerciseLog, SetLog, WorkoutLog } from "../../domain/workoutLog.ts";
import { formatWeight } from "../../domain/strengthProgram.ts";
import { previousSummary, suggestedWeight } from "../../domain/workoutLog.ts";

function numberValue(value: number | null): string {
  return value == null ? "" : String(value);
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ExerciseCard({
  exercise,
  index,
  count,
  supersetLabel,
  workout,
  history,
  onChange,
  onMove,
  onLink,
  onUnlink,
  onRemove,
}: {
  exercise: ExerciseLog;
  index: number;
  count: number;
  supersetLabel: string | null;
  workout: WorkoutLog;
  history: WorkoutLog[];
  onChange: (exercise: ExerciseLog) => void;
  onMove: (direction: -1 | 1) => void;
  onLink: () => void;
  onUnlink: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const suggestion = suggestedWeight(exercise.exerciseKey, workout, history);
  const previous = previousSummary(exercise.exerciseKey, workout, history);

  function updateSet(setId: string, patch: Partial<SetLog>) {
    onChange({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
    });
  }

  return (
    <article
      className={[
        "exercise-card",
        exercise.supersetId ? "is-superset" : "",
        exercise.status === "skipped" ? "is-skipped" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="exercise-head">
        <div>
          {supersetLabel ? <p className="superset-label">{supersetLabel}</p> : null}
          <h2>
            {exercise.name}
            {exercise.optional ? <span className="optional-tag">Optional</span> : null}
          </h2>
          <p className="meta">
            {exercise.prescription || "No prescription"}
            {exercise.repTarget ? ` · target ${exercise.repTarget}` : ""}
          </p>
          <button type="button" className="button quiet" onClick={() => setEditing((value) => !value)}>
            {editing ? "Close details" : "Edit exercise"}
          </button>
        </div>
        <div className="status-row" role="group" aria-label={`${exercise.name} status`}>
          {(["pending", "completed", "skipped"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={exercise.status === status ? "button is-selected" : "button"}
              aria-pressed={exercise.status === status}
              onClick={() => onChange({ ...exercise, status })}
            >
              {status}
            </button>
          ))}
        </div>
      </header>

      {editing ? (
        <div className="edit-grid">
          <label className="field">
            <span>Name</span>
            <input value={exercise.name} onChange={(event) => onChange({ ...exercise, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Prescription</span>
            <input value={exercise.prescription} onChange={(event) => onChange({ ...exercise, prescription: event.target.value })} />
          </label>
          <label className="field">
            <span>Rep target</span>
            <input value={exercise.repTarget} onChange={(event) => onChange({ ...exercise, repTarget: event.target.value })} />
          </label>
        </div>
      ) : null}

      <p className="history-line">
        <strong>Previous. </strong>
        {previous}
      </p>
      <p className="history-line">
        <strong>Suggested. </strong>
        {suggestion.note}
      </p>
      {suggestion.weight != null ? (
        <button
          type="button"
          className="button"
          disabled={exercise.sets.every((set) => set.weight === suggestion.weight)}
          onClick={() =>
            onChange({
              ...exercise,
              sets: exercise.sets.map((set) => ({ ...set, weight: suggestion.weight })),
            })
          }
        >
          Use {formatWeight(suggestion.weight, workout.unit)} on this draft
        </button>
      ) : null}

      <div className="set-table">
        {exercise.sets.map((set, setIndex) => (
          <div className="set-row" key={set.id}>
            <span className="set-index">{setIndex + 1}</span>
            <label className="field">
              <span>Weight ({workout.unit})</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={numberValue(set.weight)}
                placeholder={exercise.exerciseKey === "bodyweight-dips" ? "BW" : "0"}
                onChange={(event) => updateSet(set.id, { weight: parseNumber(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Reps</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={numberValue(set.reps)}
                placeholder={exercise.repTarget}
                onChange={(event) => updateSet(set.id, { reps: parseNumber(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>RPE</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                max="10"
                step="0.5"
                value={numberValue(set.rpe)}
                placeholder="1–10"
                onChange={(event) => updateSet(set.id, { rpe: parseNumber(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className="button quiet"
              disabled={exercise.sets.length === 1}
              onClick={() => onChange({ ...exercise, sets: exercise.sets.filter((item) => item.id !== set.id) })}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="button"
          onClick={() => onChange({ ...exercise, sets: [...exercise.sets, { id: crypto.randomUUID(), weight: null, reps: null, rpe: null }] })}
        >
          Add set
        </button>
        <button type="button" className="button" disabled={index === 0} onClick={() => onMove(-1)}>
          Move up
        </button>
        <button type="button" className="button" disabled={index === count - 1} onClick={() => onMove(1)}>
          Move down
        </button>
        <button type="button" className="button" disabled={index === count - 1} onClick={onLink}>
          Superset with next
        </button>
        {exercise.supersetId ? (
          <button type="button" className="button" onClick={onUnlink}>
            Remove from superset
          </button>
        ) : null}
        {confirmRemove ? (
          <button type="button" className="button danger" onClick={onRemove}>
            Confirm remove
          </button>
        ) : (
          <button type="button" className="button" onClick={() => setConfirmRemove(true)}>
            Remove exercise
          </button>
        )}
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={exercise.notes}
          placeholder="How the sets felt"
          onChange={(event) => onChange({ ...exercise, notes: event.target.value })}
        />
      </label>
    </article>
  );
}
