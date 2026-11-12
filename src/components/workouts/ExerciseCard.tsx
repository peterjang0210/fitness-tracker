import { useState } from "react";
import type { ExerciseLog, SetLog, WorkoutLog } from "../../domain/workoutLog.ts";
import { formatWeight } from "../../domain/strengthProgram.ts";
import { applySetPatch, createSet, isCompletedSet, previousSummary, resizeSets, setSignature, suggestedWeight } from "../../domain/workoutLog.ts";

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
  onDuplicate,
  savedSignatures,
  onFlush,
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
  onDuplicate: () => void;
  savedSignatures: Record<string, string>;
  onFlush: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const suggestion = suggestedWeight(exercise.exerciseKey, workout, history);
  const previous = previousSummary(exercise.exerciseKey, workout, history);

  function updateSet(setId: string, patch: Partial<SetLog>) {
    onChange({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? applySetPatch(set, patch) : set)),
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
            {exercise.targetWeight != null ? ` · ${formatWeight(exercise.targetWeight, workout.unit)}` : ""}
          </p>
          {exercise.instructions ? <p className="history-line">{exercise.instructions}</p> : null}
        </div>
        <div className="status-row" role="group" aria-label={`${exercise.name} status`}>
          {(
            [
              ["pending", "To do"],
              ["completed", "Done"],
              ["skipped", "Skip"],
            ] as const
          ).map(([status, label]) => (
            <button
              key={status}
              type="button"
              className={exercise.status === status ? "button is-selected" : "button"}
              aria-pressed={exercise.status === status}
              onClick={() => onChange({ ...exercise, status })}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <p className="history-line">{previous}</p>
      <p className="history-line">
        {suggestion.note}
        {suggestion.weight != null ? (
          <>
            {" "}
            <button
              type="button"
              className="button quiet"
              disabled={exercise.sets.every((set) => set.weight === suggestion.weight)}
              onClick={() =>
                onChange({
                  ...exercise,
                  sets: exercise.sets.map((set) => ({ ...set, weight: suggestion.weight })),
                })
              }
            >
              Fill sets
            </button>
          </>
        ) : null}
      </p>

      <div className="set-table">
        <div className="set-head" aria-hidden="true">
          <span />
          <span>Weight ({workout.unit})</span>
          <span>Reps</span>
          <span>RPE</span>
          <span />
        </div>
        {exercise.sets.map((set, setIndex) => (
          <div className={set.status === "skipped" ? "set-block is-skipped" : "set-block"} key={set.id}>
            <div className="set-row">
              <span className="set-index">{setIndex + 1}</span>
              <label className="field">
                <span className="sr-only">Set {setIndex + 1} weight</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  aria-label={`Set ${setIndex + 1} weight`}
                  value={numberValue(set.weight)}
                  placeholder={exercise.exerciseKey === "bodyweight-dips" ? "BW" : "0"}
                  onChange={(event) => updateSet(set.id, { weight: parseNumber(event.target.value) })}
                  onBlur={onFlush}
                />
              </label>
              <label className="field">
                <span className="sr-only">Set {setIndex + 1} reps</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  aria-label={`Set ${setIndex + 1} reps`}
                  value={numberValue(set.reps)}
                  placeholder={exercise.repTarget || "0"}
                  onChange={(event) => updateSet(set.id, { reps: parseNumber(event.target.value) })}
                  onBlur={onFlush}
                />
              </label>
              <label className="field">
                <span className="sr-only">Set {setIndex + 1} RPE</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="10"
                  step="0.5"
                  aria-label={`Set ${setIndex + 1} RPE`}
                  value={numberValue(set.rpe)}
                  placeholder="—"
                  onChange={(event) => updateSet(set.id, { rpe: parseNumber(event.target.value) })}
                  onBlur={onFlush}
                />
              </label>
              <button
                type="button"
                className="button quiet"
                aria-label={`Remove set ${setIndex + 1}`}
                disabled={exercise.sets.length === 1}
                onClick={() => onChange({ ...exercise, sets: exercise.sets.filter((item) => item.id !== set.id) })}
              >
                ×
              </button>
            </div>
            <div className="set-extra">
              <input
                className="set-note"
                aria-label={`Set ${setIndex + 1} notes`}
                value={set.notes ?? ""}
                placeholder="Set note"
                onChange={(event) => updateSet(set.id, { notes: event.target.value })}
                onBlur={onFlush}
              />
              <button
                type="button"
                className={set.status === "skipped" ? "button is-selected" : "button quiet"}
                onClick={() => updateSet(set.id, { status: set.status === "skipped" ? "pending" : "skipped" })}
              >
                {set.status === "skipped" ? "Skipped" : "Skip set"}
              </button>
              {isCompletedSet(set) ? (
                <button type="button" className="button quiet" onClick={() => updateSet(set.id, { status: "pending" })}>
                  Mark incomplete
                </button>
              ) : null}
              <span className={isCompletedSet(set) ? "set-save" : "set-save is-pending"}>{saveLabel(set, savedSignatures)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="button"
          onClick={() => onChange({ ...exercise, sets: [...exercise.sets, createSet()] })}
        >
          Add set
        </button>
        <button type="button" className="button quiet" onClick={() => setEditing((value) => !value)}>
          {editing ? "Close details" : "Edit exercise"}
        </button>
      </div>

      {editing ? (
        <>
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
            <label className="field">
              <span>Sets</span>
              <input
                type="number"
                min="1"
                max="12"
                value={exercise.sets.length}
                onChange={(event) => onChange(resizeSets(exercise, Number(event.target.value)))}
              />
            </label>
            <label className="field">
              <span>Target weight ({workout.unit})</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={numberValue(exercise.targetWeight ?? null)}
                onChange={(event) => onChange({ ...exercise, targetWeight: parseNumber(event.target.value) })}
              />
            </label>
          </div>
          <label className="field">
            <span>Instructions</span>
            <textarea
              rows={2}
              value={exercise.instructions ?? ""}
              placeholder="Cues for this exercise"
              onChange={(event) => onChange({ ...exercise, instructions: event.target.value })}
              onBlur={onFlush}
            />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea
              rows={2}
              value={exercise.notes}
          placeholder="How the sets felt"
          onChange={(event) => onChange({ ...exercise, notes: event.target.value })}
          onBlur={onFlush}
            />
          </label>
          <div className="inline-actions">
            <button type="button" className="button" disabled={index === 0} onClick={() => onMove(-1)}>
              Move up
            </button>
            <button type="button" className="button" disabled={index === count - 1} onClick={() => onMove(1)}>
              Move down
            </button>
            <button type="button" className="button" onClick={onDuplicate}>
              Duplicate
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
        </>
      ) : exercise.notes ? (
        <p className="history-line">{exercise.notes}</p>
      ) : null}
    </article>
  );
}

function saveLabel(set: SetLog, savedSignatures: Record<string, string>): string {
  const touched =
    set.weight != null || set.reps != null || set.rpe != null || Boolean(set.notes?.trim()) || set.status === "skipped" || set.status === "completed";
  const stored = savedSignatures[set.id];
  if (!touched && stored == null) return "";
  if (stored !== setSignature(set)) return "Saving…";
  if (set.status === "skipped") return "Skipped";
  if (isCompletedSet(set)) return "Saved";
  return "Saved, incomplete";
}
