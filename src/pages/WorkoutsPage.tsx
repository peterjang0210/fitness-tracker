import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import { WorkoutEditor } from "../components/workouts/WorkoutEditor.tsx";
import { isSessionKey, sessionTemplates } from "../domain/strengthProgram.ts";
import { createWorkout, formatDisplayDate, sortWorkouts, type WorkoutLog } from "../domain/workoutLog.ts";
import { useAppState } from "../state/useAppState.ts";

export function WorkoutsPage() {
  const { settings, workouts, libraryEdits = [], saveWorkout, deleteWorkout } = useAppState();
  const [draft, setDraft] = useState<WorkoutLog | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const listed = sortWorkouts(workouts);

  useEffect(() => {
    const edit = params.get("edit");
    if (edit) {
      const found = workouts.find((workout) => workout.id === edit);
      if (found) {
        setDraft(found);
        setSaved(false);
      }
      setParams({}, { replace: true });
      return;
    }
    const start = params.get("start");
    if (!isSessionKey(start)) return;
    const next = createWorkout(start, settings.weightUnit, workouts, libraryEdits);
    const date = params.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = date;
    const week = Number(params.get("week"));
    if (week >= 1 && week <= 16) next.planWeek = week;
    setDraft(next);
    setSaved(false);
    setParams({}, { replace: true });
  }, [params]);

  function changeDraft(next: WorkoutLog) {
    setDraft(next);
    setSaved(false);
  }

  function saveDraft() {
    if (!draft || !draft.date || !draft.name.trim()) return;
    saveWorkout(draft);
    setSaved(true);
  }

  function removeWorkout(id: string) {
    deleteWorkout(id);
    setPendingDelete(null);
    if (draft?.id === id) {
      setDraft(null);
      setSaved(false);
    }
  }

  return (
    <Page
      eyebrow="Strength"
      title="Workouts"
      lede="Log Tuesday bench, Wednesday squat, and Friday’s lighter session. Each set keeps its own weight, reps, and RPE."
    >
      {draft ? (
        <WorkoutEditor
          workout={draft}
          history={workouts}
          saved={saved}
          onChange={changeDraft}
          onSave={saveDraft}
          onClose={() => {
            setDraft(null);
            setSaved(false);
          }}
          onDelete={workouts.some((workout) => workout.id === draft.id) ? () => removeWorkout(draft.id) : null}
        />
      ) : (
        <div className="workout-home">
          <div className="session-grid">
            {sessionTemplates.map((session) => (
              <button
                key={session.key}
                type="button"
                className="session-card"
                onClick={() => {
                  setDraft(createWorkout(session.key, settings.weightUnit, workouts, libraryEdits));
                  setSaved(false);
                }}
              >
                <span className="eyebrow">{session.day}</span>
                <strong>{session.name}</strong>
                <span>{session.summary}</span>
              </button>
            ))}
          </div>

          <section className="panel">
            <h2>Saved workouts</h2>
            {listed.length === 0 ? (
              <p>No workouts yet. Start one of the three sessions above. It stays in this browser after you save.</p>
            ) : (
              <ul className="workout-list">
                {listed.map((workout) => {
                  const completed = workout.exercises.filter((exercise) => exercise.status === "completed").length;
                  const skipped = workout.exercises.filter((exercise) => exercise.status === "skipped").length;
                  return (
                    <li key={workout.id} className="workout-row">
                      <div>
                        <strong>{workout.name}</strong>
                        <p className="meta">
                          {formatDisplayDate(workout.date)} · {workout.unit} · {completed} completed · {skipped} skipped
                        </p>
                      </div>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="button"
                          onClick={() => {
                            setDraft(structuredClone(workout));
                            setSaved(false);
                          }}
                        >
                          Edit
                        </button>
                        {pendingDelete === workout.id ? (
                          <>
                            <button type="button" className="button danger" onClick={() => removeWorkout(workout.id)}>
                              Confirm delete
                            </button>
                            <button type="button" className="button" onClick={() => setPendingDelete(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" className="button" onClick={() => setPendingDelete(workout.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
