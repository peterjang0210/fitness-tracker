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

function shortSuggestion(note: string, weight: number | null, unit: WorkoutLog["unit"]): string {
  if (weight != null) {
    const shown = formatWeight(weight, unit);
    if (/adds|increase|adds \d/i.test(note)) return `Increase to ${shown}`;
    if (/holds|hold|same weight was missed|lighter/i.test(note)) {
      if (/lighter|7\.5%/i.test(note)) return `Reduce to ${shown}`;
      return `Hold at ${shown}`;
    }
    if (/matches the last|Suggested weight matches/i.test(note)) return `Same as last: ${shown}`;
    return `Suggested ${shown}`;
  }
  return note;
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
  const previous = previousSummary(exercise.exerciseKey, workout, history);
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
          </p>
        </div>
        {!collapsed ? (
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
                onClick={() => {
                  onChange({ ...exercise, status });
                  if (status === "completed") setCollapsed(true);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {!collapsed ? (
        <>
          <div className="exercise-summary">
            <p className="history-line">
              <span className="summary-label">Previous</span> {previous}
            </p>
            <p className="history-line">
              <span className="summary-label">Next</span>{" "}
              {shortSuggestion(suggestion.note, suggestion.weight, workout.unit)}
              {suggestion.weight != null ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="button quiet"
                    disabled={exercise.sets.every((set) => set.weight === suggestion.weight || set.status === "skipped")}
                    onClick={fillSuggestedWeight}
                  >
                    Fill
                  </button>
                </>
              ) : null}
            </p>
            {(exercise.instructions || suggestion.note.length > 80) && (
              <details className="exercise-details">
                <summary>Details</summary>
                {exercise.instructions ? <p className="history-line">{exercise.instructions}</p> : null}
                <p className="history-line">{suggestion.note}</p>
              </details>
            )}
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
                  <button
                    type="button"
                    className={set.status === "skipped" ? "button is-selected" : "button quiet"}
                    onClick={() => updateSet(set.id, { status: set.status === "skipped" ? "pending" : "skipped" })}
                  >
                    {set.status === "skipped" ? "Skipped" : "Skip"}
                  </button>
                  {isCompletedSet(set) ? (
                    <button type="button" className="button quiet" onClick={() => updateSet(set.id, { status: "pending" })}>
                      Edit
                    </button>
                  ) : null}
                  <details className="set-note-details">
                    <summary>Note</summary>
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
