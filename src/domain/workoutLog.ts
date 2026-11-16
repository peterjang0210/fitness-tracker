import {
  convertWeight,
  exerciseTemplate,
  formatWeight,
  isProgramSessionKey,
  sessionTemplate,
  TESTING_WEEK,
  type ProgramSessionKey,
  type SessionKey,
} from "./strengthProgram.ts";
import type { FutureSessionPlan, LibraryEdit, LibraryExercise, WeightUnit } from "../storage/appData.ts";
import { nextLoad, type LiftKind, type LiftPerformance } from "./progression.ts";

export type ExerciseStatus = "pending" | "completed" | "skipped";

export type SetStatus = "pending" | "completed" | "skipped";

export interface SetLog {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string;
  status: SetStatus;
}

export interface ExerciseLog {
  id: string;
  exerciseKey: string;
  name: string;
  prescription: string;
  repTarget: string;
  optional: boolean;
  status: ExerciseStatus;
  notes: string;
  instructions: string;
  targetWeight: number | null;
  supersetId: string | null;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  date: string;
  sessionKey: SessionKey;
  name: string;
  notes: string;
  unit: WeightUnit;
  exercises: ExerciseLog[];
  updatedAt: string;
  planWeek?: number | null;
}

export function createId(): string {
  return crypto.randomUUID();
}

export function todayInputDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function createSet(): SetLog {
  return { id: createId(), weight: null, reps: null, rpe: null, notes: "", status: "pending" };
}

export function isCompletedSet(set: SetLog): boolean {
  return set.status === "completed" && set.reps != null && set.reps > 0;
}

export function applySetPatch(set: SetLog, patch: Partial<SetLog>): SetLog {
  const next: SetLog = {
    ...set,
    ...patch,
    notes: patch.notes ?? set.notes ?? "",
    status: patch.status ?? set.status ?? "pending",
  };
  if (patch.status) return next;
  if (patch.reps !== undefined) {
    next.status = next.reps != null && next.reps > 0 ? "completed" : "pending";
  }
  return next;
}

export function setSignature(set: SetLog): string {
  return JSON.stringify([set.weight, set.reps, set.rpe, set.notes ?? "", set.status]);
}

export function workoutHasLoggedSets(workout: WorkoutLog): boolean {
  return workout.exercises.some((exercise) =>
    exercise.sets.some(
      (set) => set.weight != null || set.reps != null || set.rpe != null || Boolean(set.notes?.trim()) || set.status === "skipped" || set.status === "completed",
    ),
  );
}

export function blankExercise(): ExerciseLog {
  return {
    id: createId(),
    exerciseKey: `custom-${createId()}`,
    name: "Custom exercise",
    prescription: "",
    repTarget: "",
    optional: false,
    status: "pending",
    notes: "",
    instructions: "",
    targetWeight: null,
    supersetId: null,
    sets: [createSet()],
  };
}

export function createCustomWorkout(unit: WeightUnit): WorkoutLog {
  return {
    id: createId(),
    date: todayInputDate(),
    sessionKey: "custom",
    name: "Custom workout",
    notes: "",
    unit,
    exercises: [],
    updatedAt: new Date().toISOString(),
    planWeek: null,
  };
}

export function createWorkout(
  sessionKey: ProgramSessionKey,
  unit: WeightUnit,
  history: WorkoutLog[],
  edits: LibraryEdit[] = [],
  plans: FutureSessionPlan[] = [],
  week: number | null = null,
): WorkoutLog {
  const template = sessionTemplate(sessionKey, week);
  const plan = week === TESTING_WEEK ? undefined : plans.find((item) => item.sessionKey === sessionKey);
  const draft: WorkoutLog = {
    id: createId(),
    date: todayInputDate(),
    sessionKey,
    name: template.name,
    notes: "",
    unit,
    exercises: [],
    updatedAt: new Date().toISOString(),
    planWeek: week,
  };
  if (week === TESTING_WEEK) {
    draft.notes = "Testing week. Skip this if your knee hurts or you are unusually sore.";
  }
  if (plan) {
    const groups = new Map<string, string>();
    draft.exercises = plan.exercises.map((exercise) =>
      loggedExercise(draft, history, {
        exerciseKey: exercise.exerciseKey,
        name: exercise.name,
        prescription: exercise.prescription,
        repTarget: exercise.repTarget,
        optional: exercise.optional,
        instructions: exercise.instructions,
        targetWeight: exercise.targetWeight,
        sets: exercise.sets,
        supersetId: exercise.supersetGroup ? groupId(groups, exercise.supersetGroup) : null,
      }),
    );
    return draft;
  }
  draft.exercises = template.exercises.map((exercise) => {
    const edit = edits.find((item) => item.sessionKey === sessionKey && item.exerciseKey === exercise.exerciseKey);
    return loggedExercise(draft, history, {
      exerciseKey: exercise.exerciseKey,
      name: edit?.name.trim() || exercise.name,
      prescription: edit?.prescription.trim() || exercise.prescription,
      repTarget: edit?.repTarget.trim() || exercise.repTarget,
      optional: Boolean(exercise.optional),
      instructions: "",
      targetWeight: null,
      sets: exercise.sets,
      supersetId: null,
    });
  });
  return draft;
}

function groupId(groups: Map<string, string>, key: string): string {
  const existing = groups.get(key);
  if (existing) return existing;
  const id = createId();
  groups.set(key, id);
  return id;
}

function loggedExercise(
  draft: WorkoutLog,
  history: WorkoutLog[],
  source: {
    exerciseKey: string;
    name: string;
    prescription: string;
    repTarget: string;
    optional: boolean;
    instructions: string;
    targetWeight: number | null;
    sets: number;
    supersetId: string | null;
  },
): ExerciseLog {
  const count = Math.max(1, Math.min(12, source.sets));
  return {
    id: createId(),
    exerciseKey: source.exerciseKey,
    name: source.name,
    prescription: source.prescription,
    repTarget: source.repTarget,
    optional: source.optional,
    status: "pending",
    notes: "",
    instructions: source.instructions,
    targetWeight: source.targetWeight,
    supersetId: source.supersetId,
    sets: Array.from({ length: count }, () => {
      const suggestion = suggestedWeight(source.exerciseKey, draft, history);
      return { ...createSet(), weight: source.targetWeight ?? suggestion.weight };
    }),
  };
}

export function exerciseFromLibrary(entry: LibraryExercise, workout: WorkoutLog, history: WorkoutLog[]): ExerciseLog {
  const template = exerciseTemplate(entry.id);
  return loggedExercise(workout, history, {
    exerciseKey: entry.id,
    name: entry.name,
    prescription: template?.prescription || `${entry.defaultSets}×${entry.defaultReps}`,
    repTarget: entry.defaultReps || template?.repTarget || "",
    optional: false,
    instructions: entry.instructions,
    targetWeight: null,
    sets: entry.defaultSets || template?.sets || 3,
    supersetId: null,
  });
}

export function duplicateExercise(exercise: ExerciseLog): ExerciseLog {
  return {
    ...exercise,
    id: createId(),
    status: "pending",
    notes: "",
    supersetId: null,
    sets: exercise.sets.map((set) => ({ ...createSet(), weight: set.weight })),
  };
}

export function resizeSets(exercise: ExerciseLog, count: number): ExerciseLog {
  const nextCount = Math.max(1, Math.min(12, Math.round(count)));
  if (!Number.isFinite(nextCount)) return exercise;
  const sets = exercise.sets.slice(0, nextCount);
  while (sets.length < nextCount) {
    sets.push({ ...createSet(), weight: exercise.targetWeight });
  }
  return { ...exercise, sets };
}

export function planFromWorkout(workout: WorkoutLog): FutureSessionPlan | null {
  if (!isProgramSessionKey(workout.sessionKey)) return null;
  return {
    sessionKey: workout.sessionKey,
    exercises: workout.exercises
      .filter((exercise) => exercise.name.trim())
      .map((exercise) => ({
        exerciseKey: exercise.exerciseKey,
        name: exercise.name.trim(),
        prescription: exercise.prescription,
        repTarget: exercise.repTarget,
        optional: exercise.optional,
        instructions: exercise.instructions,
        sets: exercise.sets.length,
        supersetGroup: exercise.supersetId,
        targetWeight: exercise.targetWeight,
      })),
  };
}

export function restoreProgramExercises(workout: WorkoutLog, history: WorkoutLog[]): WorkoutLog {
  if (!isProgramSessionKey(workout.sessionKey)) return workout;
  const template = sessionTemplate(workout.sessionKey, workout.planWeek);
  const draft = { ...workout, exercises: [] as ExerciseLog[] };
  draft.exercises = template.exercises.map((exercise) => {
    const existing = workout.exercises.find((item) => item.exerciseKey === exercise.exerciseKey);
    if (existing) {
      return {
        ...existing,
        name: exercise.name,
        prescription: exercise.prescription,
        repTarget: exercise.repTarget,
        optional: Boolean(exercise.optional),
        instructions: "",
        targetWeight: null,
        supersetId: null,
      };
    }
    return loggedExercise(draft, history, {
      exerciseKey: exercise.exerciseKey,
      name: exercise.name,
      prescription: exercise.prescription,
      repTarget: exercise.repTarget,
      optional: Boolean(exercise.optional),
      instructions: "",
      targetWeight: null,
      sets: exercise.sets,
      supersetId: null,
    });
  });
  return draft;
}

export function lastWorkingWeight(exercise: ExerciseLog): number | null {
  const weights = exercise.sets.flatMap((set) => (isCompletedSet(set) && set.weight != null ? [set.weight] : []));
  if (weights.length === 0) return null;
  const counts = new Map<number, number>();
  for (const weight of weights) counts.set(weight, (counts.get(weight) ?? 0) + 1);
  let best = weights[weights.length - 1] ?? null;
  let bestCount = -1;
  for (let index = weights.length - 1; index >= 0; index -= 1) {
    const weight = weights[index];
    if (weight == null) continue;
    const count = counts.get(weight) ?? 0;
    if (count > bestCount) {
      best = weight;
      bestCount = count;
    }
  }
  return best;
}

export function earlierWorkouts(workouts: WorkoutLog[], current: Pick<WorkoutLog, "id" | "date">): WorkoutLog[] {
  return workouts
    .filter((workout) => workout.id !== current.id && workout.date <= current.date)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

export function previousExercise(
  workouts: WorkoutLog[],
  current: Pick<WorkoutLog, "id" | "date">,
  exerciseKey: string,
): { workout: WorkoutLog; exercise: ExerciseLog } | null {
  for (const workout of earlierWorkouts(workouts, current)) {
    const exercise = workout.exercises.find(
      (item) => item.exerciseKey === exerciseKey && item.status !== "skipped" && item.sets.some(isCompletedSet),
    );
    if (exercise) return { workout, exercise };
  }
  return null;
}

export function formatPerformance(exercise: ExerciseLog, unit: WeightUnit): string {
  return exercise.sets
    .map((set) => {
      const weight = set.weight == null ? "no weight" : formatStoredWeight(set.weight, unit);
      const reps = set.reps == null ? "reps not logged" : `${set.reps} reps`;
      const rpe = set.rpe == null ? "" : ` @ RPE ${set.rpe}`;
      return `${weight} × ${reps}${rpe}`;
    })
    .join("; ");
}

function formatStoredWeight(value: number, unit: WeightUnit): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${unit}`;
}

export interface WeightSuggestion {
  weight: number | null;
  note: string;
}

export function suggestedWeight(
  exerciseKey: string,
  current: Pick<WorkoutLog, "id" | "date" | "unit"> & { planWeek?: number | null },
  history: WorkoutLog[],
): WeightSuggestion {
  const progressed = liftProgression(exerciseKey, current, history);
  if (progressed) return progressed;

  const previous = previousExercise(history, current, exerciseKey);
  if (previous) {
    const logged = lastWorkingWeight(previous.exercise);
    if (logged == null) {
      return { weight: null, note: "The last session has no weight to suggest. Enter the load you want." };
    }
    const weight = convertWeight(logged, previous.workout.unit, current.unit);
    return {
      weight,
      note: `Suggested weight matches the last completed session: ${formatWeight(weight, current.unit)}. Change it if you want a different load.`,
    };
  }

  if (exerciseKey === "paused-bench") {
    const bench = previousExercise(history, current, "flat-bench");
    const benchWeight = bench ? lastWorkingWeight(bench.exercise) : null;
    if (bench && benchWeight != null) {
      const weight = Math.round(convertWeight(benchWeight, bench.workout.unit, current.unit) * 0.8 * 2) / 2;
      return {
        weight,
        note: `Paused bench starts near 80% of the last bench session, ${formatWeight(weight, current.unit)}. It progresses on its own after you log it.`,
      };
    }
  }
  const template =
    current.planWeek === TESTING_WEEK
      ? sessionTemplate("wednesday-squat", TESTING_WEEK).exercises.find((item) => item.exerciseKey === exerciseKey) ?? exerciseTemplate(exerciseKey)
      : exerciseTemplate(exerciseKey);
  if (template?.suggestedWeightLb == null) {
    return { weight: null, note: "No stored suggestion. Enter the weight you use." };
  }
  const weight = convertWeight(template.suggestedWeightLb, "lb", current.unit);
  if (current.planWeek === TESTING_WEEK && exerciseKey === "barbell-squat") {
    return {
      weight,
      note: `Suggested start is ${formatWeight(weight, current.unit)} for 2 easy sets. Skip the session if your knee hurts.`,
    };
  }
  return {
    weight,
    note: startingSuggestion(exerciseKey, weight, current.unit),
  };
}

function liftKind(exerciseKey: string): LiftKind | null {
  if (exerciseKey === "flat-bench" || exerciseKey === "paused-bench") return "bench";
  if (exerciseKey === "barbell-squat") return "squat";
  if (exerciseKey === "light-squat") return "light";
  return null;
}

function liftProgression(
  exerciseKey: string,
  current: Pick<WorkoutLog, "id" | "date" | "unit">,
  history: WorkoutLog[],
): WeightSuggestion | null {
  const kind = liftKind(exerciseKey);
  if (!kind) return null;
  const sessions = recentPerformances(history, current, exerciseKey);
  const recommendation = nextLoad(kind, sessions);
  if (!recommendation) return null;
  const separate = exerciseKey === "paused-bench" ? " Paused bench stays separate from Tuesday." : exerciseKey === "light-squat" ? " Light squat stays separate from Wednesday." : "";
  return {
    weight: convertWeight(recommendation.weightLb, "lb", current.unit),
    note: `${recommendation.reason}${separate} Apply it to this draft or type another weight. Saved sessions stay as logged.`,
  };
}

function recentPerformances(
  history: WorkoutLog[],
  current: Pick<WorkoutLog, "id" | "date">,
  exerciseKey: string,
): LiftPerformance[] {
  const performances: LiftPerformance[] = [];
  for (const workout of earlierWorkouts(history, current)) {
    const exercise = workout.exercises.find((item) => item.exerciseKey === exerciseKey && item.status !== "skipped" && item.sets.some(isCompletedSet));
    if (!exercise) continue;
    const working = lastWorkingWeight(exercise);
    if (working == null) continue;
    const sets = exercise.sets.filter((set) => isCompletedSet(set) && set.weight === working);
    const minimum = minimumReps(exercise.repTarget);
    const repsMet = sets.length >= exercise.sets.length && sets.every((set) => (set.reps ?? 0) >= minimum);
    const finalSet = sets.at(-1);
    const maxRpe = finalSet?.rpe ?? null;
    const notes = `${exercise.notes} ${workout.notes}`;
    const failed = !repsMet || (maxRpe != null && maxRpe > 8) || /sore|pain|technique|missed|failed/i.test(notes);
    performances.push({
      weightLb: convertWeight(working, workout.unit, "lb"),
      repsMet,
      maxRpe,
      failed,
    });
    if (performances.length === 2) break;
  }
  return performances;
}

function minimumReps(repTarget: string): number {
  const match = repTarget.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function startingSuggestion(exerciseKey: string, weight: number, unit: WeightUnit): string {
  const shown = formatWeight(weight, unit);
  if (exerciseKey === "flat-bench") {
    return `Suggested next work is ${shown} for 3×5, after 155 lb at RPE 6–7.`;
  }
  if (exerciseKey === "barbell-squat") {
    return `Suggested start is ${shown} for 3×5, from the 145 lb reference. Adjust after warm-ups.`;
  }
  if (exerciseKey === "squat-backoff") {
    return `Optional lighter work at ${shown}. Add a second set if recovery feels fine.`;
  }
  if (exerciseKey === "light-squat") {
    return `Keep this easier than Wednesday. Suggested start is ${shown} for 3×5.`;
  }
  return `Suggested starting weight is ${shown}.`;
}

export function previousSummary(
  exerciseKey: string,
  current: Pick<WorkoutLog, "id" | "date" | "unit"> & { planWeek?: number | null },
  history: WorkoutLog[],
): string {
  const previous = previousExercise(history, current, exerciseKey);
  if (!previous) {
    if (current.planWeek === TESTING_WEEK) {
      const testing = sessionTemplate("wednesday-squat", TESTING_WEEK).exercises.find((item) => item.exerciseKey === exerciseKey);
      if (testing?.baseline) return testing.baseline;
    }
    return exerciseTemplate(exerciseKey)?.baseline ?? "No previous session for this exercise.";
  }
  const performed = formatPerformance(previous.exercise, previous.workout.unit);
  return `${formatDisplayDate(previous.workout.date)}: ${performed}`;
}

export function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function moveExercise(exercises: ExerciseLog[], index: number, direction: -1 | 1): ExerciseLog[] {
  const target = index + direction;
  if (target < 0 || target >= exercises.length) return exercises;
  const next = exercises.slice();
  const [item] = next.splice(index, 1);
  if (!item) return exercises;
  next.splice(target, 0, item);
  return next;
}

export function linkWithNext(exercises: ExerciseLog[], index: number): ExerciseLog[] {
  const current = exercises[index];
  const following = exercises[index + 1];
  if (!current || !following) return exercises;
  const supersetId = current.supersetId ?? following.supersetId ?? createId();
  const replaced = new Set([current.supersetId, following.supersetId].filter((id): id is string => Boolean(id)));
  return normalizeSupersets(
    exercises.map((exercise) => {
      if (exercise.id === current.id || exercise.id === following.id || (exercise.supersetId && replaced.has(exercise.supersetId))) {
        return { ...exercise, supersetId };
      }
      return exercise;
    }),
  );
}

export function unlinkExercise(exercises: ExerciseLog[], exerciseId: string): ExerciseLog[] {
  return normalizeSupersets(
    exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, supersetId: null } : exercise)),
  );
}

export function normalizeSupersets(exercises: ExerciseLog[]): ExerciseLog[] {
  const counts = new Map<string, number>();
  for (const exercise of exercises) {
    if (!exercise.supersetId) continue;
    counts.set(exercise.supersetId, (counts.get(exercise.supersetId) ?? 0) + 1);
  }
  return exercises.map((exercise) =>
    exercise.supersetId && (counts.get(exercise.supersetId) ?? 0) < 2 ? { ...exercise, supersetId: null } : exercise,
  );
}

export function supersetLabels(exercises: ExerciseLog[]): Map<string, string> {
  const labels = new Map<string, string>();
  let nextCode = 65;
  for (const exercise of exercises) {
    if (!exercise.supersetId || labels.has(exercise.supersetId)) continue;
    labels.set(exercise.supersetId, `Superset ${String.fromCharCode(nextCode)}`);
    nextCode += 1;
  }
  return labels;
}

export function sortWorkouts(workouts: WorkoutLog[]): WorkoutLog[] {
  return workouts.slice().sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}
