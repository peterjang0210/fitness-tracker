import { useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import { adviseSession, daysBetween, planRunFor, plannedRun, weekPlan, PROGRAM_WEEKS, addDays, currentProgramWeek, sessionDate } from "../domain/runningProgram.ts";
import { missedRequiredRuns, matchingWorkout, scheduledDate, weekItems, type CalendarItem } from "../domain/schedule.ts";
import { createWorkout, formatDisplayDate, suggestedWeight, todayInputDate } from "../domain/workoutLog.ts";
import type { ProgramSessionKey } from "../domain/strengthProgram.ts";
import { TestGuide } from "../components/running/TestGuide.tsx";
import { useAppState } from "../state/useAppState.ts";

const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function CalendarPage() {
  const {
    workouts = [],
    runs = [],
    settings,
    runningProgramStart = "2026-11-03",
    scheduleOverrides = [],
    libraryEdits = [],
    futureSessions = [],
    saveWorkout,
    saveRun,
    setSessionDate,
  } = useAppState();
  const [week, setWeek] = useState(() => currentProgramWeek(runningProgramStart));
  const plan = weekPlan(week);
  const todayWeek = currentProgramWeek(runningProgramStart);
  const tuesday = sessionDate(runningProgramStart, week, "tuesday");
  const today = todayInputDate();
  const gridStart = plan.testing ? addDays(tuesday, -1) : tuesday;
  const days = Array.from({ length: 7 }, (_, index) => addDays(gridStart, index));
  const items = weekItems(runningProgramStart, week, scheduleOverrides, workouts, runs);
  const mileDate = items.find((item) => item.kind === "run" && item.key === "tuesday")?.date;
  const fiveKDate = items.find((item) => item.kind === "run" && item.key === "friday")?.date;
  const testGap = plan.testing && mileDate && fiveKDate ? daysBetween(mileDate, fiveKDate) : null;
  const parked = items.filter((item) => item.date < days[0] || item.date > days[6]);

  function skip(item: CalendarItem) {
    if (item.kind === "strength") {
      const draft = createWorkout(item.key as ProgramSessionKey, settings.weightUnit, workouts, libraryEdits, futureSessions, item.week);
      draft.date = item.date;
      draft.planWeek = item.week;
      draft.exercises = draft.exercises.map((exercise) => ({ ...exercise, status: "skipped" }));
      saveWorkout(draft);
      return;
    }
    const session = plan.sessions.find((entry) => entry.slot === item.key);
    if (!session || (item.key !== "tuesday" && item.key !== "thursday" && item.key !== "friday" && item.key !== "weekend")) return;
    const existing = planRunFor(runs, item.week, item.key);
    const advice = adviseSession(session, plan, item.date, runs, workouts, missedRequiredRuns(runningProgramStart, item.date, runs, scheduleOverrides));
    saveRun({ ...(existing ?? plannedRun(session, item.week, item.date, advice.difficulty)), status: "skipped" });
  }

  return (
    <Page eyebrow="Schedule" title="Program" lede="Weekly lift and run schedule. Change a date to move a session.">
      <div className="editor-bar">
        <div className="inline-actions">
          <button type="button" className="button" disabled={week === 1} onClick={() => setWeek((value) => value - 1)}>
            Previous week
          </button>
          <strong>
            Week {week}
            {week === todayWeek ? " · current" : ""}
            {plan.testing ? " · testing" : plan.recovery ? " · recovery" : ""}
          </strong>
          <button type="button" className="button" disabled={week === PROGRAM_WEEKS} onClick={() => setWeek((value) => value + 1)}>
            Next week
          </button>
        </div>
      </div>
      <p className="meta">
        {plan.phase}. {plan.note} The training week starts {formatDisplayDate(tuesday)}.
      </p>
      {plan.testing ? (
        <p className="callout">Do not run a maximal test if your knee hurts or you are unusually sore. Change the test date. An open test is not marked missed.</p>
      ) : null}
      {testGap != null && testGap < 2 ? (
        <p className="callout">Keep at least one full day between the mile and the 5K. Right now they are {testGap === 0 ? "on the same day" : "one day apart"}.</p>
      ) : null}
      <div className="day-grid">
        {days.map((date) => (
          <section key={date} className={date === today ? "day-card is-today" : "day-card"}>
            <h2>
              {weekday.format(new Date(`${date}T00:00:00`))}
              <span>{formatDisplayDate(date).replace(/, \d{4}$/, "")}</span>
            </h2>
            {items.filter((item) => item.date === date).length === 0 ? <p>Rest</p> : null}
            {items
              .filter((item) => item.date === date)
              .map((item) => (
                <SessionCard
                  key={`${item.kind}-${item.key}`}
                  item={item}
                  start={runningProgramStart}
                  workouts={workouts}
                  runs={runs}
                  overrides={scheduleOverrides}
                  unit={settings.weightUnit}
                  onMove={(nextDate) => {
                    if (item.kind === "note") return;
                    setSessionDate({ week: item.week, kind: item.kind, key: item.key, date: nextDate });
                  }}
                  onSkip={() => skip(item)}
                />
              ))}
          </section>
        ))}
      </div>
      {parked.length > 0 ? (
        <section className="panel">
          <h2>Moved outside this week</h2>
          <div className="day-grid">
            {parked.map((item) => (
              <SessionCard
                key={`${item.kind}-${item.key}`}
                item={item}
                start={runningProgramStart}
                workouts={workouts}
                runs={runs}
                overrides={scheduleOverrides}
                unit={settings.weightUnit}
                onMove={(nextDate) => {
                  if (item.kind === "note") return;
                  setSessionDate({ week: item.week, kind: item.kind, key: item.key, date: nextDate });
                }}
                onSkip={() => skip(item)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {plan.testing ? <TestGuide /> : null}
    </Page>
  );
}

function SessionCard({
  item,
  start,
  workouts,
  runs,
  overrides,
  unit,
  onMove,
  onSkip,
}: {
  item: CalendarItem;
  start: string;
  workouts: Parameters<typeof matchingWorkout>[0];
  runs: Parameters<typeof planRunFor>[0];
  overrides: Parameters<typeof missedRequiredRuns>[3];
  unit: Parameters<typeof suggestedWeight>[1]["unit"];
  onMove: (date: string) => void;
  onSkip: () => void;
}) {
  const logged = item.kind === "strength" ? matchingWorkout(workouts, start, item.week, item.key, item.date) : null;
  const run = item.kind === "run" && (item.key === "tuesday" || item.key === "friday" || item.key === "weekend") ? planRunFor(runs, item.week, item.key) : null;
  const href =
    item.kind === "note"
      ? ""
      : item.kind === "strength"
        ? logged
          ? `/workouts?edit=${logged.id}`
          : `/workouts?start=${item.key}&date=${item.date}&week=${item.week}`
        : run
          ? `/running?edit=${run.id}`
          : runStartHref(item, start, runs, workouts, overrides);
  const suggestion = item.kind === "strength" ? strengthNote(item, unit, workouts) : runNote(item, start, runs, workouts, overrides);

  return (
    <article className={`plan-item is-${item.status}`}>
      <p className={`status-pill is-${item.status}`}>{statusLabel(item, Boolean(run))}</p>
      <strong>{item.name}</strong>
      {item.optional ? <span>Optional</span> : null}
      <p>{suggestion}</p>
      {item.kind === "note" ? null : (
        <label className="field">
          <span>Date</span>
          <input type="date" value={item.date} onChange={(event) => onMove(event.target.value)} />
        </label>
      )}
      <div className="inline-actions">
        {item.kind === "note" ? null : (
          <Link className="button primary" to={href}>
            {logged || run ? "Open" : "Log"}
          </Link>
        )}
        {item.status === "done" || item.kind === "note" ? null : (
          <button type="button" className="button" onClick={onSkip}>
            Skip
          </button>
        )}
      </div>
    </article>
  );
}

function strengthNote(item: CalendarItem, unit: Parameters<typeof suggestedWeight>[1]["unit"], workouts: Parameters<typeof matchingWorkout>[0]): string {
  const exerciseKey = item.key === "tuesday-bench" ? "flat-bench" : item.key === "wednesday-squat" ? "barbell-squat" : "light-squat";
  return suggestedWeight(exerciseKey, { id: "calendar", date: item.date, unit, planWeek: item.week }, workouts).note;
}

function runNote(
  item: CalendarItem,
  start: string,
  runs: Parameters<typeof planRunFor>[0],
  workouts: Parameters<typeof matchingWorkout>[0],
  overrides: Parameters<typeof missedRequiredRuns>[3],
): string {
  const session = weekPlan(item.week).sessions.find((entry) => entry.slot === item.key);
  if (!session) return "";
  const advice = adviseSession(session, weekPlan(item.week), item.date, runs, workouts, missedRequiredRuns(start, item.date, runs, overrides));
  const chosen = advice.difficulty === "easier" ? "Easier than planned" : "As planned";
  return `${chosen}. ${advice.reasons.join(" ")} Harder is available in the editor and is not selected for you.`;
}

function runStartHref(
  item: CalendarItem,
  start: string,
  runs: Parameters<typeof planRunFor>[0],
  workouts: Parameters<typeof matchingWorkout>[0],
  overrides: Parameters<typeof missedRequiredRuns>[3],
): string {
  const session = weekPlan(item.week).sessions.find((entry) => entry.slot === item.key);
  const difficulty = session
    ? adviseSession(session, weekPlan(item.week), item.date, runs, workouts, missedRequiredRuns(start, item.date, runs, overrides)).difficulty
    : "planned";
  const date = scheduledDate(overrides, item.week, "run", item.key, item.date);
  return `/running?slot=${item.key}&week=${item.week}&date=${date}&difficulty=${difficulty}`;
}

function statusLabel(item: CalendarItem, hasRun: boolean): string {
  if (item.kind === "note") return item.status === "today" ? "Today" : "Rest";
  if (item.optional && item.status === "skipped" && !hasRun) return "Not done";
  if (item.status === "done") return "Logged";
  if (item.status === "skipped") return "Skipped";
  if (item.status === "missed") return "Missed";
  if (item.status === "today") return "Today";
  if (item.status === "open") return "Open";
  return "Scheduled";
}
