import { useState } from "react";
import type { ExerciseLog, SetLog, WorkoutLog } from "../../domain/workoutLog.ts";
import { formatWeight } from "../../domain/strengthProgram.ts";
import { applySetPatch, createSet, formatDisplayDate, isCompletedSet, previousExercise, resizeSets, setSignature, suggestedWeight } from "../../domain/workoutLog.ts";

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
  const [collapsed, setCollapsed] = useState(exercise.status === "completed");
  const suggestion = suggestedWeight(exercise.exerciseKey, workout, history);
  const previous = compactPrevious(exercise.exerciseKey, workout, history);
  const doneCount = exercise.sets.filter(isCompletedSet).length;
  const totalSets = exercise.sets.length;

  function updateSet(setId: string, patch: Partial<SetLog>) {
    const nextSets = exercise.sets.map((set) => (set.id === setId ? applySetPatch(set, patch) : set));

    // Carry weight forward into later empty sets when the user enters a load.
    if (patch.weight != null) {
      const at = nextSets.findIndex((set) => set.id === setId);
      for (let i = at + 1; i < nextSets.length; i += 1) {
        const later = nextSets[i];
        if (!later || later.weight != null || later.status === "skipped" || isCompletedSet(later)) continue;
        nextSets[i] = { ...later, weight: patch.weight };
      }
    }

    onChange({ ...exercise, sets: nextSets });
  }

  function fillSuggestedWeight() {
    if (suggestion.weight == null) return;
    onChange({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.status === "skipped" || isCompletedSet(set) ? set : { ...set, weight: suggestion.weight },
      ),
    });
  }

  const compactMeta = [
    exercise.prescription || null,
    exercise.repTarget ? `target ${exercise.repTarget}` : null,
    exercise.targetWeight != null ? formatWeight(exercise.targetWeight, workout.unit) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={[
        "exercise-card",
        exercise.supersetId ? "is-superset" : "",
        exercise.status === "skipped" ? "is-skipped" : "",
        collapsed ? "is-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="exercise-head">
        <div className="exercise-title-block">
          {supersetLabel ? <p className="superset-label">{supersetLabel}</p> : null}
          <div className="exercise-title-row">
            <h2>
              {exercise.name}
              {exercise.optional ? <span className="optional-tag">Optional</span> : null}
            </h2>
            <button
              type="button"
              className="button quiet collapse-toggle"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          {compactMeta ? <p className="meta">{compactMeta}</p> : null}
          <p className="meta set-progress">
            {doneCount}/{totalSets} sets
            {exercise.status === "completed" ? " · done" : ""}
            {exercise.status === "skipped" ? " · skipped" : ""}
            {exercise.status === "pending" ? " · to do" : ""}
          </p>
        </div>
        {!collapsed ? (
          <label className="field status-field">
            <span>Status</span>
            <select
              aria-label={`${exercise.name} status`}
              value={exercise.status}
              onChange={(event) => {
                const status = event.target.value as ExerciseLog["status"];
                onChange({ ...exercise, status });
                if (status === "completed") setCollapsed(true);
              }}
            >
              <option value="pending">To do</option>
              <option value="completed">Done</option>
              <option value="skipped">Skip</option>
            </select>
          </label>
        ) : null}
      </header>

      {!collapsed ? (
        <>
          <div className="exercise-summary">
            <p className="history-line">Previous: {previous}</p>
            <p className="history-line">Next: {suggestion.weight == null ? "enter a weight" : formatWeight(suggestion.weight, workout.unit)}</p>
          </div>

          <div className="set-table">
            <div className="set-head" aria-hidden="true">
              <span>#</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>RPE</span>
              <span />
            </div>
            {exercise.sets.map((set, setIndex) => (
              <div className={set.status === "skipped" ? "set-block is-skipped" : "set-block"} key={set.id}>
                <div className="set-row">
                  <span className="set-index">{setIndex + 1}</span>
                  <label className="field set-field">
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
                  <label className="field set-field set-field-reps">
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
                  <label className="field set-field set-field-rpe">
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
                    className="button quiet set-remove"
                    aria-label={`Remove set ${setIndex + 1}`}
                    disabled={exercise.sets.length === 1}
                    onClick={() => onChange({ ...exercise, sets: exercise.sets.filter((item) => item.id !== set.id) })}
                  >
                    ×
                  </button>
                </div>
                <div className="set-extra">
                  <span className={isCompletedSet(set) ? "set-save" : "set-save is-pending"}>{saveLabel(set, savedSignatures)}</span>
                  <details className="set-note-details">
                    <summary>Options</summary>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className={set.status === "skipped" ? "button is-selected" : "button quiet"}
                        onClick={() => updateSet(set.id, { status: set.status === "skipped" ? "pending" : "skipped" })}
                      >
                        {set.status === "skipped" ? "Skipped" : "Skip set"}
                      </button>
                    </div>
                    <input
                      className="set-note"
                      aria-label={`Set ${setIndex + 1} notes`}
                      value={set.notes ?? ""}
                      placeholder="Optional set note"
                      onChange={(event) => updateSet(set.id, { notes: event.target.value })}
                      onBlur={onFlush}
                    />
                  </details>
                </div>
              </div>
            ))}
          </div>

          <div className="inline-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                const last = exercise.sets.at(-1);
                onChange({
                  ...exercise,
                  sets: [...exercise.sets, { ...createSet(), weight: last?.weight ?? suggestion.weight }],
                });
              }}
            >
              Add set
            </button>
            <button type="button" className="button quiet" onClick={() => setEditing((value) => !value)}>
              {editing ? "Close" : "More"}
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
                    inputMode="numeric"
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
                    inputMode="decimal"
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
              {suggestion.weight != null ? (
                <button
                  type="button"
                  className="button quiet"
                  disabled={exercise.sets.every((set) => set.weight === suggestion.weight || set.status === "skipped")}
                  onClick={fillSuggestedWeight}
                >
                  Fill {formatWeight(suggestion.weight, workout.unit)}
                </button>
              ) : null}
              <p className="history-line">{suggestion.note}</p>
              {exercise.instructions ? <p className="history-line">{exercise.instructions}</p> : null}
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
        </>
      ) : null}
    </article>
  );
}

function compactPrevious(exerciseKey: string, workout: WorkoutLog, history: WorkoutLog[]): string {
  const previous = previousExercise(history, workout, exerciseKey);
  if (!previous) return "none yet";
  const set = previous.exercise.sets.find(isCompletedSet);
  if (!set) return "none yet";
  const [year, month, day] = previous.workout.date.split("-").map(Number);
  const when = year && month && day ? new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : formatDisplayDate(previous.workout.date);
  const weight = set.weight == null ? "BW" : formatWeight(set.weight, previous.workout.unit);
  return `${when} · ${weight} × ${set.reps ?? "—"}`;
}

function saveLabel(set: SetLog, savedSignatures: Record<string, string>): string {
  const touched =
    set.weight != null || set.reps != null || set.rpe != null || Boolean(set.notes?.trim()) || set.status === "skipped" || set.status === "completed";
  const stored = savedSignatures[set.id];
  if (!touched && stored == null) return "";
  if (stored !== setSignature(set)) return "Saving…";
  if (set.status === "skipped") return "Skipped";
  if (isCompletedSet(set)) return "Saved";
  return "Draft";
}
