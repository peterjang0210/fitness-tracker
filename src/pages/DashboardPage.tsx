import { Link } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import { TrendChart } from "../components/progress/TrendChart.tsx";
import {
  BENCH_GOAL_LB,
  BENCH_KEY,
  FIVE_K_GOAL_SECONDS,
  MILE_GOAL_SECONDS,
  SQUAT_GOAL_LB,
  SQUAT_KEY,
  averageRunningPace,
  bestSet,
  bestSquatForGoal,
  fastestPace,
  goalPercent,
  latestEffort,
  liftSeries,
  longestContinuous,
  runEffortSeries,
  weeklyRunningMiles,
} from "../domain/progress.ts";
import { FIVE_K_MILES, PROGRAM_WEEKS, TESTING_WEEK, currentProgramWeek, planRunFor, weekPlan } from "../domain/runningProgram.ts";
import { matchingWorkout, nextOpenItem, weekItems, type CalendarItem, type ItemStatus } from "../domain/schedule.ts";
import { formatClock, formatMiles, formatPace, runTotals } from "../domain/running.ts";
import { isCompletedSet } from "../domain/workoutLog.ts";
import { convertWeight, formatWeight } from "../domain/strengthProgram.ts";
import { formatDisplayDate, sortWorkouts } from "../domain/workoutLog.ts";
import { useAppState } from "../state/useAppState.ts";

const statusText: Record<ItemStatus, string> = {
  done: "Done",
  missed: "Missed",
  today: "Today",
  upcoming: "Upcoming",
  skipped: "Skipped",
  open: "Open",
};

export function DashboardPage() {
  const { workouts, runs, settings, runningProgramStart, scheduleOverrides = [] } = useAppState();
  const unit = settings.weightUnit;
  const bench = liftSeries(workouts, BENCH_KEY, unit).at(-1);
  const squat = liftSeries(workouts, SQUAT_KEY, unit).at(-1);
  const squatForGoal = bestSquatForGoal(workouts, unit);
  const efforts = runEffortSeries(runs);
  const mile = fastestPace(efforts.miles);
  const fiveK = fastestPace(efforts.fiveKs);
  const recentMile = latestEffort(efforts.miles);
  const recentFiveK = latestEffort(efforts.fiveKs);
  const benchBest = bestSet(workouts, BENCH_KEY, unit);
  const squatBest = bestSet(workouts, SQUAT_KEY, unit);
  const longest = longestContinuous(runs);
  const averagePace = averageRunningPace(runs);
  const weekMiles = weeklyRunningMiles(runs);
  const weekNumber = currentProgramWeek(runningProgramStart);
  const week = weekPlan(weekNumber);
  const schedule = weekItems(runningProgramStart, weekNumber, scheduleOverrides, workouts, runs);
  const upcoming = nextOpenItem(runningProgramStart, scheduleOverrides, workouts, runs);
  const weeksUntilTest = Math.max(0, TESTING_WEEK - weekNumber);
  const liftsDone = workouts.filter((workout) => workout.exercises.some((exercise) => exercise.sets.some(isCompletedSet))).length;
  const runsDone = runs.filter((run) => run.status !== "skipped" && runTotals(run.segments).runningMiles > 0).length;
  const benchGoal = convertWeight(BENCH_GOAL_LB, "lb", unit);
  const squatGoal = convertWeight(SQUAT_GOAL_LB, "lb", unit);
  const fiveKSeconds = fiveK ? fiveK.pace * FIVE_K_MILES : null;
  const recent = recentActivity(workouts, runs);

  const targets = [
    {
      label: "Bench press",
      value: formatWeight(benchGoal, unit),
      detail: bench ? `${formatWeight(bench.working, unit)} working` : "Not logged yet",
      percent: goalPercent(bench?.working ?? null, benchGoal),
    },
    {
      label: "Squat",
      value: `${formatWeight(squatGoal, unit)} × 3`,
      detail: squatForGoal ? `${formatWeight(squatForGoal, unit)} for 3+` : squat ? `${formatWeight(squat.working, unit)} working` : "Not logged yet",
      percent: goalPercent(squatForGoal, squatGoal),
    },
    {
      label: "Mile",
      value: "7:00",
      detail: mile ? `${formatPace(mile.pace)} best` : "No mile effort yet",
      percent: mile ? goalPercent(mile.pace, MILE_GOAL_SECONDS, true) : null,
    },
    {
      label: "5K",
      value: "Sub 25:00",
      detail: fiveKSeconds ? `${formatClock(fiveKSeconds / 60)} best` : "No 5K effort yet",
      percent: fiveKSeconds ? goalPercent(fiveKSeconds, FIVE_K_GOAL_SECONDS, true) : null,
    },
  ];

  return (
    <Page
      eyebrow={`Week ${weekNumber} of ${PROGRAM_WEEKS}`}
      title="Training board"
      lede={`${week.phase}. ${weeksUntilTest === 0 ? "This is testing week." : `${weeksUntilTest} week${weeksUntilTest === 1 ? "" : "s"} until testing week.`} ${week.note}`}
    >
      <div className="target-grid" aria-label="Training targets">
        {targets.map((target) => (
          <article key={target.label} className="target-card">
            <p>{target.label}</p>
            <strong>{target.value}</strong>
            <span>{target.detail}</span>
            <div className="meter" role="meter" aria-label={`${target.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={target.percent ?? 0}>
              <span style={{ width: `${target.percent ?? 0}%` }} />
            </div>
            <span>{target.percent == null ? "0% of the goal" : `${target.percent}% of the goal`}</span>
          </article>
        ))}
      </div>
      <div className="stat-grid">
        <article className="panel">
          <h2>Strength</h2>
          <p>Bench estimated 1RM {bench ? formatWeight(bench.oneRm, unit) : "is not logged yet"}.</p>
          <p>Best bench set {benchBest ? `${formatWeight(benchBest.weight, unit)} × ${benchBest.reps}` : "is not logged yet"}.</p>
          <p>Squat estimated 1RM {squat ? formatWeight(squat.oneRm, unit) : "is not logged yet"}.</p>
          <p>Best squat set {squatBest ? `${formatWeight(squatBest.weight, unit)} × ${squatBest.reps}` : "is not logged yet"}.</p>
        </article>
        <article className="panel">
          <h2>Running</h2>
          <p>Latest mile {recentMile ? `${formatPace(recentMile.pace)} on ${recentMile.label}` : "is not logged yet"}.</p>
          <p>Latest 5K {recentFiveK ? `${formatClock((recentFiveK.pace * recentFiveK.miles) / 60)} on ${recentFiveK.label}` : "is not logged yet"}.</p>
          <p>This week {formatMiles(weekMiles)}. Longest continuous run {longest ? formatMiles(longest.miles) : "is not logged yet"}.</p>
          <p>Average pace {formatPace(averagePace)}.</p>
        </article>
        <article className="panel">
          <h2>Program</h2>
          <p>Week {weekNumber} of {PROGRAM_WEEKS}.</p>
          <p>{weeksUntilTest === 0 ? "Testing week is this week." : `${weeksUntilTest} week${weeksUntilTest === 1 ? "" : "s"} until testing week.`}</p>
          <p>{upcoming ? `Next up: ${upcoming.name} on ${formatDisplayDate(upcoming.date)}.` : "Nothing left on the schedule."}</p>
          <p>{liftsDone} lift{liftsDone === 1 ? "" : "s"} and {runsDone} run{runsDone === 1 ? "" : "s"} logged.</p>
        </article>
      </div>
      <div className="dash-layout">
        <section className="panel">
          <h2>This week</h2>
          <p className="meta">{schedule.filter((item) => item.status === "done").length} logged · {schedule.filter((item) => item.status === "missed").length} missed</p>
          <ul className="schedule-list">
            {schedule.map((item) => (
              <li key={`${item.kind}-${item.key}`}>
                <Link className={`schedule-row is-${item.status}`} to={itemHref(item, runningProgramStart, workouts, runs)}>
                  <span className={`status-pill is-${item.status}`}>{statusText[item.status]}</span>
                  <span className="schedule-copy">
                    <strong>{item.name}</strong>
                    <span>{formatDisplayDate(item.date)}{item.optional ? " · optional" : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Recent log</h2>
          {recent.length === 0 ? (
            <p>Nothing logged yet. Open the program and start today’s session.</p>
          ) : (
            <ul className="schedule-list">
              {recent.map((item) => (
                <li key={item.href}>
                  <Link className="schedule-row is-done" to={item.href}>
                    <span className="status-pill is-done">{item.kind}</span>
                    <span className="schedule-copy">
                      <strong>{item.name}</strong>
                      <span>
                        {formatDisplayDate(item.date)} · {item.detail}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="chart-grid">
        <TrendChart
          title="Bench history"
          note="Estimated 1RM from logged bench sets."
          data={liftSeries(workouts, BENCH_KEY, unit)}
          kind="line"
          unit={unit}
          empty="No bench sets logged yet."
          goal={{ value: benchGoal, name: "225" }}
          series={[
            { key: "working", name: "Working weight", color: "var(--accent)" },
            { key: "oneRm", name: "Estimated 1RM", color: "var(--good)" },
          ]}
        />
        <TrendChart
          title="Squat history"
          note="Estimated 1RM from logged barbell squat sets."
          data={liftSeries(workouts, SQUAT_KEY, unit)}
          kind="line"
          unit={unit}
          empty="No squat sets logged yet."
          goal={{ value: squatGoal, name: "315" }}
          series={[
            { key: "working", name: "Working weight", color: "var(--accent)" },
            { key: "oneRm", name: "Estimated 1RM", color: "var(--good)" },
          ]}
        />
        <TrendChart
          title="Weekly running distance"
          note="Running segments only."
          data={efforts.weekly}
          kind="bar"
          unit="mi"
          empty="No running miles logged yet."
          series={[{ key: "miles", name: "Miles", color: "var(--good)" }]}
        />
        <TrendChart
          title="Mile efforts"
          note="Continuous running of at least 1 mile. The line is 7:00."
          data={efforts.miles}
          kind="line"
          unit="pace"
          empty="No continuous mile logged yet."
          goal={{ value: MILE_GOAL_SECONDS, name: "7:00" }}
          series={[{ key: "pace", name: "Pace", color: "var(--accent)" }]}
        />
      </div>
    </Page>
  );
}

function itemHref(
  item: CalendarItem,
  start: string,
  workouts: Parameters<typeof matchingWorkout>[0],
  runs: Parameters<typeof planRunFor>[0],
): string {
  if (item.kind === "note") return "/calendar";
  if (item.kind === "strength") {
    const logged = matchingWorkout(workouts, start, item.week, item.key, item.date);
    return logged ? `/workouts?edit=${logged.id}` : `/workouts?start=${item.key}&date=${item.date}&week=${item.week}`;
  }
  if (item.key === "tuesday" || item.key === "thursday" || item.key === "friday" || item.key === "weekend") {
    const run = planRunFor(runs, item.week, item.key);
    if (run) return `/running?edit=${run.id}`;
  }
  return `/running?slot=${item.key}&week=${item.week}&date=${item.date}`;
}

function recentActivity(
  workouts: Parameters<typeof sortWorkouts>[0],
  runs: Parameters<typeof planRunFor>[0],
): { href: string; date: string; name: string; detail: string; kind: string; updatedAt: string }[] {
  const strength = sortWorkouts(workouts).map((workout) => {
    const done = workout.exercises.filter((exercise) => exercise.status === "completed").length;
    return {
      href: `/workouts?edit=${workout.id}`,
      date: workout.date,
      updatedAt: workout.updatedAt,
      name: workout.name,
      detail: `${done} exercise${done === 1 ? "" : "s"} done`,
      kind: "Lift",
    };
  });
  const running = runs.map((run) => {
    const totals = runTotals(run.segments);
    return {
      href: `/running?edit=${run.id}`,
      date: run.date,
      updatedAt: run.updatedAt,
      name: run.name,
      detail: run.status === "skipped" ? "Skipped" : `${formatMiles(totals.runningMiles)} · ${formatPace(totals.paceSecondsPerMile)}`,
      kind: "Run",
    };
  });
  return [...strength, ...running]
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
}
