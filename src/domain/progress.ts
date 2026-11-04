import { FIVE_K_MILES, addDays, currentProgramWeek, planRunFor, sessionDate, weekPlan } from "./runningProgram.ts";
import { durationMinutes, runTotals, segmentDistance, type PlanSlot, type RunWorkout } from "./running.ts";
import { convertWeight } from "./strengthProgram.ts";
import { lastWorkingWeight, todayInputDate, type WorkoutLog } from "./workoutLog.ts";
import type { WeightUnit } from "../storage/appData.ts";

export const BENCH_KEY = "flat-bench";
export const SQUAT_KEY = "barbell-squat";
export const SQUAT_VOLUME_KEYS = new Set(["barbell-squat", "light-squat", "squat-backoff"]);
export const BENCH_GOAL_LB = 225;
export const SQUAT_GOAL_LB = 315;
export const MILE_GOAL_SECONDS = 7 * 60;
export const FIVE_K_GOAL_SECONDS = 25 * 60;

export interface DatedPoint {
  date: string;
  label: string;
  [key: string]: string | number;
}

export interface LiftPoint extends DatedPoint {
  working: number;
  oneRm: number;
}

export interface EffortPoint extends DatedPoint {
  pace: number;
  miles: number;
}

export function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function weekStart(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function inDateRange(date: string, from: string | null, to: string | null): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function rangeBounds(preset: "4w" | "16w" | "all" | "custom", from: string, to: string, today = todayInputDate()): {
  from: string | null;
  to: string | null;
} {
  if (preset === "all") return { from: null, to: null };
  if (preset === "custom") return { from: from || null, to: to || null };
  const days = preset === "4w" ? 27 : 111;
  return { from: addDays(today, -days), to: today };
}

function displayWeight(weight: number, unit: WeightUnit, display: WeightUnit): number {
  return Math.round(convertWeight(weight, unit, display) * 10) / 10;
}

function epley(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function liftSeries(workouts: WorkoutLog[], exerciseKey: string, display: WeightUnit): LiftPoint[] {
  const points: LiftPoint[] = [];
  for (const workout of workouts.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    const exercise = workout.exercises.find((item) => item.exerciseKey === exerciseKey && item.status !== "skipped");
    if (!exercise) continue;
    const working = lastWorkingWeight(exercise);
    let best = 0;
    for (const set of exercise.sets) {
      if (set.weight == null || set.reps == null || set.reps <= 0) continue;
      best = Math.max(best, epley(set.weight, set.reps));
    }
    if (working == null && best === 0) continue;
    points.push({
      date: workout.date,
      label: shortDate(workout.date),
      working: working == null ? 0 : displayWeight(working, workout.unit, display),
      oneRm: best === 0 ? 0 : Math.round(displayWeight(best, workout.unit, display)),
    });
  }
  return points;
}

export function weeklyVolume(workouts: WorkoutLog[], keys: Set<string>, display: WeightUnit): DatedPoint[] {
  const totals = new Map<string, number>();
  for (const workout of workouts) {
    let volume = 0;
    for (const exercise of workout.exercises) {
      if (!keys.has(exercise.exerciseKey) || exercise.status === "skipped") continue;
      for (const set of exercise.sets) {
        if (set.weight == null || set.reps == null || set.reps <= 0) continue;
        volume += displayWeight(set.weight, workout.unit, display) * set.reps;
      }
    }
    if (volume === 0) continue;
    const week = weekStart(workout.date);
    totals.set(week, (totals.get(week) ?? 0) + volume);
  }
  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, volume]) => ({ date, label: shortDate(date), volume: Math.round(volume) }));
}

export function bestSquatForGoal(workouts: WorkoutLog[], display: WeightUnit): number | null {
  let best: number | null = null;
  for (const workout of workouts) {
    const exercise = workout.exercises.find((item) => item.exerciseKey === SQUAT_KEY && item.status !== "skipped");
    if (!exercise) continue;
    for (const set of exercise.sets) {
      if (set.weight == null || set.reps == null || set.reps < 3) continue;
      const shown = displayWeight(set.weight, workout.unit, display);
      best = best == null ? shown : Math.max(best, shown);
    }
  }
  return best;
}

function loggedRuns(runs: RunWorkout[]): RunWorkout[] {
  return runs
    .filter((run) => run.status !== "skipped")
    .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt));
}

export function runEffortSeries(runs: RunWorkout[]): {
  distance: DatedPoint[];
  duration: DatedPoint[];
  pace: DatedPoint[];
  speed: DatedPoint[];
  weekly: DatedPoint[];
  miles: EffortPoint[];
  fiveKs: EffortPoint[];
} {
  const distance: DatedPoint[] = [];
  const duration: DatedPoint[] = [];
  const pace: DatedPoint[] = [];
  const speed: DatedPoint[] = [];
  const miles: EffortPoint[] = [];
  const fiveKs: EffortPoint[] = [];
  const weeks = new Map<string, number>();

  for (const run of loggedRuns(runs)) {
    const totals = runTotals(run.segments);
    if (totals.runningMiles <= 0) continue;
    const label = shortDate(run.date);
    distance.push({ date: run.date, label, miles: Math.round(totals.runningMiles * 10000) / 10000 });
    duration.push({ date: run.date, label, minutes: Math.round(totals.runningMinutes * 10) / 10 });
    if (totals.paceSecondsPerMile != null) {
      pace.push({ date: run.date, label, pace: Math.round(totals.paceSecondsPerMile) });
    }
    const fastest = run.segments.reduce((best, segment) => {
      if (segment.type !== "running" || segment.speedMph == null) return best;
      return Math.max(best, segment.speedMph);
    }, 0);
    if (fastest > 0) speed.push({ date: run.date, label, mph: fastest });
    const week = weekStart(run.date);
    weeks.set(week, (weeks.get(week) ?? 0) + totals.runningMiles);

    let blockMiles = 0;
    let blockSeconds = 0;
    const flush = () => {
      if (blockMiles >= 1) {
        const paceSeconds = blockSeconds / blockMiles;
        miles.push({ date: run.date, label, pace: Math.round(paceSeconds), miles: Math.round(blockMiles * 1000) / 1000 });
      }
      if (blockMiles + 0.0001 >= FIVE_K_MILES) {
        const paceSeconds = blockSeconds / blockMiles;
        fiveKs.push({
          date: run.date,
          label,
          pace: Math.round(paceSeconds),
          miles: Math.round(blockMiles * 1000) / 1000,
        });
      }
      blockMiles = 0;
      blockSeconds = 0;
    };
    for (const segment of run.segments) {
      if (segment.type !== "running") {
        flush();
        continue;
      }
      blockMiles += segmentDistance(segment);
      blockSeconds += durationMinutes(segment) * 60;
    }
    flush();
  }

  return {
    distance,
    duration,
    pace,
    speed,
    weekly: [...weeks.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, miles]) => ({ date, label: shortDate(date), miles: Math.round(miles * 100) / 100 })),
    miles,
    fiveKs,
  };
}

export function fastestPace(points: EffortPoint[]): EffortPoint | null {
  return points.reduce<EffortPoint | null>((best, point) => (best == null || point.pace < best.pace ? point : best), null);
}

export function filterPoints<T extends { date: string }>(points: T[], from: string | null, to: string | null): T[] {
  return points.filter((point) => inDateRange(point.date, from, to));
}

export interface NextSession {
  date: string;
  name: string;
}

interface SessionCandidate extends NextSession {
  strengthKey?: "tuesday-bench" | "wednesday-squat" | "friday-secondary";
  slot?: PlanSlot;
}

export function nextSession(workouts: WorkoutLog[], runs: RunWorkout[], start: string, today = todayInputDate()): NextSession | null {
  const week = currentProgramWeek(start, today);
  for (let offset = 0; offset < 3; offset += 1) {
    const number = week + offset;
    if (number > 16) break;
    const plan = weekPlan(number);
    const tuesday = sessionDate(start, number, "tuesday");
    const candidates: SessionCandidate[] = [
      { date: tuesday, name: "Bench and upper body", strengthKey: "tuesday-bench" },
      { date: addDays(tuesday, 1), name: "Squat and lower body", strengthKey: "wednesday-squat" },
      { date: sessionDate(start, number, "friday"), name: "Secondary squat and upper body", strengthKey: "friday-secondary" },
    ];
    for (const session of plan.sessions) {
      candidates.push({ date: sessionDate(start, number, session.slot), name: session.title, slot: session.slot });
    }
    candidates.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    for (const candidate of candidates) {
      if (candidate.date < today) continue;
      if (isDone(candidate, workouts, runs, tuesday, number)) continue;
      return { date: candidate.date, name: candidate.name };
    }
  }
  return null;
}

function isDone(candidate: SessionCandidate, workouts: WorkoutLog[], runs: RunWorkout[], tuesday: string, week: number): boolean {
  const sunday = addDays(tuesday, 6);
  if (candidate.strengthKey) {
    return workouts.some(
      (workout) => workout.sessionKey === candidate.strengthKey && workout.date >= tuesday && workout.date <= sunday,
    );
  }
  if (!candidate.slot) return false;
  const saved = planRunFor(runs, week, candidate.slot);
  return saved != null;
}

export function recentStrength(workouts: WorkoutLog[]): WorkoutLog | null {
  return workouts.slice().sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function recentRun(runs: RunWorkout[]): RunWorkout | null {
  return loggedRuns(runs).at(-1) ?? null;
}

export function goalPercent(current: number | null, goal: number, lowerIsBetter = false): number | null {
  if (current == null || current <= 0 || goal <= 0) return null;
  const ratio = lowerIsBetter ? goal / current : current / goal;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}
