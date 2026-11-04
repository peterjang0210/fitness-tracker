import {
  convertWeight,
  exerciseTemplate,
  formatWeight,
  sessionTemplate,
  type SessionKey,
} from "./strengthProgram.ts";
import type { LibraryEdit, WeightUnit } from "../storage/appData.ts";

export type ExerciseStatus = "pending" | "completed" | "skipped";

export interface SetLog {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
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
  return { id: createId(), weight: null, reps: null, rpe: null };
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
    supersetId: null,
    sets: [createSet()],
  };
}

export function createWorkout(
  sessionKey: SessionKey,
  unit: WeightUnit,
  history: WorkoutLog[],
  edits: LibraryEdit[] = [],
): WorkoutLog {
  const template = sessionTemplate(sessionKey);
  const draft: WorkoutLog = {
    id: createId(),
    date: todayInputDate(),
    sessionKey,
    name: template.name,
    notes: "",
    unit,
    exercises: [],
    updatedAt: new Date().toISOString(),
    planWeek: null,
  };
  draft.exercises = template.exercises.map((exercise) => {
    const edit = edits.find((item) => item.sessionKey === sessionKey && item.exerciseKey === exercise.exerciseKey);
    return {
    id: createId(),
    exerciseKey: exercise.exerciseKey,
    name: edit?.name.trim() || exercise.name,
    prescription: edit?.prescription.trim() || exercise.prescription,
    repTarget: edit?.repTarget.trim() || exercise.repTarget,
    optional: Boolean(exercise.optional),
    status: "pending",
    notes: "",
    supersetId: null,
    sets: Array.from({ length: exercise.sets }, () => {
      const suggestion = suggestedWeight(exercise.exerciseKey, draft, history);
      return { id: createId(), weight: suggestion.weight, reps: null, rpe: null };
    }),
  };
  });
  return draft;
}

export function lastWorkingWeight(exercise: ExerciseLog): number | null {
  const weights = exercise.sets.flatMap((set) => (set.weight == null ? [] : [set.weight]));
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
      (item) => item.exerciseKey === exerciseKey && item.status !== "skipped" && item.sets.some(hasEntry),
    );
    if (exercise) return { workout, exercise };
  }
  return null;
}

function hasEntry(set: SetLog): boolean {
  return set.weight != null || set.reps != null || set.rpe != null;
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
  current: Pick<WorkoutLog, "id" | "date" | "unit">,
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

  const template = exerciseTemplate(exerciseKey);
  if (template?.suggestedWeightLb == null) {
    return { weight: null, note: "No stored suggestion. Enter the weight you use." };
  }
  const weight = convertWeight(template.suggestedWeightLb, "lb", current.unit);
  return {
    weight,
    note: startingSuggestion(exerciseKey, weight, current.unit),
  };
}

const liftTargets: Record<string, { sets: number; reps: number }> = {
  "flat-bench": { sets: 3, reps: 5 },
  "barbell-squat": { sets: 3, reps: 5 },
  "light-squat": { sets: 3, reps: 5 },
};

function liftProgression(
  exerciseKey: string,
  current: Pick<WorkoutLog, "id" | "date" | "unit">,
  history: WorkoutLog[],
): WeightSuggestion | null {
  const target = liftTargets[exerciseKey];
  if (!target) return null;
  const previous = previousExercise(history, current, exerciseKey);
  if (!previous) return null;
  const working = lastWorkingWeight(previous.exercise);
  if (working == null) {
    return { weight: null, note: "The last session has no weight to suggest. Enter the load you want." };
  }
  const sets = previous.exercise.sets.filter((set) => set.weight === working && set.reps != null);
  const repsMet = sets.length >= target.sets && sets.every((set) => (set.reps ?? 0) >= target.reps);
  const rpes = sets.flatMap((set) => (set.rpe == null ? [] : [set.rpe]));
  const maxRpe = rpes.length === 0 ? null : Math.max(...rpes);
  const sore = /sore|soreness|pain/i.test(`${previous.exercise.notes} ${previous.workout.notes}`);
  let bumpLb = 0;
  if (repsMet && !sore && (maxRpe == null || maxRpe < 8)) {
    if (exerciseKey === "barbell-squat" && maxRpe != null && maxRpe <= 7) bumpLb = 10;
    else bumpLb = 5;
  }
  const held = convertWeight(working, previous.workout.unit, current.unit);
  const bump = bumpLb === 0 ? 0 : convertWeight(bumpLb, "lb", current.unit);
  const weight = Math.round((held + bump) * 2) / 2;
  return { weight, note: progressionNote(exerciseKey, weight, current.unit, bumpLb, repsMet, maxRpe, sore) };
}

function progressionNote(
  exerciseKey: string,
  weight: number,
  unit: WeightUnit,
  bumpLb: number,
  repsMet: boolean,
  maxRpe: number | null,
  sore: boolean,
): string {
  const shown = formatWeight(weight, unit);
  const lift = exerciseKey === "light-squat" ? "Light squat" : exerciseKey === "barbell-squat" ? "Squat" : "Bench";
  const separate = exerciseKey === "light-squat" ? " It stays separate from the Wednesday squat." : "";
  if (sore) {
    return `${lift} notes mention soreness or pain, so the recommendation holds at ${shown}.${separate} Apply it to this draft, or type another weight. Saved sessions are left as logged.`;
  }
  if (!repsMet) {
    return `${lift} did not complete every working set at the target reps, so the recommendation holds at ${shown}.${separate} Apply it here or change it. Saved sessions are left as logged.`;
  }
  if (maxRpe != null && maxRpe >= 8) {
    return `${lift} reached RPE ${maxRpe}, so the recommendation holds at ${shown} instead of adding weight.${separate} Apply it here or change it. Saved sessions are left as logged.`;
  }
  if (bumpLb === 10) {
    return `Squat reps were complete and RPE was ${maxRpe} or below, so the recommendation adds 10 lb, to ${shown}. Apply it to this draft or type a different load. Saved sessions are left as logged.`;
  }
  if (maxRpe == null) {
    return `${lift} reps were complete and RPE was blank, so the recommendation adds 5 lb, to ${shown}.${separate} Apply it here or change it. Saved sessions are left as logged.`;
  }
  return `${lift} reps were complete at RPE ${maxRpe}, so the recommendation adds 5 lb, to ${shown}.${separate} Apply it here or change it. Saved sessions are left as logged.`;
}

function startingSuggestion(exerciseKey: string, weight: number, unit: WeightUnit): string {
  const shown = formatWeight(weight, unit);
  if (exerciseKey === "flat-bench") {
    return `Suggested next work is ${shown} for 3×5, after 155 lb at RPE 6–7.`;
  }
  if (exerciseKey === "barbell-squat") {
    return `Suggested start is ${shown}, the low end of the 135–155 lb range. Adjust after warm-ups.`;
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
  current: Pick<WorkoutLog, "id" | "date" | "unit">,
  history: WorkoutLog[],
): string {
  const previous = previousExercise(history, current, exerciseKey);
  if (!previous) {
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
