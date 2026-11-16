import type { PlanSlot, RunWorkout } from "./running.ts";
import {
  PROGRAM_WEEKS,
  addDays,
  currentProgramWeek,
  planRunFor,
  sessionDate,
  weekPlan,
} from "./runningProgram.ts";
import { sessionTemplate, type ProgramSessionKey } from "./strengthProgram.ts";
import { todayInputDate, type WorkoutLog } from "./workoutLog.ts";

export interface ScheduleOverride {
  week: number;
  kind: "strength" | "run";
  key: string;
  date: string;
}

export type ItemStatus = "upcoming" | "today" | "done" | "skipped" | "missed" | "open";

export interface CalendarItem {
  week: number;
  kind: "strength" | "run" | "note";
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
  const plan = weekPlan(week);
  const strength: { key: ProgramSessionKey; dayOffset: number; order: number }[] = plan.testing
    ? [{ key: "wednesday-squat", dayOffset: 1, order: 2 }]
    : [
        { key: "tuesday-bench", dayOffset: 0, order: 0 },
        { key: "wednesday-squat", dayOffset: 1, order: 2 },
        { key: "friday-secondary", dayOffset: 3, order: 3 },
      ];
  const items: CalendarItem[] = strength.map((session) => {
    const template = sessionTemplate(session.key, week);
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
  for (const session of plan.sessions) {
    const date = scheduledDate(overrides, week, "run", session.slot, sessionDate(start, week, session.slot));
    items.push({
      week,
      kind: "run",
      key: session.slot,
      name: session.title,
      date,
      optional: Boolean(session.optional),
      status: runStatus(runs, week, session.slot, date, today, Boolean(session.optional), Boolean(session.postponable)),
      order: session.slot === "tuesday" ? 1 : session.slot === "thursday" ? 3 : session.slot === "friday" ? 4 : 5,
    });
  }
  if (plan.testing) {
    items.push(
      noteItem(week, "monday-rest", "Rest or light walk", addDays(tuesday, -1), today, 0),
      noteItem(week, "thursday-rest", "Rest or easy walk", addDays(tuesday, 2), today, 3),
      noteItem(week, "sunday-review", "Review the tests", addDays(tuesday, 5), today, 6),
    );
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
      (item) => item.kind !== "note" && item.status !== "done" && item.status !== "skipped" && (item.date >= today || item.status === "open"),
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
    for (const session of weekPlan(week).sessions) {
      if (session.optional || session.postponable) continue;
      const slot = session.slot;
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

function noteItem(week: number, key: string, name: string, date: string, today: string, order: number): CalendarItem {
  return {
    week,
    kind: "note",
    key,
    name,
    date,
    optional: true,
    status: date < today ? "skipped" : date === today ? "today" : "upcoming",
    order,
  };
}

function runStatus(
  runs: RunWorkout[],
  week: number,
  slot: PlanSlot,
  date: string,
  today: string,
  optional: boolean,
  postponable: boolean,
): ItemStatus {
  const saved = planRunFor(runs, week, slot);
  if (saved?.status === "skipped") return "skipped";
  if (saved) return "done";
  if (date < today) {
    if (postponable) return "open";
    return optional ? "skipped" : "missed";
  }
  if (date === today) return "today";
  return "upcoming";
}
