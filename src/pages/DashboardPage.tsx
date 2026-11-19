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
  goalPercent,
  liftSeries,
  runEffortSeries,
  fastestPace,
  weeklyActivityMinutes,
} from "../domain/progress.ts";
import { FIVE_K_MILES, currentProgramWeek, planRunFor, weekPlanForBlock } from "../domain/runningProgram.ts";
import { matchingWorkout, nextOpenItem, weekItems, type CalendarItem, type ItemStatus } from "../domain/schedule.ts";
import { activeBlock, blockEndDate, blockLength, daysRemaining, formatGoalValue, recordsForBlock } from "../domain/trainingBlock.ts";
import { formatClock, formatPace } from "../domain/running.ts";
import { convertWeight, formatWeight } from "../domain/strengthProgram.ts";
import { formatDisplayDate, suggestedWeight, todayInputDate } from "../domain/workoutLog.ts";
import { useAppState } from "../state/useAppState.ts";

const statusText: Record<ItemStatus, string> = {
  done: "Done",
  missed: "Missed",
  today: "Today",
  upcoming: "Next",
  skipped: "Skip",
  open: "Open",
};

export function DashboardPage() {
  const { workouts, runs, settings, scheduleOverrides = [], blocks = [], activeBlockId = null } = useAppState();
  const block = activeBlock(blocks, activeBlockId);
  const unit = settings.weightUnit;
  const today = todayInputDate();
  const weekNumber = block ? currentProgramWeek(block.startDate, today, blockLength(block)) : 1;
  const week = block ? weekPlanForBlock(block, weekNumber) : null;
  const schedule = block ? weekItems(block.startDate, weekNumber, scheduleOverrides, workouts, runs, today, block) : [];
  const todayItems = schedule.filter((item) => item.date === today);
  const upcoming = block ? nextOpenItem(block.startDate, scheduleOverrides, workouts, runs, today, block) : null;
  const doneThisWeek = schedule.filter((item) => item.status === "done").length;
  const requiredThisWeek = schedule.filter((item) => !item.optional && item.kind !== "note").length;
  const weeksLeft = block ? Math.max(0, blockLength(block) - weekNumber) : 0;
  const owned = block ? recordsForBlock(block, workouts, runs) : { workouts, runs };
  const activity = weeklyActivityMinutes(runs);

  const bench = liftSeries(owned.workouts, BENCH_KEY, unit).at(-1);
  const squat = liftSeries(owned.workouts, SQUAT_KEY, unit).at(-1);
  const squatForGoal = bestSquatForGoal(owned.workouts, unit);
  const efforts = runEffortSeries(owned.runs);
  const mile = fastestPace(efforts.miles);
  const fiveK = fastestPace(efforts.fiveKs);
  const fiveKSeconds = fiveK ? fiveK.pace * FIVE_K_MILES : null;
  const benchGoal = convertWeight(BENCH_GOAL_LB, "lb", unit);
  const squatGoal = convertWeight(SQUAT_GOAL_LB, "lb", unit);

  const targets = [
    {
      label: "Bench",
      value: formatWeight(benchGoal, unit),
      detail: bench ? formatWeight(bench.working, unit) : "—",
      percent: goalPercent(bench?.working ?? null, benchGoal),
    },
    {
      label: "Squat",
      value: formatWeight(squatGoal, unit),
      detail: squatForGoal ? formatWeight(squatForGoal, unit) : squat ? formatWeight(squat.working, unit) : "—",
      percent: goalPercent(squatForGoal, squatGoal),
    },
    {
      label: "Mile",
      value: "7:00",
      detail: mile ? formatPace(mile.pace) : "—",
      percent: mile ? goalPercent(mile.pace, MILE_GOAL_SECONDS, true) : null,
    },
    {
      label: "5K",
      value: "25:00",
      detail: fiveKSeconds ? formatClock(fiveKSeconds / 60) : "—",
      percent: fiveKSeconds ? goalPercent(fiveKSeconds, FIVE_K_GOAL_SECONDS, true) : null,
    },
  ];

  const tips = buildTips(owned.workouts, unit, schedule, weekNumber, owned.runs);
  const finished = block ? today > blockEndDate(block) : false;

  if (!block || !week) {
    return (
      <Page eyebrow="Training" title="Home" lede="No training block is active.">
        <section className="panel">
          <h2>Start a block</h2>
          <p>The log, charts, and settings are still here. Create a block when you are ready for the next plan.</p>
          <Link className="button primary" to="/blocks">
            Training blocks
          </Link>
        </section>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={block.name}
      title={`Week ${weekNumber}`}
      lede={`${week.phase}. ${doneThisWeek}/${requiredThisWeek || schedule.length} sessions logged this week. ${daysRemaining(block)} days left.`}
    >
      {finished ? (
        <p className="callout">
          This block has reached its end. <Link to="/blocks">Review the results</Link> before you start another one.
        </p>
      ) : null}
      {block.goals.length > 0 ? (
        <section className="panel">
          <h2>Goals</h2>
          <ul className="workout-list">
            {block.goals.map((goal) => (
              <li key={goal.id}>
                <strong>{goal.name}</strong>
                <p className="meta">
                  Target {formatGoalValue(goal.target, goal)}
                  {goal.baseline == null ? "" : ` · start ${formatGoalValue(goal.baseline, goal)}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel focus-panel">
        <h2>Today</h2>
        {todayItems.length === 0 ? (
          <p className="meta">Recovery day — nothing scheduled.</p>
        ) : (
          <ul className="schedule-list">
            {todayItems.map((item) => (
              <li key={`${item.kind}-${item.key}`}>
                <Link className={`schedule-row is-${item.status}`} to={itemHref(item, block.startDate, workouts, runs, block.id)}>
                  <span className={`status-pill is-${item.status}`}>{statusText[item.status]}</span>
                  <span className="schedule-copy">
                    <strong>{item.name}</strong>
                    <span>{item.optional ? "Optional" : item.kind === "strength" ? "Lift" : item.kind === "run" ? "Run" : "Note"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {upcoming && upcoming.date !== today ? (
          <p className="next-up">
            Next: <Link to={itemHref(upcoming, block.startDate, workouts, runs, block.id)}>{upcoming.name}</Link> · {formatDisplayDate(upcoming.date)}
          </p>
        ) : null}
        <div className="inline-actions focus-links">
          <Link className="button primary" to="/workouts">
            Log workout
          </Link>
          <Link className="button" to="/running">
            Log run
          </Link>
          <Link className="button quiet" to="/blocks">
            Blocks
          </Link>
        </div>
      </section>

      <div className="target-grid" aria-label="Training targets">
        {targets.map((target) => (
          <article key={target.label} className="target-card">
            <p>{target.label}</p>
            <strong>{target.value}</strong>
            <span>{target.detail}</span>
            <div className="meter" role="meter" aria-label={`${target.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={target.percent ?? 0}>
              <span style={{ width: `${target.percent ?? 0}%` }} />
            </div>
            <span>{target.percent == null ? "0%" : `${target.percent}%`}</span>
          </article>
        ))}
      </div>

      <section className="panel">
        <h2>This week</h2>
        <p className="meta">
          {doneThisWeek} done · {schedule.filter((item) => item.status === "missed").length} missed
          {activity.soccer > 0 ? ` · soccer ${activity.soccer} min` : ""}
          {activity.running > 0 ? ` · running ${activity.running} min` : ""}
          {weeksLeft > 0 ? ` · ${weeksLeft} week${weeksLeft === 1 ? "" : "s"} left` : " · final week"}
        </p>
        <ul className="schedule-list compact-schedule">
          {schedule
            .filter((item) => item.kind !== "note")
            .map((item) => (
              <li key={`${item.kind}-${item.key}`}>
                <Link className={`schedule-row is-${item.status}`} to={itemHref(item, block.startDate, workouts, runs, block.id)}>
                  <span className={`status-pill is-${item.status}`}>{statusText[item.status]}</span>
                  <span className="schedule-copy">
                    <strong>{item.name}</strong>
                    <span>{formatDisplayDate(item.date)}</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {tips.length > 0 ? (
        <section className="panel tip-panel">
          <h2>Recommendations</h2>
          <ul className="tip-list">
            {tips.map((tip) => (
              <li key={tip.summary}>
                <details>
                  <summary>{tip.summary}</summary>
                  <p className="meta">{tip.detail}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}

function buildTips(
  workouts: Parameters<typeof suggestedWeight>[2],
  unit: Parameters<typeof formatWeight>[1],
  schedule: CalendarItem[],
  weekNumber: number,
  runs: Parameters<typeof weeklyActivityMinutes>[0],
): { summary: string; detail: string }[] {
  const tips: { summary: string; detail: string }[] = [];
  const liftKeys: { key: string; label: string }[] = [
    { key: "flat-bench", label: "Bench" },
    { key: "barbell-squat", label: "Squat" },
  ];
  const today = todayInputDate();
  for (const lift of liftKeys) {
    const suggestion = suggestedWeight(lift.key, { id: "dash", date: today, unit, planWeek: weekNumber }, workouts);
    if (suggestion.weight == null) continue;
    const shown = formatWeight(suggestion.weight, unit);
    let summary = `${lift.label}: work at ${shown}.`;
    if (/adds|increase/i.test(suggestion.note)) summary = `${lift.label}: increase to ${shown}.`;
    else if (/holds|hold|missed twice|lighter/i.test(suggestion.note)) {
      summary = /lighter|7\.5%/i.test(suggestion.note) ? `${lift.label}: reduce to ${shown}.` : `${lift.label}: hold at ${shown}.`;
    }
    tips.push({ summary, detail: suggestion.note });
  }

  const soccer = runs
    .filter((run) => run.activity === "soccer" && run.status !== "skipped")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (soccer && daysAgo(soccer.date, today) <= 7) {
    tips.push({
      summary: `Soccer: ${soccer.activeMinutes ?? "—"} active min.`,
      detail:
        soccer.rpe == null
          ? "Counted as training, not as running distance. Add an effort rating if it should change the next run."
          : `Logged at RPE ${soccer.rpe}. ${soccer.rpe >= 7 ? "The next run stays easier." : "Effort was moderate, so pace is unchanged."}`,
    });
  }

  const nextRun = schedule.find((item) => item.kind === "run" && (item.status === "today" || item.status === "upcoming" || item.status === "open"));
  if (nextRun) {
    tips.push({
      summary: `Next run: ${nextRun.name}.`,
      detail: `Scheduled ${formatDisplayDate(nextRun.date)}. Open the running log to start it.`,
    });
  }

  return tips.slice(0, 4);
}

function daysAgo(date: string, today: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!year || !month || !day || !ty || !tm || !td) return 99;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(year, month - 1, day)) / 86_400_000);
}

function itemHref(
  item: CalendarItem,
  start: string,
  workouts: Parameters<typeof matchingWorkout>[0],
  runs: Parameters<typeof planRunFor>[0],
  blockId?: string | null,
): string {
  if (item.kind === "note") return "/calendar";
  if (item.kind === "strength") {
    const logged = matchingWorkout(workouts, start, item.week, item.key, item.date, blockId);
    return logged ? `/workouts?edit=${logged.id}` : `/workouts?start=${item.key}&date=${item.date}&week=${item.week}`;
  }
  if (item.key === "tuesday" || item.key === "thursday" || item.key === "friday" || item.key === "weekend") {
    const run = planRunFor(runs, item.week, item.key, blockId);
    if (run) return `/running?edit=${run.id}`;
  }
  return `/running?slot=${item.key}&week=${item.week}&date=${item.date}`;
}
