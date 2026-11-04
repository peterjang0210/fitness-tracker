import { segmentDistance } from "./running.ts";
import { runTotals } from "./running.ts";
import type { AppData } from "../storage/appData.ts";
import { normalizeAppData } from "../storage/appData.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseBackup(text: string): AppData | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.settings)) return null;
    return normalizeAppData(value);
  } catch {
    return null;
  }
}

export function backupFilename(today: string): string {
  return `iron-mile-${today}.json`;
}

function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function table(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}

export function strengthCsv(data: AppData): string {
  const rows: (string | number | null)[][] = [
    ["date", "session", "exercise", "exerciseKey", "set", "weight", "unit", "reps", "rpe", "status", "notes"],
  ];
  for (const workout of data.workouts) {
    for (const exercise of workout.exercises) {
      exercise.sets.forEach((set, index) => {
        rows.push([
          workout.date,
          workout.name,
          exercise.name,
          exercise.exerciseKey,
          index + 1,
          set.weight,
          workout.unit,
          set.reps,
          set.rpe,
          exercise.status,
          exercise.notes,
        ]);
      });
    }
  }
  return table(rows);
}

export function runningCsv(data: AppData): string {
  const rows: (string | number | null)[][] = [
    [
      "date",
      "name",
      "status",
      "rpe",
      "planWeek",
      "planSlot",
      "runningMiles",
      "runningMinutes",
      "paceSeconds",
      "segment",
      "segmentType",
      "minutes",
      "seconds",
      "speedMph",
      "segmentMiles",
      "label",
    ],
  ];
  for (const run of data.runs) {
    const totals = runTotals(run.segments);
    run.segments.forEach((segment, index) => {
      rows.push([
        run.date,
        run.name,
        run.status,
        run.rpe,
        run.planWeek,
        run.planSlot,
        Math.round(totals.runningMiles * 10000) / 10000,
        Math.round(totals.runningMinutes * 100) / 100,
        totals.paceSecondsPerMile == null ? null : Math.round(totals.paceSecondsPerMile),
        index + 1,
        segment.type,
        segment.minutes,
        segment.seconds,
        segment.speedMph,
        Math.round(segmentDistance(segment) * 10000) / 10000,
        segment.label,
      ]);
    });
  }
  return table(rows);
}

export function downloadText(filename: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
