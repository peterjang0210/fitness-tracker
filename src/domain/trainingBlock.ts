import { BENCH_GOAL_LB, BENCH_KEY, FIVE_K_GOAL_SECONDS, MILE_GOAL_SECONDS, SQUAT_GOAL_LB, SQUAT_KEY, fastestPace, liftSeries, runEffortSeries } from "./progress.ts";
import { FIVE_K_MILES, addDays, daysBetween } from "./runningProgram.ts";
import { isSoccer, type RunWorkout } from "./running.ts";
import { createId, isCompletedSet, todayInputDate, type WorkoutLog } from "./workoutLog.ts";

export const FIRST_BLOCK_ID = "block-initial";
export const MAX_BLOCK_WEEKS = 52;

export type BlockStatus = "upcoming" | "active" | "completed" | "archived";
export type BlockEmphasis = "balanced" | "strength" | "running" | "maintain" | "general";
export type GoalCategory = "strength" | "running" | "general";
export type GoalMetric = "weight" | "weight-reps" | "e1rm" | "time" | "distance" | "frequency" | "duration";
export type GoalOutcome = "beyond" | "achieved" | "partial" | "missed" | "untested";

export interface BlockDays {
  bench: boolean;
  squat: boolean;
  secondary: boolean;
  shortRun: boolean;
  quality: boolean;
  longRun: boolean;
}

export interface TrainingGoal {
  id: string;
  name: string;
  category: GoalCategory;
  metric: GoalMetric;
  target: number;
  unit: string;
  reps: number | null;
  exerciseKey: string | null;
  notes: string;
  baseline: number | null;
  baselineNote: string;
}

export interface GoalReview {
  goalId: string;
  name: string;
  baseline: string;
  final: string;
  target: string;
  outcome: GoalOutcome;
}

export interface BlockAssessment {
  confirmedAt: string;
  workoutsLogged: number;
  runsLogged: number;
  soccerSessions: number;
  scheduled: number;
  completed: number;
  missed: number;
  runningMiles: number;
  goals: GoalReview[];
}

export interface TrainingBlock {
  id: string;
  name: string;
  startDate: string;
  trainingWeeks: number;
  includeTesting: boolean;
  status: BlockStatus;
  emphasis: BlockEmphasis;
  days: BlockDays;
  qualityStartWeek: number;
  goals: TrainingGoal[];
  summaryNote: string;
  assessment: BlockAssessment | null;
}

export const defaultDays = (): BlockDays => ({
  bench: true,
  squat: true,
  secondary: true,
  shortRun: true,
  quality: true,
  longRun: true,
});

export function blockLength(block: Pick<TrainingBlock, "trainingWeeks" | "includeTesting">): number {
  return Math.max(1, block.trainingWeeks) + (block.includeTesting ? 1 : 0);
}

export function blockEndDate(block: Pick<TrainingBlock, "startDate" | "trainingWeeks" | "includeTesting">): string {
  return addDays(block.startDate, blockLength(block) * 7 - 1);
}

export function daysRemaining(block: TrainingBlock, today = todayInputDate()): number {
  return Math.max(0, daysBetween(today, blockEndDate(block)));
}

export function usesBuiltInPlan(block: TrainingBlock): boolean {
  const days = block.days;
  return (
    block.trainingWeeks === 16 &&
    block.includeTesting &&
    block.emphasis === "balanced" &&
    block.qualityStartWeek === 3 &&
    days.bench &&
    days.squat &&
    days.secondary &&
    days.shortRun &&
    days.quality &&
    days.longRun
  );
}

export function phaseWeek(block: TrainingBlock, week: number): number {
  const total = blockLength(block);
  if (block.includeTesting && week >= total) return 17;
  if (block.emphasis === "maintain" || block.emphasis === "general") return 2;
  if (block.emphasis === "running") return Math.min(4, Math.max(1, week));
  if (block.trainingWeeks === 16 && block.emphasis === "balanced") return Math.min(16, Math.max(1, week));
  const span = Math.max(1, block.trainingWeeks - 1);
  return Math.min(16, Math.max(1, Math.round(((week - 1) / span) * 15) + 1));
}

export function activeBlock(blocks: TrainingBlock[], activeBlockId: string | null): TrainingBlock | null {
  return blocks.find((block) => block.id === activeBlockId && block.status === "active") ?? blocks.find((block) => block.status === "active") ?? null;
}

export function initialBlock(startDate: string): TrainingBlock {
  return {
    id: FIRST_BLOCK_ID,
    name: "16-week strength and running",
    startDate,
    trainingWeeks: 16,
    includeTesting: true,
    status: "active",
    emphasis: "balanced",
    days: defaultDays(),
    qualityStartWeek: 3,
    summaryNote: "The first block. Bench 225, squat 315 for 3, a 7:00 mile, and a sub-25 5K.",
    assessment: null,
    goals: [
      goalDraft({
        name: "Bench press",
        category: "strength",
        metric: "weight",
        target: BENCH_GOAL_LB,
        unit: "lb",
        exerciseKey: BENCH_KEY,
        baseline: 160,
        baselineNote: "Working weight about 160 lb for 3×5. Historical max about 215 lb.",
      }),
      goalDraft({
        name: "Squat",
        category: "strength",
        metric: "weight-reps",
        target: SQUAT_GOAL_LB,
        unit: "lb",
        reps: 3,
        exerciseKey: SQUAT_KEY,
        baseline: 145,
        baselineNote: "Working weight about 145 lb for 3×5. Historical max about 375 lb.",
      }),
      goalDraft({
        name: "Mile",
        category: "running",
        metric: "time",
        target: MILE_GOAL_SECONDS,
        unit: "sec",
        baseline: null,
        baselineNote: "No mile test logged at the start of this block.",
      }),
      goalDraft({
        name: "5K",
        category: "running",
        metric: "time",
        target: FIVE_K_GOAL_SECONDS,
        unit: "sec",
        baseline: null,
        baselineNote: "No 5K test logged at the start of this block.",
      }),
    ],
  };
}

export function goalDraft(partial: Partial<TrainingGoal> & Pick<TrainingGoal, "name" | "category" | "metric" | "target" | "unit">): TrainingGoal {
  return {
    id: partial.id ?? createId(),
    name: partial.name,
    category: partial.category,
    metric: partial.metric,
    target: partial.target,
    unit: partial.unit,
    reps: partial.reps ?? null,
    exerciseKey: partial.exerciseKey ?? null,
    notes: partial.notes ?? "",
    baseline: partial.baseline ?? null,
    baselineNote: partial.baselineNote ?? "",
  };
}

export function blankBlock(startDate: string): TrainingBlock {
  return {
    id: createId(),
    name: "New training block",
    startDate,
    trainingWeeks: 8,
    includeTesting: true,
    status: "upcoming",
    emphasis: "balanced",
    days: defaultDays(),
    qualityStartWeek: 3,
    goals: [],
    summaryNote: "",
    assessment: null,
  };
}

export function recordsForBlock(block: TrainingBlock, workouts: WorkoutLog[], runs: RunWorkout[]): { workouts: WorkoutLog[]; runs: RunWorkout[] } {
  const owns = (id: string | null | undefined) => id === block.id || (id == null && block.id === FIRST_BLOCK_ID);
  return {
    workouts: workouts.filter((workout) => owns(workout.blockId)),
    runs: runs.filter((run) => owns(run.blockId)),
  };
}

export function suggestBaseline(goal: TrainingGoal, workouts: WorkoutLog[], runs: RunWorkout[]): { baseline: number | null; baselineNote: string } {
  if (goal.category === "strength" && goal.exerciseKey) {
    const series = liftSeries(workouts, goal.exerciseKey, "lb");
    const latest = series.at(-1);
    if (!latest) return { baseline: goal.baseline, baselineNote: goal.baselineNote || "No completed sets yet." };
    const value = goal.metric === "e1rm" ? latest.oneRm : latest.working;
    return {
      baseline: Math.round(value * 10) / 10,
      baselineNote: `Latest logged ${goal.metric === "e1rm" ? "estimated 1RM" : "working weight"} is ${Math.round(value)} lb.`,
    };
  }
  if (goal.metric === "time") {
    const efforts = runEffortSeries(runs.filter((run) => !isSoccer(run)));
    const mile = goal.name.toLowerCase().includes("mile") || goal.target <= 900;
    const point = fastestPace(mile ? efforts.miles : efforts.fiveKs);
    if (!point) return { baseline: null, baselineNote: "No matching continuous run is logged yet." };
    const seconds = mile ? point.pace : Math.round(point.pace * FIVE_K_MILES);
    return { baseline: seconds, baselineNote: `Best logged ${mile ? "mile" : "5K"} so far.` };
  }
  if (goal.metric === "distance") {
    const miles = runEffortSeries(runs.filter((run) => !isSoccer(run))).weekly.at(-1)?.miles;
    const baseline = typeof miles === "number" ? miles : null;
    return { baseline, baselineNote: baseline == null ? "No running distance logged yet." : "Latest weekly running distance." };
  }
  if (goal.metric === "frequency" || goal.metric === "duration") {
    const soccer = runs.filter((run) => isSoccer(run) && run.status !== "skipped").length;
    return { baseline: soccer, baselineNote: "Count of soccer sessions already logged." };
  }
  return { baseline: goal.baseline, baselineNote: goal.baselineNote };
}

function lowerIsBetter(metric: GoalMetric): boolean {
  return metric === "time";
}

export function goalOutcome(goal: TrainingGoal, final: number | null): GoalOutcome {
  if (final == null || !Number.isFinite(final)) return "untested";
  const better = lowerIsBetter(goal.metric) ? final < goal.target : final > goal.target;
  const met = lowerIsBetter(goal.metric) ? final <= goal.target : final >= goal.target;
  if (better) return "beyond";
  if (met) return "achieved";
  if (goal.baseline != null) {
    const improved = lowerIsBetter(goal.metric) ? final < goal.baseline : final > goal.baseline;
    if (improved) return "partial";
  }
  return "missed";
}

export function formatGoalValue(value: number | null, goal: Pick<TrainingGoal, "metric" | "unit" | "reps">): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (goal.metric === "time") {
    const rounded = Math.round(value);
    const minutes = Math.floor(rounded / 60);
    const seconds = rounded % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const reps = goal.metric === "weight-reps" && goal.reps ? ` × ${goal.reps}` : "";
  return `${shown} ${goal.unit}${reps}`.trim();
}

export function reviewBlock(block: TrainingBlock, workouts: WorkoutLog[], runs: RunWorkout[], today = todayInputDate()): BlockAssessment {
  const owned = recordsForBlock(block, workouts, runs);
  const loggedRuns = owned.runs.filter((run) => run.status !== "skipped" && !isSoccer(run));
  const soccerSessions = owned.runs.filter((run) => run.status !== "skipped" && isSoccer(run)).length;
  const workoutsLogged = owned.workouts.filter((workout) => workout.exercises.some((exercise) => exercise.sets.some(isCompletedSet))).length;
  const elapsed = Math.min(blockLength(block), Math.max(0, Math.floor(daysBetween(block.startDate, today) / 7) + (daysBetween(block.startDate, today) >= 0 ? 1 : 0)));
  let scheduled = 0;
  const strengthDays = [block.days.bench, block.days.squat, block.days.secondary].filter(Boolean).length;
  for (let week = 1; week <= elapsed; week += 1) {
    const testing = block.includeTesting && week === blockLength(block);
    scheduled += testing ? (block.days.squat ? 1 : 0) : strengthDays;
    if (block.days.shortRun) scheduled += 1;
    if (block.days.longRun) scheduled += 1;
    if (!testing && block.days.quality && week >= block.qualityStartWeek && block.emphasis !== "general") scheduled += 1;
    if (testing && block.includeTesting) scheduled += 2;
  }
  const completed = workoutsLogged + loggedRuns.length + soccerSessions;
  const runningMiles = loggedRuns.reduce((sum, run) => sum + run.segments.reduce((miles, segment) => miles + (segment.type === "running" && segment.speedMph ? ((segment.minutes + segment.seconds / 60) * segment.speedMph) / 60 : 0), 0), 0);
  return {
    confirmedAt: "",
    workoutsLogged,
    runsLogged: loggedRuns.length,
    soccerSessions,
    scheduled,
    completed,
    missed: Math.max(0, scheduled - completed),
    runningMiles: Math.round(runningMiles * 100) / 100,
    goals: block.goals.map((goal) => {
      const final = finalValue(goal, owned.workouts, owned.runs);
      return {
        goalId: goal.id,
        name: goal.name,
        baseline: formatGoalValue(goal.baseline, goal),
        final: formatGoalValue(final, goal),
        target: formatGoalValue(goal.target, goal),
        outcome: goalOutcome(goal, final),
      };
    }),
  };
}

function finalValue(goal: TrainingGoal, workouts: WorkoutLog[], runs: RunWorkout[]): number | null {
  if (goal.exerciseKey && (goal.metric === "weight" || goal.metric === "weight-reps" || goal.metric === "e1rm")) {
    const series = liftSeries(workouts, goal.exerciseKey, "lb");
    const best = series.reduce<{ working: number; oneRm: number } | null>((current, point) => {
      if (!current || point.oneRm > current.oneRm) return point;
      return current;
    }, null);
    if (!best) return null;
    return Math.round((goal.metric === "e1rm" ? best.oneRm : best.working) * 10) / 10;
  }
  if (goal.metric === "time") {
    const efforts = runEffortSeries(runs.filter((run) => !isSoccer(run)));
    const mile = goal.name.toLowerCase().includes("mile") || goal.target <= 900;
    const point = fastestPace(mile ? efforts.miles : efforts.fiveKs);
    if (!point) return null;
    return mile ? point.pace : Math.round(point.pace * FIVE_K_MILES);
  }
  if (goal.metric === "distance") {
    return runEffortSeries(runs.filter((run) => !isSoccer(run))).distance.reduce((sum, point) => sum + (typeof point.miles === "number" ? point.miles : 0), 0);
  }
  if (goal.metric === "frequency") return runs.filter((run) => isSoccer(run) && run.status !== "skipped").length + workouts.length;
  if (goal.metric === "duration") {
    return runs.reduce((sum, run) => sum + (isSoccer(run) ? (run.activeMinutes ?? 0) : 0), 0);
  }
  return null;
}

export interface BlockComparisonRow {
  label: string;
  left: string;
  right: string;
}

export function compareBlocks(left: TrainingBlock, right: TrainingBlock, workouts: WorkoutLog[], runs: RunWorkout[]): BlockComparisonRow[] {
  const a = reviewBlock(left, workouts, runs, blockEndDate(left));
  const b = reviewBlock(right, workouts, runs, blockEndDate(right));
  const rate = (review: BlockAssessment) => (review.scheduled === 0 ? "—" : `${Math.round((review.completed / review.scheduled) * 100)}%`);
  const achieved = (review: BlockAssessment) => {
    const scored = review.goals.filter((goal) => goal.outcome !== "untested");
    if (scored.length === 0) return "—";
    const wins = scored.filter((goal) => goal.outcome === "achieved" || goal.outcome === "beyond").length;
    return `${wins}/${scored.length}`;
  };
  return [
    { label: "Workouts logged", left: String(a.workoutsLogged), right: String(b.workoutsLogged) },
    { label: "Runs logged", left: String(a.runsLogged), right: String(b.runsLogged) },
    { label: "Running miles", left: a.runningMiles.toFixed(2), right: b.runningMiles.toFixed(2) },
    { label: "Completion", left: rate(a), right: rate(b) },
    { label: "Goals met", left: achieved(a), right: achieved(b) },
    ...left.goals.slice(0, 4).map((goal, index) => ({
      label: goal.name,
      left: a.goals[index]?.final ?? "—",
      right: b.goals.find((item) => item.name === goal.name)?.final ?? "—",
    })),
  ];
}

export function normalizeGoal(value: unknown): TrainingGoal | null {
  if (!value || typeof value !== "object") return null;
  const goal = value as Partial<TrainingGoal>;
  if (typeof goal.id !== "string" || typeof goal.name !== "string" || !goal.name.trim()) return null;
  const category: GoalCategory = goal.category === "running" || goal.category === "general" ? goal.category : "strength";
  const metrics: GoalMetric[] = ["weight", "weight-reps", "e1rm", "time", "distance", "frequency", "duration"];
  const metric = metrics.includes(goal.metric as GoalMetric) ? (goal.metric as GoalMetric) : "weight";
  return {
    id: goal.id,
    name: goal.name.trim(),
    category,
    metric,
    target: typeof goal.target === "number" && Number.isFinite(goal.target) ? goal.target : 0,
    unit: typeof goal.unit === "string" && goal.unit.trim() ? goal.unit : "lb",
    reps: typeof goal.reps === "number" && Number.isFinite(goal.reps) ? goal.reps : null,
    exerciseKey: typeof goal.exerciseKey === "string" ? goal.exerciseKey : null,
    notes: typeof goal.notes === "string" ? goal.notes : "",
    baseline: typeof goal.baseline === "number" && Number.isFinite(goal.baseline) ? goal.baseline : null,
    baselineNote: typeof goal.baselineNote === "string" ? goal.baselineNote : "",
  };
}

export function normalizeBlock(value: unknown): TrainingBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Partial<TrainingBlock>;
  if (typeof block.id !== "string" || typeof block.name !== "string") return null;
  if (typeof block.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(block.startDate)) return null;
  const statuses: BlockStatus[] = ["upcoming", "active", "completed", "archived"];
  const emphases: BlockEmphasis[] = ["balanced", "strength", "running", "maintain", "general"];
  const days = block.days ?? defaultDays();
  return {
    id: block.id,
    name: block.name.trim() || "Training block",
    startDate: block.startDate,
    trainingWeeks: typeof block.trainingWeeks === "number" ? Math.min(MAX_BLOCK_WEEKS, Math.max(1, Math.round(block.trainingWeeks))) : 8,
    includeTesting: block.includeTesting !== false,
    status: statuses.includes(block.status as BlockStatus) ? (block.status as BlockStatus) : "upcoming",
    emphasis: emphases.includes(block.emphasis as BlockEmphasis) ? (block.emphasis as BlockEmphasis) : "balanced",
    days: {
      bench: days.bench !== false,
      squat: days.squat !== false,
      secondary: days.secondary !== false,
      shortRun: days.shortRun !== false,
      quality: days.quality !== false,
      longRun: days.longRun !== false,
    },
    qualityStartWeek: typeof block.qualityStartWeek === "number" ? Math.max(1, Math.round(block.qualityStartWeek)) : 3,
    goals: Array.isArray(block.goals) ? block.goals.flatMap((goal) => {
      const normalized = normalizeGoal(goal);
      return normalized ? [normalized] : [];
    }) : [],
    summaryNote: typeof block.summaryNote === "string" ? block.summaryNote : "",
    assessment: normalizeAssessment(block.assessment),
  };
}

function normalizeAssessment(value: unknown): BlockAssessment | null {
  if (!value || typeof value !== "object") return null;
  const review = value as Partial<BlockAssessment>;
  if (!Array.isArray(review.goals)) return null;
  return {
    confirmedAt: typeof review.confirmedAt === "string" ? review.confirmedAt : "",
    workoutsLogged: numberOrZero(review.workoutsLogged),
    runsLogged: numberOrZero(review.runsLogged),
    soccerSessions: numberOrZero(review.soccerSessions),
    scheduled: numberOrZero(review.scheduled),
    completed: numberOrZero(review.completed),
    missed: numberOrZero(review.missed),
    runningMiles: numberOrZero(review.runningMiles),
    goals: review.goals.flatMap((goal) => {
      if (!goal || typeof goal !== "object") return [];
      const item = goal as Partial<GoalReview>;
      if (typeof item.goalId !== "string" || typeof item.name !== "string") return [];
      const outcomes: GoalOutcome[] = ["beyond", "achieved", "partial", "missed", "untested"];
      return [{
        goalId: item.goalId,
        name: item.name,
        baseline: typeof item.baseline === "string" ? item.baseline : "—",
        final: typeof item.final === "string" ? item.final : "—",
        target: typeof item.target === "string" ? item.target : "—",
        outcome: outcomes.includes(item.outcome as GoalOutcome) ? (item.outcome as GoalOutcome) : "untested",
      }];
    }),
  };
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
