import { createId, todayInputDate } from "./workoutLog.ts";

export const segmentTypes = ["warmup", "running", "recovery", "cooldown"] as const;
export type SegmentType = (typeof segmentTypes)[number];

export const segmentLabels: Record<SegmentType, string> = {
  warmup: "Warm-up",
  running: "Running",
  recovery: "Walking recovery",
  cooldown: "Cooldown",
};

export interface RunSegment {
  id: string;
  type: SegmentType;
  minutes: number;
  seconds: number;
  speedMph: number | null;
  label: string;
}

export type RunStatus = "logged" | "skipped";
export type PlanSlot = "tuesday" | "friday" | "weekend";
export type RunDifficulty = "easier" | "planned" | "harder";

export interface RunWorkout {
  id: string;
  date: string;
  name: string;
  notes: string;
  segments: RunSegment[];
  updatedAt: string;
  rpe: number | null;
  status: RunStatus;
  planWeek: number | null;
  planSlot: PlanSlot | null;
  difficulty: RunDifficulty | null;
}

export interface RunTemplate {
  id: string;
  name: string;
  segments: RunSegment[];
  updatedAt: string;
}

export function createSegment(partial?: Partial<Omit<RunSegment, "id">>): RunSegment {
  return {
    id: createId(),
    type: partial?.type ?? "running",
    minutes: partial?.minutes ?? 0,
    seconds: partial?.seconds ?? 0,
    speedMph: partial?.speedMph ?? null,
    label: partial?.label ?? "",
  };
}

export function unplannedRunFields(): Pick<RunWorkout, "rpe" | "status" | "planWeek" | "planSlot" | "difficulty"> {
  return { rpe: null, status: "logged", planWeek: null, planSlot: null, difficulty: null };
}

export function durationMinutes(segment: Pick<RunSegment, "minutes" | "seconds">): number {
  const minutes = positive(segment.minutes);
  const seconds = positive(segment.seconds);
  return minutes + seconds / 60;
}

export function segmentDistance(segment: RunSegment): number {
  if (segment.speedMph == null || segment.speedMph < 0) return 0;
  return (durationMinutes(segment) * segment.speedMph) / 60;
}

export interface RunTotals {
  runningMinutes: number;
  runningMiles: number;
  totalMinutes: number;
  totalMiles: number;
  paceSecondsPerMile: number | null;
}

export function runTotals(segments: RunSegment[]): RunTotals {
  let runningMinutes = 0;
  let runningMiles = 0;
  let totalMinutes = 0;
  let totalMiles = 0;
  for (const segment of segments) {
    const minutes = durationMinutes(segment);
    const miles = segmentDistance(segment);
    totalMinutes += minutes;
    totalMiles += miles;
    if (segment.type === "running") {
      runningMinutes += minutes;
      runningMiles += miles;
    }
  }
  return {
    runningMinutes,
    runningMiles,
    totalMinutes,
    totalMiles,
    paceSecondsPerMile: runningMiles > 0 ? (runningMinutes * 60) / runningMiles : null,
  };
}

export function formatMiles(miles: number): string {
  const rounded = Math.round(miles * 10000) / 10000;
  return `${rounded.toFixed(4).replace(/\.?0+$/, "")} mi`;
}

export function formatClock(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatPace(paceSecondsPerMile: number | null): string {
  if (paceSecondsPerMile == null || !Number.isFinite(paceSecondsPerMile)) return "—";
  const rounded = Math.round(paceSecondsPerMile);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}/mi`;
}

export function benchmarkTotals(): RunTotals {
  return runTotals([createSegment({ type: "running", minutes: 10, speedMph: 5.5 })]);
}

export function blankRun(): RunWorkout {
  return {
    id: createId(),
    date: todayInputDate(),
    name: "Treadmill run",
    notes: "",
    segments: [createSegment({ type: "running", minutes: 10, speedMph: 5.5 })],
    updatedAt: new Date().toISOString(),
    ...unplannedRunFields(),
  };
}

export function exampleRun(): RunWorkout {
  return {
    id: createId(),
    date: todayInputDate(),
    name: "Example intervals",
    notes: "",
    segments: [
      createSegment({ type: "warmup", minutes: 5, speedMph: 3 }),
      createSegment({ type: "running", minutes: 3, speedMph: 6 }),
      createSegment({ type: "running", minutes: 2, speedMph: 7 }),
      createSegment({ type: "running", minutes: 3, speedMph: 8 }),
      createSegment({ type: "recovery", minutes: 2, speedMph: 3 }),
      createSegment({ type: "cooldown", minutes: 5, speedMph: 3 }),
    ],
    updatedAt: new Date().toISOString(),
    ...unplannedRunFields(),
  };
}

export function cloneRun(source: Pick<RunWorkout, "name" | "notes" | "segments">, name?: string): RunWorkout {
  return {
    id: createId(),
    date: todayInputDate(),
    name: name ?? source.name,
    notes: source.notes,
    segments: source.segments.map((segment) => ({ ...segment, id: createId() })),
    updatedAt: new Date().toISOString(),
    ...unplannedRunFields(),
  };
}

export function templateFromRun(run: Pick<RunWorkout, "name" | "segments">): RunTemplate {
  return {
    id: createId(),
    name: run.name.trim() || "Treadmill template",
    segments: run.segments.map((segment) => ({ ...segment, id: createId() })),
    updatedAt: new Date().toISOString(),
  };
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function normalizeRun(value: unknown): RunWorkout | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.date !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Array.isArray(value.segments)) return null;
  const segments = value.segments.flatMap((segment) => {
    const normalized = normalizeSegment(segment);
    return normalized ? [normalized] : [];
  });
  if (segments.length === 0) return null;
  return {
    id: value.id,
    date: value.date,
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Treadmill run",
    notes: typeof value.notes === "string" ? value.notes : "",
    segments,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    rpe: typeof value.rpe === "number" && Number.isFinite(value.rpe) ? value.rpe : null,
    status: value.status === "skipped" ? "skipped" : "logged",
    planWeek: typeof value.planWeek === "number" && value.planWeek >= 1 && value.planWeek <= 16 ? value.planWeek : null,
    planSlot: value.planSlot === "tuesday" || value.planSlot === "friday" || value.planSlot === "weekend" ? value.planSlot : null,
    difficulty: value.difficulty === "easier" || value.difficulty === "planned" || value.difficulty === "harder" ? value.difficulty : null,
  };
}

export function normalizeRunTemplate(value: unknown): RunTemplate | null {
  if (!isRecord(value) || typeof value.id !== "string" || !Array.isArray(value.segments)) return null;
  const segments = value.segments.flatMap((segment) => {
    const normalized = normalizeSegment(segment);
    return normalized ? [normalized] : [];
  });
  if (segments.length === 0) return null;
  return {
    id: value.id,
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Treadmill template",
    segments,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
  };
}

function normalizeSegment(value: unknown): RunSegment | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (!segmentTypes.includes(value.type as SegmentType)) return null;
  return {
    id: value.id,
    type: value.type as SegmentType,
    minutes: positive(typeof value.minutes === "number" ? value.minutes : 0),
    seconds: positive(typeof value.seconds === "number" ? value.seconds : 0),
    speedMph: typeof value.speedMph === "number" && Number.isFinite(value.speedMph) && value.speedMph >= 0 ? value.speedMph : null,
    label: typeof value.label === "string" ? value.label : "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
