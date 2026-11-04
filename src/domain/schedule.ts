import type { PlanSlot, RunWorkout } from "./running.ts";
import {
  PROGRAM_WEEKS,
  addDays,
  currentProgramWeek,
  planRunFor,
  sessionDate,
  weekPlan,
} from "./runningProgram.ts";
import { sessionTemplate, type SessionKey } from "./strengthProgram.ts";
import { todayInputDate, type WorkoutLog } from "./workoutLog.ts";

export interface ScheduleOverride {
  week: number;
  kind: "strength" | "run";
  key: string;
  date: string;
}

export type ItemStatus = "upcoming" | "today" | "done" | "skipped" | "missed";

export interface CalendarItem {
  week: number;
  kind: "strength" | "run";
  key: string;
  name: string;
  date: string;
  optional: boolean;
  status: ItemStatus;
  order: number;
}

export function scheduledDate(overrides: ScheduleOverride[], week: number, kind: "strength" | "run", key: string, fallback: string): string {
  return overrides.find((item) => item.week === week && item.kind === kind && item.key === key)?.date ?? fallback;
}

export function weekItems(
  start: string,
  week: number,
  overrides: ScheduleOverride[],
  workouts: WorkoutLog[],
  runs: RunWorkout[],
  today = todayInputDate(),
): CalendarItem[] {
  const tuesday = sessionDate(start, week, "tuesday");
  const strength: { key: SessionKey; dayOffset: number; order: number }[] = [
    { key: "tuesday-bench", dayOffset: 0, order: 0 },
    { key: "wednesday-squat", dayOffset: 1, order: 2 },
    { key: "friday-secondary", dayOffset: 3, order: 3 },
  ];
  const items: CalendarItem[] = strength.map((session) => {
    const template = sessionTemplate(session.key);
    const date = scheduledDate(overrides, week, "strength", session.key, addDays(tuesday, session.dayOffset));
    return {
      week,
      kind: "strength",
      key: session.key,
      name: template.name,
      date,
      optional: false,
      status: strengthStatus(workouts, start, week, session.key, date, today),
      order: session.order,
    };
  });
  for (const session of weekPlan(week).sessions) {
    const date = scheduledDate(overrides, week, "run", session.slot, sessionDate(start, week, session.slot));
    items.push({
      week,
      kind: "run",
      key: session.slot,
      name: session.title,
      date,
      optional: Boolean(session.optional),
      status: runStatus(runs, week, session.slot, date, today, Boolean(session.optional)),
      order: session.slot === "tuesday" ? 1 : session.slot === "friday" ? 4 : 5,
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
}

export function nextOpenItem(
  start: string,
  overrides: ScheduleOverride[],
  workouts: WorkoutLog[],
  runs: RunWorkout[],
  today = todayInputDate(),
): CalendarItem | null {
  const week = currentProgramWeek(start, today);
  for (let offset = 0; offset < 3; offset += 1) {
    const number = week + offset;
    if (number > PROGRAM_WEEKS) break;
    const open = weekItems(start, number, overrides, workouts, runs, today).find(
      (item) => item.date >= today && item.status !== "done" && item.status !== "skipped",
    );
    if (open) return open;
  }
  return null;
}

export function missedRequiredRuns(
  start: string,
  beforeDate: string,
  runs: RunWorkout[],
  overrides: ScheduleOverride[],
  today = todayInputDate(),
): number {
  const from = addDays(beforeDate, -14);
  let count = 0;
  for (let week = 1; week <= PROGRAM_WEEKS; week += 1) {
    for (const slot of ["tuesday", "friday"] as const) {
      const date = scheduledDate(overrides, week, "run", slot, sessionDate(start, week, slot));
      if (date >= beforeDate || date < from || date >= today) continue;
      if (!planRunFor(runs, week, slot)) count += 1;
    }
  }
  return count;
}

function programWeek(start: string, date: string): number | null {
  const elapsed = daysFrom(start, date);
  if (elapsed < 0 || elapsed >= PROGRAM_WEEKS * 7) return null;
  return Math.floor(elapsed / 7) + 1;
}

function daysFrom(start: string, date: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = date.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;
  const first = Date.UTC(sy, sm - 1, sd);
  const second = Date.UTC(ey, em - 1, ed);
  return Math.round((second - first) / 86_400_000);
}

export function matchingWorkout(workouts: WorkoutLog[], start: string, week: number, key: string, date: string): WorkoutLog | null {
  return workouts.find((workout) => workout.sessionKey === key && sameStrengthPlan(workout, start, week, date)) ?? null;
}

function strengthStatus(
  workouts: WorkoutLog[],
  start: string,
  week: number,
  key: string,
  date: string,
  today: string,
): ItemStatus {
  const match = matchingWorkout(workouts, start, week, key, date);
  if (match) return match.exercises.every((exercise) => exercise.status === "skipped") ? "skipped" : "done";
  if (date < today) return "missed";
  if (date === today) return "today";
  return "upcoming";
}

function sameStrengthPlan(workout: WorkoutLog, start: string, week: number, date: string): boolean {
  if (workout.planWeek != null) return workout.planWeek === week;
  return workout.date === date || programWeek(start, workout.date) === week;
}

function runStatus(runs: RunWorkout[], week: number, slot: PlanSlot, date: string, today: string, optional: boolean): ItemStatus {
  const saved = planRunFor(runs, week, slot);
  if (saved?.status === "skipped") return "skipped";
  if (saved) return "done";
  if (date < today) return optional ? "skipped" : "missed";
  if (date === today) return "today";
  return "upcoming";
}
