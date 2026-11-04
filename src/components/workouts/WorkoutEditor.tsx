import { useState } from "react";
import type { WorkoutLog } from "../../domain/workoutLog.ts";
import { blankExercise, linkWithNext, moveExercise, supersetLabels, unlinkExercise } from "../../domain/workoutLog.ts";
import { ExerciseCard } from "./ExerciseCard.tsx";

export function WorkoutEditor({
  workout,
  history,
  saved,
  onChange,
  onSave,
  onClose,
  onDelete,
}: {
  workout: WorkoutLog;
  history: WorkoutLog[];
  saved: boolean;
  onChange: (workout: WorkoutLog) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete: (() => void) | null;
}) {
  const labels = supersetLabels(workout.exercises);
  const savedBefore = history.some((item) => item.id === workout.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
            onChange={(event) => onChange({ ...workout, date: event.target.value })}
          />
        </label>
        <label className="field grow">
          <span>Session</span>
          <input
            value={workout.name}
            required
            onChange={(event) => onChange({ ...workout, name: event.target.value })}
          />
        </label>
        <p className="meta unit-note">Weights are stored in {workout.unit}.</p>
      </div>

      {workout.exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          count={workout.exercises.length}
          supersetLabel={exercise.supersetId ? (labels.get(exercise.supersetId) ?? null) : null}
          workout={workout}
          history={history}
          onChange={(next) =>
            onChange({
              ...workout,
              exercises: workout.exercises.map((item) => (item.id === next.id ? next : item)),
            })
          }
          onMove={(direction) => onChange({ ...workout, exercises: moveExercise(workout.exercises, index, direction) })}
          onLink={() => onChange({ ...workout, exercises: linkWithNext(workout.exercises, index) })}
          onUnlink={() => onChange({ ...workout, exercises: unlinkExercise(workout.exercises, exercise.id) })}
          onRemove={() => onChange({ ...workout, exercises: workout.exercises.filter((item) => item.id !== exercise.id) })}
        />
      ))}

      <button type="button" className="button" onClick={() => onChange({ ...workout, exercises: [...workout.exercises, blankExercise()] })}>
        Add exercise
      </button>

      <label className="field">
        <span>Session notes</span>
        <textarea
          rows={3}
          value={workout.notes}
          placeholder="Soreness, warm-ups, or anything to remember"
          onChange={(event) => onChange({ ...workout, notes: event.target.value })}
        />
      </label>

      <div className="inline-actions">
        <button type="submit" className="button primary">
          Save workout
        </button>
        <button type="button" className="button" onClick={onClose}>
          {savedBefore || saved ? "Back to list" : "Discard"}
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
        {saved ? <p className="ok">Saved in this browser.</p> : null}
      </div>
    </form>
  );
}
