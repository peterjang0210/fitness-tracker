import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import { WorkoutEditor } from "../components/workouts/WorkoutEditor.tsx";
import { isProgramSessionKey, sessionTemplates, TESTING_WEEK } from "../domain/strengthProgram.ts";
import {
  createCustomWorkout,
  createWorkout,
  formatDisplayDate,
  planFromWorkout,
  restoreProgramExercises,
  setSignature,
  sortWorkouts,
  type WorkoutLog,
} from "../domain/workoutLog.ts";
import { useAppState } from "../state/useAppState.ts";

function signaturesOf(workout: WorkoutLog): Record<string, string> {
  const signatures: Record<string, string> = {};
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) signatures[set.id] = setSignature(set);
  }
  return signatures;
}

export function WorkoutsPage() {
  const {
    settings,
    workouts,
    libraryEdits = [],
    exerciseLibrary = [],
    futureSessions = [],
    saveWorkout,
    deleteWorkout,
    saveLibraryExercise,
    saveFutureSession,
  } = useAppState();
  const [draft, setDraft] = useState<WorkoutLog | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<Record<string, string>>({});
  const draftRef = useRef<WorkoutLog | null>(null);
  const timerRef = useRef<number | null>(null);
  const knownIds = useRef(new Set<string>());
  const dirtyRef = useRef(false);
  const flushRef = useRef<() => void>(() => {});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const listed = sortWorkouts(workouts);

  useEffect(() => {
    knownIds.current = new Set(workouts.map((workout) => workout.id));
  }, [workouts]);

  flushRef.current = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next = draftRef.current;
    if (!next || !next.date || !next.name.trim()) {
      setSaving(false);
      return;
    }
    if (!dirtyRef.current) {
      setSaving(false);
      return;
    }
    saveWorkout(next);
    knownIds.current.add(next.id);
    dirtyRef.current = false;
    setSavedSignatures(signaturesOf(next));
    setSaved(true);
    setSaving(false);
  };

  useEffect(() => {
    const run = () => flushRef.current();
    const onHide = () => {
      if (document.visibilityState === "hidden") run();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", run);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", run);
      run();
    };
  }, []);

  function remember(next: WorkoutLog, alreadySaved: boolean) {
    dirtyRef.current = false;
    draftRef.current = next;
    setDraft(next);
    setSaved(alreadySaved);
    setSaving(false);
    setPlanSaved(false);
    setSavedSignatures(signaturesOf(next));
  }

  function scheduleSave(next: WorkoutLog) {
    dirtyRef.current = true;
    draftRef.current = next;
    setDraft(next);
    setSaving(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => flushRef.current(), 450);
  }

  useEffect(() => {
    const edit = params.get("edit");
    if (edit) {
      const found = workouts.find((workout) => workout.id === edit);
      if (found) remember(found, true);
      setParams({}, { replace: true });
      return;
    }
    const start = params.get("start");
    if (start === "custom") {
      remember(createCustomWorkout(settings.weightUnit), false);
      setParams({}, { replace: true });
      return;
    }
    if (!isProgramSessionKey(start)) return;
    const week = Number(params.get("week"));
    const planWeek = week >= 1 && week <= TESTING_WEEK ? week : null;
    const next = createWorkout(start, settings.weightUnit, workouts, libraryEdits, futureSessions, planWeek);
    const date = params.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = date;
    if (planWeek) next.planWeek = planWeek;
    remember(next, false);
    setParams({}, { replace: true });
  }, [params]);

  function changeDraft(next: WorkoutLog, autosave = false) {
    if (autosave) scheduleSave(next);
    else {
      draftRef.current = next;
      setDraft(next);
      setSaved(false);
      setPlanSaved(false);
    }
  }

  function saveDraft() {
    dirtyRef.current = true;
    flushRef.current();
  }

  function removeWorkout(id: string) {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (draftRef.current?.id === id) draftRef.current = null;
    dirtyRef.current = false;
    knownIds.current.delete(id);
    deleteWorkout(id);
    setPendingDelete(null);
    if (draft?.id === id) {
      setDraft(null);
      setSaved(false);
    }
  }

  return (
    <Page eyebrow="Strength" title="Workout" lede="Enter reps to save a set. Completed exercises collapse to keep the log short.">
      {draft ? (
        <WorkoutEditor
          workout={draft}
          history={workouts}
          library={exerciseLibrary}
          saved={saved}
          saving={saving}
          savedSignatures={savedSignatures}
          planSaved={planSaved}
          usesFutureList={futureSessions.some((plan) => plan.sessionKey === draft.sessionKey)}
          onChange={changeDraft}
          onFlush={() => flushRef.current()}
          onSave={saveDraft}
          onCreateExercise={saveLibraryExercise}
          onApplyFuture={() => {
            flushRef.current();
            const current = draftRef.current;
            if (!current) return;
            const plan = planFromWorkout(current);
            if (!plan) return;
            saveFutureSession(plan);
            setPlanSaved(true);
          }}
          onRestore={() => changeDraft(restoreProgramExercises(draft, workouts), true)}
          onClose={() => {
            flushRef.current();
            draftRef.current = null;
            setDraft(null);
            setSaving(false);
            setPlanSaved(false);
          }}
          onDelete={workouts.some((workout) => workout.id === draft.id) ? () => removeWorkout(draft.id) : null}
        />
      ) : (
        <div className="workout-home">
          <div className="secondary-links" aria-label="Related">
            <Link className="button" to="/running">
              Running log
            </Link>
            <Link className="button" to="/calendar">
              Program schedule
            </Link>
          </div>
          <div className="session-grid">
            {sessionTemplates.map((session) => (
              <button
                key={session.key}
                type="button"
                className="session-card"
                onClick={() => {
                  remember(createWorkout(session.key, settings.weightUnit, workouts, libraryEdits, futureSessions), false);
                }}
              >
                <span className="eyebrow">{session.day}</span>
                <strong>{session.name}</strong>
                <span>{session.summary}</span>
                {futureSessions.some((plan) => plan.sessionKey === session.key) ? <span>Uses your saved list</span> : null}
              </button>
            ))}
            <button
              type="button"
              className="session-card"
              onClick={() => {
                remember(createCustomWorkout(settings.weightUnit), false);
              }}
            >
              <span className="eyebrow">Any day</span>
              <strong>Custom workout</strong>
              <span>Empty session — add exercises as you go.</span>
            </button>
          </div>

          <section className="panel">
            <h2>Saved workouts</h2>
            {listed.length === 0 ? (
              <p className="meta">No workouts yet. Start a session above.</p>
            ) : (
              <ul className="workout-list">
                {listed.map((workout) => {
                  const completed = workout.exercises.filter((exercise) => exercise.status === "completed").length;
                  const skipped = workout.exercises.filter((exercise) => exercise.status === "skipped").length;
                  return (
                    <li key={workout.id} className="workout-row">
                      <div className="workout-row-copy">
                        <strong>{workout.name}</strong>
                        <p className="meta">
                          {formatDisplayDate(workout.date)} · {completed} done · {skipped} skipped
                        </p>
                      </div>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="button"
                          onClick={() => {
                            remember(structuredClone(workout), true);
                          }}
                        >
                          Edit
                        </button>
                        {pendingDelete === workout.id ? (
                          <>
                            <button type="button" className="button danger" onClick={() => removeWorkout(workout.id)}>
                              Confirm
                            </button>
                            <button type="button" className="button" onClick={() => setPendingDelete(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" className="button quiet" onClick={() => setPendingDelete(workout.id)}>
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
