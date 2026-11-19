import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import { RunEditor } from "../components/running/RunEditor.tsx";
import { RunningPlan } from "../components/running/RunningPlan.tsx";
import { scheduledDate } from "../domain/schedule.ts";
import { manualTest, planRunFor, plannedRun, recommendEasyFormat, sessionDate, sessionVariant, weekPlanForBlock } from "../domain/runningProgram.ts";
import { activeBlock, blockLength } from "../domain/trainingBlock.ts";
import { formatDisplayDate } from "../domain/workoutLog.ts";
import {
  benchmarkTotals,
  blankRun,
  cloneRun,
  exampleRun,
  formatClock,
  formatMiles,
  formatPace,
  isSoccer,
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
    blocks = [],
    activeBlockId = null,
    scheduleOverrides = [],
    setRunningProgramStart,
  } = useAppState();
  const runs = storedRuns;
  const runTemplates = storedTemplates;
  const [draft, setDraft] = useState<RunWorkout | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all" | "run" | "soccer">("all");
  const [params, setParams] = useSearchParams();
  const benchmark = benchmarkTotals();

  useEffect(() => {
    const edit = params.get("edit");
    if (edit) {
      const found = runs.find((run) => run.id === edit);
      if (found) {
        setDraft(found);
        setSaved(true);
      }
      setParams({}, { replace: true });
      return;
    }
    const slot = params.get("slot");
    const week = Number(params.get("week"));
    const block = activeBlock(blocks, activeBlockId);
    if (!block || (slot !== "tuesday" && slot !== "thursday" && slot !== "friday" && slot !== "weekend") || week < 1 || week > blockLength(block)) return;
    const session = weekPlanForBlock(block, week).sessions.find((item) => item.slot === slot);
    if (!session) return;
    const difficulty = params.get("difficulty");
    const chosen = difficulty === "easier" || difficulty === "harder" || difficulty === "planned" ? difficulty : "planned";
    const date = params.get("date") ?? scheduledDate(scheduleOverrides, week, "run", slot, sessionDate(block.startDate, week, slot), block.id);
    const existing = planRunFor(runs, week, slot, block.id);
    const latest = runs.filter((run) => run.status === "logged").sort((a, b) => b.date.localeCompare(a.date))[0];
    const ready = sessionVariant(session, week, recommendEasyFormat(week, latest?.rpe ?? null), session.qualityFocus ?? "mile");
    setDraft(existing ?? { ...plannedRun(ready, week, date, chosen), blockId: block.id });
    setSaved(false);
    setParams({}, { replace: true });
  }, [params]);
  const listed = runs
    .filter((run) => activityFilter === "all" || (activityFilter === "soccer" ? isSoccer(run) : !isSoccer(run)))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

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
    <Page eyebrow="Treadmill" title="Running" lede="Distance = minutes × mph ÷ 60. Walking segments stay out of pace.">
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
          {activeBlock(blocks, activeBlockId) ? (
          <RunningPlan
            block={activeBlock(blocks, activeBlockId)!}
            start={activeBlock(blocks, activeBlockId)!.startDate}
            runs={runs}
            workouts={workouts}
            overrides={scheduleOverrides}
            onStartChange={setRunningProgramStart}
            onOpen={changeDraft}
            onSkip={(run) => {
              saveRun(run);
            }}
          />
          ) : (
            <p className="callout">
              No training block is active. Open Blocks to start one. Logged runs below stay available.
            </p>
          )}
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
                setDraft(manualTest("mile"));
                setSaved(false);
                setTemplateSaved(false);
              }}
            >
              Log a mile test
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setDraft(manualTest("fivek"));
                setSaved(false);
                setTemplateSaved(false);
              }}
            >
              Log a 5K test
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
            <h2>Activity history</h2>
            <div className="button-row" role="group" aria-label="Activity type">
              {(
                [
                  ["all", "All"],
                  ["run", "Runs"],
                  ["soccer", "Soccer"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" className={activityFilter === id ? "button is-selected" : "button"} onClick={() => setActivityFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
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
                          {formatDisplayDate(run.date)} ·{" "}
                          {isSoccer(run)
                            ? `Soccer · ${run.activeMinutes ?? "—"} active min${run.scheduledName ? ` · replaced ${run.scheduledName}` : ""}`
                            : run.status === "skipped"
                              ? "Skipped"
                              : `${formatMiles(totals.runningMiles)} running · ${formatClock(totals.runningMinutes)} · ${formatPace(totals.paceSecondsPerMile)}`}
                          {run.rpe == null ? "" : ` · RPE ${run.rpe}`}
                        </p>
                      </div>
                      <div className="inline-actions">
                        <button type="button" className="button" onClick={() => {
                          setDraft(structuredClone(run));
                          setSaved(true);
                          setTemplateSaved(false);
                        }}>
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
