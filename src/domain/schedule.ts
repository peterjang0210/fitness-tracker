import type { PlanSlot, RunWorkout } from "./running.ts";
import {
  addDays,
  currentProgramWeek,
  planRunFor,
  sessionDate,
  weekPlanForBlock,
} from "./runningProgram.ts";
import { sessionTemplate, type ProgramSessionKey } from "./strengthProgram.ts";
import type { TrainingBlock } from "./trainingBlock.ts";
import { todayInputDate, type WorkoutLog } from "./workoutLog.ts";

const FIRST_BLOCK_ID = "block-initial";
const MAX_BLOCK_WEEKS = 52;

function span(block: TrainingBlock): number {
  return Math.max(1, block.trainingWeeks) + (block.includeTesting ? 1 : 0);
}

export interface ScheduleOverride {
  week: number;
  kind: "strength" | "run";
  key: string;
  date: string;
  blockId?: string | null;
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

export function scheduledDate(overrides: ScheduleOverride[], week: number, kind: "strength" | "run", key: string, fallback: string, blockId?: string | null): string {
  return (
    overrides.find((item) => item.week === week && item.kind === kind && item.key === key && overrideMatches(item, blockId))?.date ?? fallback
  );
}

function overrideMatches(item: ScheduleOverride, blockId?: string | null): boolean {
  if (!blockId) return item.blockId == null || item.blockId === FIRST_BLOCK_ID;
  if (item.blockId) return item.blockId === blockId;
  return blockId === FIRST_BLOCK_ID;
}

export function weekItems(
  start: string,
  week: number,
  overrides: ScheduleOverride[],
  workouts: WorkoutLog[],
  runs: RunWorkout[],
  today = todayInputDate(),
  block: TrainingBlock,
): CalendarItem[] {
  const tuesday = sessionDate(start, week, "tuesday");
  const plan = weekPlanForBlock(block, week);
  const strength: { key: ProgramSessionKey; dayOffset: number; order: number }[] = plan.testing
    ? block.days.squat
      ? [{ key: "wednesday-squat", dayOffset: 1, order: 2 }]
      : []
    : (
        [
          block.days.bench ? { key: "tuesday-bench" as const, dayOffset: 0, order: 0 } : null,
          block.days.squat ? { key: "wednesday-squat" as const, dayOffset: 1, order: 2 } : null,
          block.days.secondary ? { key: "friday-secondary" as const, dayOffset: 3, order: 3 } : null,
        ] as { key: ProgramSessionKey; dayOffset: number; order: number }[]
      ).filter((session) => session != null);
  const items: CalendarItem[] = strength.map((session) => {
    const template = sessionTemplate(session.key, week);
    const date = scheduledDate(overrides, week, "strength", session.key, addDays(tuesday, session.dayOffset), block.id);
    return {
      week,
      kind: "strength",
      key: session.key,
      name: template.name,
      date,
      optional: false,
      status: strengthStatus(workouts, start, week, session.key, date, today, block.id),
      order: session.order,
    };
  });
  for (const session of plan.sessions) {
    const date = scheduledDate(overrides, week, "run", session.slot, sessionDate(start, week, session.slot), block.id);
    const saved = planRunFor(runs, week, session.slot, block.id);
    const replaced = saved?.activity === "soccer" && saved.status !== "skipped";
    items.push({
      week,
      kind: "run",
      key: session.slot,
      name: replaced ? `Soccer · was ${session.title}` : session.title,
      date,
      optional: Boolean(session.optional),
      status: runStatus(runs, week, session.slot, date, today, Boolean(session.optional), Boolean(session.postponable), block.id),
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
  block: TrainingBlock,
): CalendarItem | null {
  const week = currentProgramWeek(start, today, span(block));
  for (let offset = 0; offset < 3; offset += 1) {
    const number = week + offset;
    if (number > span(block)) break;
    const open = weekItems(start, number, overrides, workouts, runs, today, block).find(
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
  block: TrainingBlock,
): number {
  const from = addDays(beforeDate, -14);
  let count = 0;
  for (let week = 1; week <= span(block); week += 1) {
    for (const session of weekPlanForBlock(block, week).sessions) {
      if (session.optional || session.postponable) continue;
      const slot = session.slot;
      const date = scheduledDate(overrides, week, "run", slot, sessionDate(start, week, slot), block.id);
      if (date >= beforeDate || date < from || date >= today) continue;
      if (!planRunFor(runs, week, slot, block.id)) count += 1;
    }
  }
  return count;
}

function programWeek(start: string, date: string): number | null {
  const elapsed = daysFrom(start, date);
  if (elapsed < 0 || elapsed >= MAX_BLOCK_WEEKS * 7) return null;
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

export function matchingWorkout(workouts: WorkoutLog[], start: string, week: number, key: string, date: string, blockId?: string | null): WorkoutLog | null {
  return workouts.find((workout) => workout.sessionKey === key && sameStrengthPlan(workout, start, week, date) && (!blockId || !workout.blockId || workout.blockId === blockId)) ?? null;
}

function strengthStatus(
  workouts: WorkoutLog[],
  start: string,
  week: number,
  key: string,
  date: string,
  today: string,
  blockId?: string | null,
): ItemStatus {
  const match = matchingWorkout(workouts, start, week, key, date, blockId);
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
  blockId?: string | null,
): ItemStatus {
  const saved = planRunFor(runs, week, slot, blockId);
  if (saved?.status === "skipped") return "skipped";
  if (saved) return "done";
  if (date < today) {
    if (postponable) return "open";
    return optional ? "skipped" : "missed";
  }
  if (date === today) return "today";
  return "upcoming";
}
