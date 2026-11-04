import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import { RunEditor } from "../components/running/RunEditor.tsx";
import { RunningPlan } from "../components/running/RunningPlan.tsx";
import { scheduledDate } from "../domain/schedule.ts";
import { planRunFor, plannedRun, sessionDate, weekPlan } from "../domain/runningProgram.ts";
import { formatDisplayDate } from "../domain/workoutLog.ts";
import {
  benchmarkTotals,
  blankRun,
  cloneRun,
  exampleRun,
  formatClock,
  formatMiles,
  formatPace,
  runTotals,
  templateFromRun,
  type RunWorkout,
} from "../domain/running.ts";
import { useAppState } from "../state/useAppState.ts";

export function RunningPage() {
  const {
    runs: storedRuns = [],
    runTemplates: storedTemplates = [],
    workouts = [],
    saveRun,
    deleteRun,
    saveRunTemplate,
    deleteRunTemplate,
    runningProgramStart = "2026-11-03",
    scheduleOverrides = [],
    setRunningProgramStart,
  } = useAppState();
  const runs = storedRuns;
  const runTemplates = storedTemplates;
  const [draft, setDraft] = useState<RunWorkout | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const benchmark = benchmarkTotals();

  useEffect(() => {
    const edit = params.get("edit");
    if (edit) {
      const found = runs.find((run) => run.id === edit);
      if (found) {
        setDraft(found);
        setSaved(false);
      }
      setParams({}, { replace: true });
      return;
    }
    const slot = params.get("slot");
    const week = Number(params.get("week"));
    if ((slot !== "tuesday" && slot !== "friday" && slot !== "weekend") || week < 1 || week > 16) return;
    const session = weekPlan(week).sessions.find((item) => item.slot === slot);
    if (!session) return;
    const difficulty = params.get("difficulty");
    const chosen = difficulty === "easier" || difficulty === "harder" || difficulty === "planned" ? difficulty : "planned";
    const date = params.get("date") ?? scheduledDate(scheduleOverrides, week, "run", slot, sessionDate(runningProgramStart, week, slot));
    const existing = planRunFor(runs, week, slot);
    setDraft(existing ?? plannedRun(session, week, date, chosen));
    setSaved(false);
    setParams({}, { replace: true });
  }, [params]);
  const listed = runs.slice().sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

  function changeDraft(next: RunWorkout) {
    setDraft(next);
    setSaved(false);
    setTemplateSaved(false);
  }

  function removeRun(id: string) {
    deleteRun(id);
    setPendingDelete(null);
    if (draft?.id === id) {
      setDraft(null);
      setSaved(false);
    }
  }

  return (
    <Page
      eyebrow="Treadmill"
      title="Running"
      lede="Distance is minutes × mph ÷ 60. Warm-up, walking recovery, and cooldown stay out of the running distance and pace."
    >
      {draft ? (
        <RunEditor
          run={draft}
          saved={saved}
          templateSaved={templateSaved}
          onChange={changeDraft}
          onSave={() => {
            if (!draft.date || !draft.name.trim()) return;
            saveRun(draft);
            setSaved(true);
          }}
          onSaveTemplate={() => {
            saveRunTemplate(templateFromRun(draft));
            setTemplateSaved(true);
          }}
          onClose={() => {
            setDraft(null);
            setSaved(false);
            setTemplateSaved(false);
          }}
          onDelete={runs.some((run) => run.id === draft.id) ? () => removeRun(draft.id) : null}
        />
      ) : (
        <div className="workout-home">
          <RunningPlan
            start={runningProgramStart}
            runs={runs}
            workouts={workouts}
            overrides={scheduleOverrides}
            onStartChange={setRunningProgramStart}
            onOpen={changeDraft}
            onSkip={(run) => {
              saveRun(run);
            }}
          />
          <article className="panel">
            <h2>Starting benchmark</h2>
            <p>
              Recent continuous run: 10 minutes at 5.5 mph. That is {formatMiles(benchmark.runningMiles)} and{" "}
              {formatPace(benchmark.paceSecondsPerMile)}.
            </p>
          </article>
          <div className="inline-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setDraft(blankRun());
                setSaved(false);
                setTemplateSaved(false);
              }}
            >
              New run from benchmark
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setDraft(exampleRun());
                setSaved(false);
                setTemplateSaved(false);
              }}
            >
              Load example intervals
            </button>
          </div>

          {runTemplates.length > 0 ? (
            <section className="panel">
              <h2>Templates</h2>
              <ul className="workout-list">
                {runTemplates.map((template) => (
                  <li key={template.id} className="workout-row">
                    <div>
                      <strong>{template.name}</strong>
                      <p className="meta">{template.segments.length} segments</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button"
                        onClick={() => changeDraft(cloneRun({ name: template.name, notes: "", segments: template.segments }))}
                      >
                        Use template
                      </button>
                      <button type="button" className="button" onClick={() => deleteRunTemplate(template.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="panel">
            <h2>Saved runs</h2>
            {listed.length === 0 ? (
              <p>No runs yet. A saved run stays in this browser and can be reused.</p>
            ) : (
              <ul className="workout-list">
                {listed.map((run) => {
                  const totals = runTotals(run.segments);
                  return (
                    <li key={run.id} className="workout-row">
                      <div>
                        <strong>{run.name}</strong>
                        <p className="meta">
                          {formatDisplayDate(run.date)} · {run.status === "skipped" ? "Skipped" : `${formatMiles(totals.runningMiles)} running`} ·{" "}
                          {formatClock(totals.runningMinutes)} · {formatPace(totals.paceSecondsPerMile)}
                          {run.rpe == null ? "" : ` · RPE ${run.rpe}`}
                        </p>
                      </div>
                      <div className="inline-actions">
                        <button type="button" className="button" onClick={() => changeDraft(structuredClone(run))}>
                          Edit
                        </button>
                        <button type="button" className="button" onClick={() => changeDraft(cloneRun(run, `${run.name} copy`))}>
                          Reuse
                        </button>
                        {pendingDelete === run.id ? (
                          <>
                            <button type="button" className="button danger" onClick={() => removeRun(run.id)}>
                              Confirm delete
                            </button>
                            <button type="button" className="button" onClick={() => setPendingDelete(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" className="button" onClick={() => setPendingDelete(run.id)}>
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
