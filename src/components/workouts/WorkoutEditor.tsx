import { useState } from "react";
import { isProgramSessionKey, TESTING_WEEK } from "../../domain/strengthProgram.ts";
import type { WorkoutLog } from "../../domain/workoutLog.ts";
import { duplicateExercise, exerciseFromLibrary, linkWithNext, moveExercise, supersetLabels, unlinkExercise, workoutHasLoggedSets } from "../../domain/workoutLog.ts";
import type { LibraryExercise } from "../../storage/appData.ts";
import { ExerciseCard } from "./ExerciseCard.tsx";
import { ExercisePicker } from "./ExercisePicker.tsx";

export function WorkoutEditor({
  workout,
  history,
  library,
  saved,
  planSaved,
  usesFutureList,
  savedSignatures,
  saving,
  onChange,
  onFlush,
  onSave,
  onClose,
  onDelete,
  onCreateExercise,
  onApplyFuture,
  onRestore,
}: {
  workout: WorkoutLog;
  history: WorkoutLog[];
  library: LibraryExercise[];
  saved: boolean;
  planSaved: boolean;
  usesFutureList: boolean;
  savedSignatures: Record<string, string>;
  saving: boolean;
  onChange: (workout: WorkoutLog, autosave?: boolean) => void;
  onFlush: () => void;
  onSave: () => void;
  onClose: () => void;
  onDelete: (() => void) | null;
  onCreateExercise: (exercise: LibraryExercise) => void;
  onApplyFuture: () => void;
  onRestore: () => void;
}) {
  const labels = supersetLabels(workout.exercises);
  const savedBefore = history.some((item) => item.id === workout.id);
  const programSession = isProgramSessionKey(workout.sessionKey);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [picking, setPicking] = useState(false);

  function commit(next: WorkoutLog) {
    onChange(next, true);
  }

  return (
    <form
      className="editor-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="editor-bar">
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            required
            value={workout.date}
            onChange={(event) => commit({ ...workout, date: event.target.value })}
            onBlur={onFlush}
          />
        </label>
        <label className="field grow">
          <span>Session</span>
          <input
            value={workout.name}
            required
            onChange={(event) => commit({ ...workout, name: event.target.value })}
            onBlur={onFlush}
          />
        </label>
      </div>
      <p className="meta unit-note">Weights in {workout.unit}.{programSession && usesFutureList ? " Future sessions of this day use your saved list." : ""}</p>

      {workout.exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          count={workout.exercises.length}
          supersetLabel={exercise.supersetId ? (labels.get(exercise.supersetId) ?? null) : null}
          workout={workout}
          history={history}
          savedSignatures={savedSignatures}
          onFlush={onFlush}
          onChange={(next) =>
            commit({
              ...workout,
              exercises: workout.exercises.map((item) => (item.id === next.id ? next : item)),
            })
          }
          onMove={(direction) => commit({ ...workout, exercises: moveExercise(workout.exercises, index, direction) })}
          onLink={() => commit({ ...workout, exercises: linkWithNext(workout.exercises, index) })}
          onUnlink={() => commit({ ...workout, exercises: unlinkExercise(workout.exercises, exercise.id) })}
          onRemove={() => commit({ ...workout, exercises: workout.exercises.filter((item) => item.id !== exercise.id) })}
          onDuplicate={() => {
            const copy = duplicateExercise(exercise);
            const exercises = workout.exercises.slice();
            exercises.splice(index + 1, 0, copy);
            commit({ ...workout, exercises });
          }}
        />
      ))}

      {workout.exercises.length === 0 ? <p className="meta">No exercises yet. Add one from the library or create a new one.</p> : null}

      {picking ? (
        <ExercisePicker
          stored={library}
          onAdd={(entry) => commit({ ...workout, exercises: [...workout.exercises, exerciseFromLibrary(entry, workout, history)] })}
          onCreate={(entry) => {
            onCreateExercise(entry);
            commit({ ...workout, exercises: [...workout.exercises, exerciseFromLibrary(entry, workout, history)] });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <button type="button" className="button" onClick={() => setPicking(true)}>
          Add exercise
        </button>
      )}

      <label className="field">
        <span>Session notes</span>
        <textarea
          rows={3}
          value={workout.notes}
          placeholder="Soreness, warm-ups, or anything to remember"
          onChange={(event) => commit({ ...workout, notes: event.target.value })}
          onBlur={onFlush}
        />
      </label>

      <div className="editor-actions">
        <button type="submit" className="button primary">
          Save this workout
        </button>
        {programSession && workout.planWeek !== TESTING_WEEK ? (
          <button type="button" className="button" onClick={onApplyFuture}>
            Also use for future sessions
          </button>
        ) : null}
        {programSession ? (
          confirmRestore ? (
            <>
              <button type="button" className="button danger" onClick={onRestore}>
                Confirm restore
              </button>
              <button type="button" className="button" onClick={() => setConfirmRestore(false)}>
                Keep these exercises
              </button>
            </>
          ) : (
            <button type="button" className="button" onClick={() => setConfirmRestore(true)}>
              Restore program template
            </button>
          )
        ) : null}
        <button type="button" className="button" onClick={onClose}>
          {workoutHasLoggedSets(workout) || saving || savedBefore || saved ? "Back to list" : "Discard"}
        </button>
        {onDelete ? (
          confirmDelete ? (
            <>
              <button type="button" className="button danger" onClick={onDelete}>
                Confirm delete
              </button>
              <button type="button" className="button" onClick={() => setConfirmDelete(false)}>
                Keep workout
              </button>
            </>
          ) : (
            <button type="button" className="button danger" onClick={() => setConfirmDelete(true)}>
              Delete workout
            </button>
          )
        ) : null}
        <p className={saved && !saving ? "ok save-note" : "meta save-note"}>
          {saving ? "Saving…" : saved ? "Saved on this device." : "Not saved yet."}
        </p>
        {planSaved ? <p className="ok save-note">Future sessions of this day will use this exercise list.</p> : null}
      </div>
    </form>
  );
}
