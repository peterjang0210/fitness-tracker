import { Link } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";
import {
  BENCH_GOAL_LB,
  BENCH_KEY,
  FIVE_K_GOAL_SECONDS,
  MILE_GOAL_SECONDS,
  SQUAT_GOAL_LB,
  SQUAT_KEY,
  bestSquatForGoal,
  fastestPace,
  goalPercent,
  liftSeries,
  recentRun,
  recentStrength,
  runEffortSeries,
} from "../domain/progress.ts";
import { FIVE_K_MILES, currentProgramWeek, weekPlan } from "../domain/runningProgram.ts";
import { nextOpenItem } from "../domain/schedule.ts";
import { formatMiles, formatPace, runTotals } from "../domain/running.ts";
import { convertWeight, formatWeight } from "../domain/strengthProgram.ts";
import { formatDisplayDate } from "../domain/workoutLog.ts";
import { useAppState } from "../state/useAppState.ts";

const areas = [
  {
    to: "/workouts",
    title: "Workouts",
    text: "Log sets, weight, reps, and RPE for the weekly strength sessions.",
  },
  {
    to: "/running",
    title: "Running",
    text: "Record treadmill segments and keep walking time out of the running totals.",
  },
  {
    to: "/progress",
    title: "Progress",
    text: "Working weights, volume, distance, pace, and speed from the log on this device.",
  },
  {
    to: "/settings",
    title: "Settings",
    text: "Appearance and units are saved locally. There is no account.",
  },
];

export function DashboardPage() {
  const { workouts, runs, settings, runningProgramStart, scheduleOverrides = [] } = useAppState();
  const unit = settings.weightUnit;
  const bench = liftSeries(workouts, BENCH_KEY, unit).at(-1);
  const squat = liftSeries(workouts, SQUAT_KEY, unit).at(-1);
  const squatForGoal = bestSquatForGoal(workouts, unit);
  const efforts = runEffortSeries(runs);
  const mile = fastestPace(efforts.miles);
  const fiveK = fastestPace(efforts.fiveKs);
  const lastRun = recentRun(runs);
  const lastTotals = lastRun ? runTotals(lastRun.segments) : null;
  const weekNumber = currentProgramWeek(runningProgramStart);
  const week = weekPlan(weekNumber);
  const upcoming = nextOpenItem(runningProgramStart, scheduleOverrides, workouts, runs);
  const recent = latestActivity(workouts, runs);
  const benchGoal = convertWeight(BENCH_GOAL_LB, "lb", unit);
  const squatGoal = convertWeight(SQUAT_GOAL_LB, "lb", unit);
  const fiveKSeconds = fiveK ? fiveK.pace * FIVE_K_MILES : null;

  const targets = [
    {
      label: "Bench press",
      value: formatWeight(benchGoal, unit),
      detail: bench ? `${formatWeight(bench.working, unit)} working · ${percent(goalPercent(bench.working, benchGoal))}` : "Not logged yet",
    },
    {
      label: "Squat",
      value: `${formatWeight(squatGoal, unit)} for 3+ reps`,
      detail: squatForGoal
        ? `${formatWeight(squatForGoal, unit)} for 3+ · ${percent(goalPercent(squatForGoal, squatGoal))}`
        : "Not logged yet",
    },
    {
      label: "Mile",
      value: "7:00",
      detail: mile ? `${clock(mile.pace)} pace · ${percent(goalPercent(mile.pace, MILE_GOAL_SECONDS, true))}` : "No mile effort yet",
    },
    {
      label: "5K",
      value: "Sub 25:00",
      detail: fiveKSeconds
        ? `${clock(fiveKSeconds)} · ${percent(goalPercent(fiveKSeconds, FIVE_K_GOAL_SECONDS, true))}`
        : "No 5K effort yet",
    },
  ];

  const facts = [
    { label: "Training week", value: `Week ${weekNumber}`, detail: week.phase },
    { label: "Next workout", value: upcoming ? upcoming.name : "Program complete", detail: upcoming ? formatDisplayDate(upcoming.date) : "All 16 weeks are scheduled" },
    { label: "Recent workout", value: recent ? recent.name : "Nothing logged", detail: recent ? formatDisplayDate(recent.date) : "Log a session to see it here" },
    { label: "Bench working weight", value: bench ? formatWeight(bench.working, unit) : "—", detail: bench ? formatDisplayDate(bench.date) : "No bench sets yet" },
    { label: "Squat working weight", value: squat ? formatWeight(squat.working, unit) : "—", detail: squat ? formatDisplayDate(squat.date) : "No barbell squat sets yet" },
    {
      label: "Recent running distance",
      value: lastTotals ? formatMiles(lastTotals.runningMiles) : "—",
      detail: lastRun ? formatDisplayDate(lastRun.date) : "No logged run yet",
    },
    {
      label: "Recent running pace",
      value: formatPace(lastTotals?.paceSecondsPerMile ?? null),
      detail: lastTotals ? `${Math.round(lastTotals.runningMinutes)} min running` : "Walking time is excluded",
    },
    { label: "Fastest mile", value: mile ? clock(mile.pace) : "—", detail: mile ? formatDisplayDate(mile.date) : "Needs a continuous mile" },
    { label: "Fastest 5K", value: fiveKSeconds ? clock(fiveKSeconds) : "—", detail: fiveK ? formatDisplayDate(fiveK.date) : "Needs a continuous 5K" },
  ];

  return (
    <Page
      eyebrow="Home"
      title="Training board"
      lede="A local log for the 16-week strength and running block. Nothing here is uploaded."
    >
      <div className="target-grid" aria-label="Training targets">
        {targets.map((target) => (
          <article key={target.label} className="target-card">
            <p>{target.label}</p>
            <strong>{target.value}</strong>
            <span>{target.detail}</span>
          </article>
        ))}
      </div>
      <div className="fact-grid" aria-label="Current training">
        {facts.map((fact) => (
          <article key={fact.label} className="target-card">
            <p>{fact.label}</p>
            <strong>{fact.value}</strong>
            <span>{fact.detail}</span>
          </article>
        ))}
      </div>
      <div className="area-grid">
        {areas.map((area) => (
          <Link key={area.to} to={area.to} className="area-card">
            <h2>{area.title}</h2>
            <p>{area.text}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}

function latestActivity(
  workouts: Parameters<typeof recentStrength>[0],
  runs: Parameters<typeof recentRun>[0],
): { date: string; name: string } | null {
  const workout = recentStrength(workouts);
  const run = recentRun(runs);
  if (!workout && !run) return null;
  if (!workout) return { date: run!.date, name: run!.name };
  if (!run) return { date: workout.date, name: workout.name };
  const runIsNewer = run.date > workout.date || (run.date === workout.date && run.updatedAt > workout.updatedAt);
  return runIsNewer ? { date: run.date, name: run.name } : { date: workout.date, name: workout.name };
}

function percent(value: number | null): string {
  return value == null ? "0%" : `${value}% of the goal`;
}

function clock(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
