import { useState } from "react";
import { Page } from "../components/layout/Page.tsx";
import { TrendChart } from "../components/progress/TrendChart.tsx";
import { TestGuide } from "../components/running/TestGuide.tsx";
import {
  BENCH_GOAL_LB,
  BENCH_KEY,
  FIVE_K_GOAL_SECONDS,
  MILE_GOAL_SECONDS,
  SQUAT_GOAL_LB,
  SQUAT_KEY,
  SQUAT_VOLUME_KEYS,
  activityDurationSeries,
  fastestPace,
  filterPoints,
  liftSeries,
  rangeBounds,
  runEffortSeries,
  weeklyVolume,
} from "../domain/progress.ts";
import { FIVE_K_MILES } from "../domain/runningProgram.ts";
import { recordsForBlock } from "../domain/trainingBlock.ts";
import { formatClock, formatMiles, formatPace, runTotals } from "../domain/running.ts";
import { formatDisplayDate } from "../domain/workoutLog.ts";
import { Link } from "react-router-dom";
import { convertWeight } from "../domain/strengthProgram.ts";
import { useAppState } from "../state/useAppState.ts";

const presets = [
  { id: "4w", label: "4 weeks" },
  { id: "16w", label: "16 weeks" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
] as const;

export function ProgressPage() {
  const { workouts: storedWorkouts, runs: storedRuns, settings, blocks = [] } = useAppState();
  const [scope, setScope] = useState("all");
  const scoped = blocks.find((block) => block.id === scope);
  const scopedRecords = scoped ? recordsForBlock(scoped, storedWorkouts, storedRuns) : null;
  const workouts = scopedRecords?.workouts ?? storedWorkouts;
  const runs = scopedRecords?.runs ?? storedRuns;
  const unit = settings.weightUnit;
  const [preset, setPreset] = useState<(typeof presets)[number]["id"]>("16w");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const bounds = rangeBounds(preset, from, to);
  const keep = <T extends { date: string }>(points: T[]) => filterPoints(points, bounds.from, bounds.to);
  const bench = keep(liftSeries(workouts, BENCH_KEY, unit));
  const squat = keep(liftSeries(workouts, SQUAT_KEY, unit));
  const benchVolume = keep(weeklyVolume(workouts, new Set([BENCH_KEY]), unit));
  const squatVolume = keep(weeklyVolume(workouts, SQUAT_VOLUME_KEYS, unit));
  const running = runEffortSeries(runs);
  const benchGoal = convertWeight(BENCH_GOAL_LB, "lb", unit);
  const squatGoal = convertWeight(SQUAT_GOAL_LB, "lb", unit);
  const fiveKPace = Math.round(FIVE_K_GOAL_SECONDS / FIVE_K_MILES);
  const tests = runs
    .filter((run) => run.testKind && run.status !== "skipped")
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Page eyebrow="Charts" title="Progress" lede="Strength and running trends from this browser’s log.">
      <label className="field">
        <span>Chart scope</span>
        <select value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="all">All history</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>
      </label>
      <div className="range-bar">
        <div className="button-row" role="group" aria-label="Date range">
          {presets.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === preset ? "button is-selected" : "button"}
              onClick={() => setPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="range-dates">
            <label>
              From
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>
        ) : null}
      </div>
      <section className="panel">
        <h2>Time trials</h2>
        <p className="callout">Do not run a maximal test if your knee hurts or you are unusually sore. A result you enter here is saved with the rest of the log.</p>
        {tests.length === 0 ? <p>No mile or 5K test is logged yet. Log one from the running page, or open a run and set its test type.</p> : null}
        {tests.length > 0 ? (
          <ul className="workout-list">
            {tests.map((run) => {
              const totals = runTotals(run.segments);
              const speed = totals.runningMinutes > 0 ? totals.runningMiles / (totals.runningMinutes / 60) : null;
              return (
                <li key={run.id} className="workout-row">
                  <div>
                    <strong>{run.testKind === "mile" ? "1-mile time trial" : "5K time trial"}</strong>
                    <p className="meta">
                      {formatDisplayDate(run.date)} · {formatClock(totals.runningMinutes)} · {formatMiles(totals.runningMiles)} · {formatPace(totals.paceSecondsPerMile)}
                      {speed == null ? "" : ` · ${speed.toFixed(2)} mph`}
                      {run.incline == null ? "" : ` · ${run.incline}% incline`}
                      {run.continuous == null ? "" : run.continuous ? " · continuous" : " · included walking"}
                      {run.rpe == null ? "" : ` · RPE ${run.rpe}`}
                    </p>
                    {run.notes ? <p className="meta">{run.notes}</p> : null}
                  </div>
                  <Link className="button" to={`/running?edit=${run.id}`}>
                    Edit
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
      <TestGuide />
      <div className="chart-grid">
        <TrendChart
          title="Bench working weight and estimated 1RM"
          note="Working weight is the most common set. 1RM is the Epley estimate from the best set: weight × (1 + reps / 30)."
          data={bench}
          kind="line"
          unit={unit}
          empty="No bench sets in this range."
          goal={{ value: benchGoal, name: "225" }}
          series={[
            { key: "working", name: "Working weight", color: "var(--accent)" },
            { key: "oneRm", name: "Estimated 1RM", color: "var(--good)" },
          ]}
        />
        <TrendChart
          title="Squat working weight and estimated 1RM"
          note="Main barbell squat only. The goal line is 315, the target for 3 or more reps."
          data={squat}
          kind="line"
          unit={unit}
          empty="No barbell squat sets in this range."
          goal={{ value: squatGoal, name: "315" }}
          series={[
            { key: "working", name: "Working weight", color: "var(--accent)" },
            { key: "oneRm", name: "Estimated 1RM", color: "var(--good)" },
          ]}
        />
        <TrendChart
          title="Weekly bench volume"
          note="Sum of weight × reps for completed bench sets, grouped by week."
          data={benchVolume}
          kind="bar"
          unit={unit}
          empty="No bench volume in this range."
          series={[{ key: "volume", name: "Volume", color: "var(--accent)" }]}
        />
        <TrendChart
          title="Weekly squat volume"
          note="Main squat, light squat, and back-off sets. Skipped exercises are left out."
          data={squatVolume}
          kind="bar"
          unit={unit}
          empty="No squat volume in this range."
          series={[{ key: "volume", name: "Volume", color: "var(--good)" }]}
        />
        <TrendChart
          title="Running distance per workout"
          note="Running segments only. Walking warm-up and recovery stay out of this total."
          data={keep(running.distance)}
          kind="line"
          unit="mi"
          empty="No logged runs in this range."
          series={[{ key: "miles", name: "Miles", color: "var(--accent)" }]}
        />
        <TrendChart
          title="Weekly running distance"
          data={keep(running.weekly)}
          kind="bar"
          unit="mi"
          empty="No running miles in this range."
          series={[{ key: "miles", name: "Miles", color: "var(--good)" }]}
        />
        <TrendChart
          title="Running duration"
          note="Minutes spent running, not the full treadmill clock."
          data={keep(running.duration)}
          kind="line"
          unit="min"
          empty="No running time in this range."
          series={[{ key: "minutes", name: "Minutes", color: "var(--accent)" }]}
        />
        <TrendChart
          title="Average pace"
          note="Total running time divided by total running distance. A higher point is a faster pace."
          data={keep(running.pace)}
          kind="line"
          unit="pace"
          empty="No pace to plot in this range."
          series={[{ key: "pace", name: "Pace", color: "var(--accent)" }]}
        />
        <TrendChart
          title="Fastest mile"
          note={`Best continuous running block of at least 1 mile. The goal line is 7:00. Current best: ${bestText(fastestPace(keep(running.miles)), "mile")}.`}
          data={keep(running.miles)}
          kind="line"
          unit="pace"
          empty="No continuous run of at least 1 mile in this range."
          goal={{ value: MILE_GOAL_SECONDS, name: "7:00" }}
          series={[{ key: "pace", name: "Pace", color: "var(--accent)" }]}
        />
        <TrendChart
          title="Fastest 5K"
          note={`Best continuous running block of at least 3.11 miles. The goal line is 25:00. Current best: ${bestText(fastestPace(keep(running.fiveKs)), "5k")}.`}
          data={keep(running.fiveKs)}
          kind="line"
          unit="pace"
          empty="No continuous run of at least 5K in this range."
          goal={{ value: fiveKPace, name: "25:00" }}
          series={[{ key: "pace", name: "Pace", color: "var(--good)" }]}
        />
        <TrendChart
          title="Activity duration"
          note="Running uses treadmill time. Soccer uses active minutes from the watch. Soccer is not included in the running distance or pace charts."
          data={keep(activityDurationSeries(runs))}
          kind="bar"
          unit="min"
          empty="No running or soccer time in this range."
          series={[{ key: "minutes", name: "Minutes", color: "var(--good)" }]}
        />
        <TrendChart
          title="Treadmill speed"
          note="Fastest running-segment speed in each workout."
          data={keep(running.speed)}
          kind="line"
          unit="mph"
          empty="No running speeds in this range."
          series={[{ key: "mph", name: "Speed", color: "var(--accent)" }]}
        />
      </div>
    </Page>
  );
}

function bestText(point: { pace: number; date: string } | null, kind: "mile" | "5k"): string {
  if (!point) return "not recorded yet";
  if (kind === "mile") {
    const rounded = Math.round(point.pace);
    const minutes = Math.floor(rounded / 60);
    const seconds = rounded % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")} on ${point.date}`;
  }
  const total = Math.round(point.pace * FIVE_K_MILES);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} on ${point.date}`;
}
