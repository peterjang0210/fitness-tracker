import { DEFAULT_PROGRAM_START } from "../domain/runningProgram.ts";
import { normalizeRun, normalizeRunTemplate, type RunTemplate, type RunWorkout } from "../domain/running.ts";
import type { ScheduleOverride } from "../domain/schedule.ts";
import type { WorkoutLog } from "../domain/workoutLog.ts";
import type { SessionKey } from "../domain/strengthProgram.ts";

export const STORAGE_KEY = "iron-mile.v1";

export type ThemePreference = "light" | "dark" | "system";
export type WeightUnit = "lb" | "kg";

export interface Settings {
  theme: ThemePreference;
  weightUnit: WeightUnit;
  updatedAt: string | null;
}

/**
 * Versioned document stored in localStorage.
 * Later stages add fields here and normalize them in `normalizeAppData`.
 */
export interface AppData {
  version: 1;
  settings: Settings;
  workouts: WorkoutLog[];
  runs: RunWorkout[];
  runTemplates: RunTemplate[];
  runningProgramStart: string;
  scheduleOverrides: ScheduleOverride[];
  libraryEdits: LibraryEdit[];
}

export interface LibraryEdit {
  sessionKey: SessionKey;
  exerciseKey: string;
  name: string;
  prescription: string;
  repTarget: string;
}

export const defaultAppData: AppData = {
  version: 1,
  settings: {
    theme: "system",
    weightUnit: "lb",
    updatedAt: null,
  },
  workouts: [],
  runs: [],
  runTemplates: [],
  runningProgramStart: DEFAULT_PROGRAM_START,
  scheduleOverrides: [],
  libraryEdits: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTheme(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "lb" || value === "kg";
}

export function normalizeAppData(value: unknown): AppData {
  if (!isRecord(value) || !isRecord(value.settings)) {
    return defaultAppData;
  }

  const settings = value.settings;
  return {
    version: 1,
    settings: {
      theme: isTheme(settings.theme) ? settings.theme : defaultAppData.settings.theme,
      weightUnit: isWeightUnit(settings.weightUnit)
        ? settings.weightUnit
        : defaultAppData.settings.weightUnit,
      updatedAt: typeof settings.updatedAt === "string" ? settings.updatedAt : null,
    },
    workouts: Array.isArray(value.workouts)
      ? value.workouts.flatMap((workout) => {
          const normalized = normalizeWorkout(workout);
          return normalized ? [normalized] : [];
        })
      : [],
    runs: Array.isArray(value.runs)
      ? value.runs.flatMap((run) => {
          const normalized = normalizeRun(run);
          return normalized ? [normalized] : [];
        })
      : [],
    runTemplates: Array.isArray(value.runTemplates)
      ? value.runTemplates.flatMap((template) => {
          const normalized = normalizeRunTemplate(template);
          return normalized ? [normalized] : [];
        })
      : [],
    runningProgramStart:
      typeof value.runningProgramStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.runningProgramStart)
        ? value.runningProgramStart
        : defaultAppData.runningProgramStart,
    scheduleOverrides: Array.isArray(value.scheduleOverrides)
      ? value.scheduleOverrides.flatMap((item) => {
          const normalized = normalizeOverride(item);
          return normalized ? [normalized] : [];
        })
      : [],
    libraryEdits: Array.isArray(value.libraryEdits)
      ? value.libraryEdits.flatMap((item) => {
          const normalized = normalizeLibraryEdit(item);
          return normalized ? [normalized] : [];
        })
      : [],
  };
}

const sessionKeys: SessionKey[] = ["tuesday-bench", "wednesday-squat", "friday-secondary"];
const statuses = ["pending", "completed", "skipped"] as const;

function normalizeWorkout(value: unknown): WorkoutLog | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.date !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  if (!sessionKeys.includes(value.sessionKey as SessionKey)) return null;
  if (!Array.isArray(value.exercises)) return null;

  const exercises = value.exercises.flatMap((exercise) => {
    const normalized = normalizeExercise(exercise);
    return normalized ? [normalized] : [];
  });

  return {
    id: value.id,
    date: value.date,
    sessionKey: value.sessionKey as SessionKey,
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Workout",
    notes: typeof value.notes === "string" ? value.notes : "",
    unit: isWeightUnit(value.unit) ? value.unit : "lb",
    exercises,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    planWeek: typeof value.planWeek === "number" && value.planWeek >= 1 && value.planWeek <= 16 ? value.planWeek : null,
  };
}

function normalizeOverride(value: unknown): ScheduleOverride | null {
  if (!isRecord(value)) return null;
  const week = value.week;
  const kind = value.kind;
  const key = value.key;
  const date = value.date;
  if (typeof week !== "number" || week < 1 || week > 16) return null;
  if (kind !== "strength" && kind !== "run") return null;
  if (typeof key !== "string") return null;
  if (kind === "strength" && !sessionKeys.includes(key as SessionKey)) return null;
  if (kind === "run" && key !== "tuesday" && key !== "friday" && key !== "weekend") return null;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { week, kind, key, date };
}

function normalizeLibraryEdit(value: unknown): LibraryEdit | null {
  if (!isRecord(value)) return null;
  if (!sessionKeys.includes(value.sessionKey as SessionKey)) return null;
  if (typeof value.exerciseKey !== "string" || !value.exerciseKey.trim()) return null;
  return {
    sessionKey: value.sessionKey as SessionKey,
    exerciseKey: value.exerciseKey,
    name: typeof value.name === "string" ? value.name : "",
    prescription: typeof value.prescription === "string" ? value.prescription : "",
    repTarget: typeof value.repTarget === "string" ? value.repTarget : "",
  };
}

function normalizeExercise(value: unknown): WorkoutLog["exercises"][number] | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.exerciseKey !== "string") return null;
  if (!Array.isArray(value.sets)) return null;
  const sets = value.sets.flatMap((set) => {
    const normalized = normalizeSet(set);
    return normalized ? [normalized] : [];
  });
  return {
    id: value.id,
    exerciseKey: value.exerciseKey,
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Exercise",
    prescription: typeof value.prescription === "string" ? value.prescription : "",
    repTarget: typeof value.repTarget === "string" ? value.repTarget : "",
    optional: value.optional === true,
    status: statuses.includes(value.status as (typeof statuses)[number])
      ? (value.status as (typeof statuses)[number])
      : "pending",
    notes: typeof value.notes === "string" ? value.notes : "",
    supersetId: typeof value.supersetId === "string" ? value.supersetId : null,
    sets: sets.length > 0 ? sets : [{ id: `${value.id}-set`, weight: null, reps: null, rpe: null }],
  };
}

function normalizeSet(value: unknown): WorkoutLog["exercises"][number]["sets"][number] | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    weight: finiteNumber(value.weight),
    reps: finiteNumber(value.reps),
    rpe: finiteNumber(value.rpe),
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppData;
    return normalizeAppData(JSON.parse(raw) as unknown);
  } catch {
    return defaultAppData;
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
