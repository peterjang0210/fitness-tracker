import { useState } from "react";
import { formatDisplayDate } from "../../domain/workoutLog.ts";
import {
  FIVE_K_GOAL_MPH,
  MILE_GOAL_MPH,
  PROGRAM_WEEKS,
  adviseSession,
  currentProgramWeek,
  formatMph,
  planRunFor,
  plannedRun,
  sessionDate,
  weekPlan,
  type PlanSession,
} from "../../domain/runningProgram.ts";
import { missedRequiredRuns, scheduledDate, type ScheduleOverride } from "../../domain/schedule.ts";
import type { RunDifficulty, RunWorkout } from "../../domain/running.ts";
import type { WorkoutLog } from "../../domain/workoutLog.ts";

const difficulties: { value: RunDifficulty; label: string }[] = [
  { value: "easier", label: "Easier" },
  { value: "planned", label: "As planned" },
  { value: "harder", label: "Harder" },
];

export function RunningPlan({
  start,
  runs,
  workouts,
  overrides,
  onStartChange,
  onOpen,
  onSkip,
}: {
  start: string;
  runs: RunWorkout[];
  workouts: WorkoutLog[];
  overrides: ScheduleOverride[];
  onStartChange: (date: string) => void;
  onOpen: (run: RunWorkout) => void;
  onSkip: (run: RunWorkout) => void;
}) {
  const [week, setWeek] = useState(() => currentProgramWeek(start));
  const plan = weekPlan(week);
  const todayWeek = currentProgramWeek(start);

  return (
    <section className="panel plan-panel">
      <h2>16-week block</h2>
      <p>
        Targets stay ahead of the workouts: a 7:00 mile is {formatMph(MILE_GOAL_MPH)}, and a sub-25 5K is{" "}
        {formatMph(FIVE_K_GOAL_MPH)}. Week {week} does not use those speeds.
      </p>
      <div className="editor-bar">
        <label className="field">
          <span>Week 1 Tuesday</span>
          <input type="date" value={start} onChange={(event) => onStartChange(event.target.value)} />
        </label>
        <div className="inline-actions">
          <button type="button" className="button" disabled={week === 1} onClick={() => setWeek((value) => value - 1)}>
            Previous week
          </button>
          <strong>
            Week {week}
            {week === todayWeek ? " · current" : ""}
            {plan.recovery ? " · recovery" : ""}
          </strong>
          <button
            type="button"
            className="button"
            disabled={week === PROGRAM_WEEKS}
            onClick={() => setWeek((value) => value + 1)}
          >
            Next week
          </button>
        </div>
      </div>
      <p className="meta">
        {plan.phase}. {plan.note}
      </p>
      <div className="session-grid">
        {plan.sessions.map((session) => (
          <PlanCard
            key={session.slot}
            week={week}
            session={session}
            date={scheduledDate(overrides, week, "run", session.slot, sessionDate(start, week, session.slot))}
            runs={runs}
            workouts={workouts}
            missedRequired={missedRequiredRuns(start, scheduledDate(overrides, week, "run", session.slot, sessionDate(start, week, session.slot)), runs, overrides)}
            onOpen={onOpen}
            onSkip={onSkip}
          />
        ))}
      </div>
    </section>
  );
}

function PlanCard({
  week,
  session,
  date,
  runs,
  workouts,
  missedRequired,
  onOpen,
  onSkip,
}: {
  week: number;
  session: PlanSession;
  date: string;
  runs: RunWorkout[];
  workouts: WorkoutLog[];
  missedRequired: number;
  onOpen: (run: RunWorkout) => void;
  onSkip: (run: RunWorkout) => void;
}) {
  const advice = adviseSession(session, weekPlan(week), date, runs, workouts, missedRequired);
  const saved = planRunFor(runs, week, session.slot);
  const [difficulty, setDifficulty] = useState<RunDifficulty>(saved?.difficulty ?? advice.difficulty);
  const chosen = saved ? (saved.difficulty ?? "planned") : difficulty;

  return (
    <article className="session-card">
      <span className="eyebrow">
        {session.slot}
        {session.optional ? " · optional" : ""}
      </span>
      <strong>{session.title}</strong>
      <span>{formatDisplayDate(date)}</span>
      <span>{session.summary}</span>
      <span>{advice.reasons.join(" ")}</span>
      {saved ? (
        <span className="meta">{saved.status === "skipped" ? "Skipped" : `Logged${saved.rpe == null ? "" : ` · RPE ${saved.rpe}`}`}</span>
      ) : null}
      {saved ? null : (
        <div className="inline-actions">
          {difficulties.map((option) => (
            <button
              key={option.value}
              type="button"
              className={chosen === option.value ? "button is-selected" : "button"}
              onClick={() => setDifficulty(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      <div className="inline-actions">
        <button
          type="button"
          className="button primary"
          onClick={() => onOpen(saved ? { ...saved, difficulty: chosen } : plannedRun(session, week, date, chosen))}
        >
          {saved ? "Open" : "Start"}
        </button>
        {saved?.status === "logged" ? null : (
          <button
            type="button"
            className="button"
            onClick={() =>
              onSkip({
                ...(saved ?? plannedRun(session, week, date, chosen)),
                status: "skipped",
                difficulty: chosen,
              })
            }
          >
            Skip
          </button>
        )}
      </div>
    </article>
  );
}
