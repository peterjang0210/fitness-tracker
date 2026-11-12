import { TESTING_WEEK } from "./strengthProgram.ts";
import { createId, formatDisplayDate, isCompletedSet, todayInputDate, type WorkoutLog } from "./workoutLog.ts";
import {
  createSegment,
  formatClock,
  formatMiles,
  formatPace,
  runTotals,
  type PlanSlot,
  type RunDifficulty,
  type RunSegment,
  type RunWorkout,
  type SegmentType,
  type TestKind,
} from "./running.ts";

export const PROGRAM_WEEKS = TESTING_WEEK;
export { TESTING_WEEK };
export const DEFAULT_PROGRAM_START = "2026-11-03";
export const MILE_GOAL_MPH = 60 / 7;
export const FIVE_K_MILES = 5000 / 1609.344;
export const FIVE_K_GOAL_MPH = FIVE_K_MILES / (25 / 60);
const METERS_PER_MILE = 1609.344;

export interface PlanBlock {
  type: SegmentType;
  minutes: number;
  seconds?: number;
  speedMph: number;
  label?: string;
  repeats?: number;
  recoveryMinutes?: number;
  recoverySpeed?: number;
}

export interface PlanSession {
  slot: PlanSlot;
  title: string;
  optional?: boolean;
  quality: boolean;
  summary: string;
  blocks: PlanBlock[];
  testKind?: TestKind;
  postponable?: boolean;
  fixed?: boolean;
}

export interface WeekPlan {
  week: number;
  phase: string;
  recovery: boolean;
  testing?: boolean;
  note: string;
  sessions: PlanSession[];
}

export function formatMph(mph: number): string {
  return `${(Math.round(mph * 100) / 100).toFixed(2)} mph`;
}

export function repClock(meters: number, mph: number): { minutes: number; seconds: number; text: string } {
  const totalSeconds = Math.round((meters / METERS_PER_MILE / mph) * 3600);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds, text: `${minutes}:${seconds.toString().padStart(2, "0")}` };
}

function easy(slot: PlanSlot, minutes: number, mph: number, optional = false, range?: string): PlanSession {
  return {
    slot,
    title: optional ? "Optional easy run" : "Easy run",
    optional,
    quality: false,
    summary: range ? `${range} easy at ${mph.toFixed(1)} mph. Suggested ${minutes} min.` : `${minutes} min easy at ${mph.toFixed(1)} mph.`,
    blocks: [{ type: "running", minutes, speedMph: mph }],
  };
}

function repeats(options: {
  slot: PlanSlot;
  title: string;
  reps: number;
  minutes: number;
  seconds?: number;
  speed: number;
  recovery: number;
  label?: string;
  summary: string;
}): PlanSession {
  return {
    slot: options.slot,
    title: options.title,
    quality: true,
    summary: options.summary,
    blocks: [
      { type: "warmup", minutes: 3, speedMph: 3 },
      {
        type: "running",
        minutes: options.minutes,
        seconds: options.seconds,
        speedMph: options.speed,
        repeats: options.reps,
        recoveryMinutes: options.recovery,
        recoverySpeed: 3,
        label: options.label,
      },
      { type: "cooldown", minutes: 3, speedMph: 3 },
    ],
  };
}

const fourHundred = (mph: number) => repClock(400, mph);
const eightHundred = (mph: number) => repClock(800, mph);

export const runningProgram: WeekPlan[] = [
  {
    week: 1,
    phase: "Base",
    recovery: false,
    note: "Start from the 10-minute benchmark. Easy pace stays near 5.5 mph.",
    sessions: [
      easy("tuesday", 10, 5.5),
      repeats({
        slot: "friday",
        title: "Short intervals",
        reps: 4,
        minutes: 1,
        speed: 6,
        recovery: 2,
        summary: "4×1 min at 6.0 mph with 2 min walking recovery.",
      }),
      easy("weekend", 12, 5.5, true, "10–15 min"),
    ],
  },
  {
    week: 2,
    phase: "Base",
    recovery: false,
    note: "Add a little continuous time before adding speed.",
    sessions: [
      easy("tuesday", 12, 5.5),
      repeats({
        slot: "friday",
        title: "Short intervals",
        reps: 5,
        minutes: 1,
        speed: 6,
        recovery: 2,
        summary: "5×1 min at 6.0 mph with 2 min walking recovery.",
      }),
      easy("weekend", 18, 5.5, true, "15–20 min"),
    ],
  },
  {
    week: 3,
    phase: "Base",
    recovery: false,
    note: "The Friday reps get longer. The speed stays at 6.0 mph.",
    sessions: [
      easy("tuesday", 15, 5.5),
      repeats({
        slot: "friday",
        title: "Longer intervals",
        reps: 4,
        minutes: 2,
        speed: 6,
        recovery: 2,
        summary: "4×2 min at 6.0 mph with 2 min walking recovery.",
      }),
      easy("weekend", 20, 5.5, true, "20 min"),
    ],
  },
  {
    week: 4,
    phase: "Base",
    recovery: true,
    note: "Recovery week. Cut the volume and keep the intervals controlled.",
    sessions: [
      easy("tuesday", 10, 5.5),
      repeats({
        slot: "friday",
        title: "Controlled intervals",
        reps: 3,
        minutes: 1,
        speed: 6,
        recovery: 2,
        summary: "3×1 min controlled at 6.0 mph. Smooth, not a sprint.",
      }),
      easy("weekend", 12, 5.5, true, "10–15 min"),
    ],
  },
  {
    week: 5,
    phase: "Continuous",
    recovery: false,
    note: "Build the Tuesday run again. Friday stays at the same interval speed.",
    sessions: [
      easy("tuesday", 18, 5.5),
      repeats({
        slot: "friday",
        title: "Longer intervals",
        reps: 4,
        minutes: 2,
        speed: 6,
        recovery: 2,
        summary: "4×2 min at 6.0 mph with 2 min walking recovery.",
      }),
      easy("weekend", 22, 5.5, true, "20–25 min"),
    ],
  },
  {
    week: 6,
    phase: "Continuous",
    recovery: false,
    note: "One more easy minute block, then a few more 2-minute reps.",
    sessions: [
      easy("tuesday", 20, 5.5),
      repeats({
        slot: "friday",
        title: "Longer intervals",
        reps: 5,
        minutes: 2,
        speed: 6,
        recovery: 2,
        summary: "5×2 min at 6.0 mph with 2 min walking recovery.",
      }),
      easy("weekend", 25, 5.5, true, "25 min"),
    ],
  },
  {
    week: 7,
    phase: "Continuous",
    recovery: false,
    note: "Continuous time is still the priority. The intervals step from 2 minutes to 3.",
    sessions: [
      easy("tuesday", 22, 5.5),
      repeats({
        slot: "friday",
        title: "Longer intervals",
        reps: 3,
        minutes: 3,
        speed: 6,
        recovery: 2,
        summary: "3×3 min at 6.0 mph with 2 min walking recovery.",
      }),
      easy("weekend", 25, 5.5, true, "25 min"),
    ],
  },
  {
    week: 8,
    phase: "Continuous",
    recovery: true,
    note: "Recovery week before 400 m work.",
    sessions: [
      easy("tuesday", 15, 5.5),
      repeats({
        slot: "friday",
        title: "Controlled intervals",
        reps: 4,
        minutes: 1,
        speed: 6,
        recovery: 2,
        summary: "4×1 min controlled at 6.0 mph.",
      }),
      easy("weekend", 15, 5.5, true, "15 min"),
    ],
  },
  {
    week: 9,
    phase: "Speed introduction",
    recovery: false,
    note: "First 400 m session. The pace is far below both goal speeds.",
    sessions: [
      easy("tuesday", 25, 5.5),
      repeats({
        slot: "friday",
        title: "400 m intervals",
        reps: 6,
        minutes: fourHundred(6.5).minutes,
        seconds: fourHundred(6.5).seconds,
        speed: 6.5,
        recovery: 2,
        label: "400 m",
        summary: `6×400 m at 6.5 mph (about ${fourHundred(6.5).text}) with 2 min walking recovery.`,
      }),
      easy("weekend", 20, 5.5, true, "20–25 min"),
    ],
  },
  {
    week: 10,
    phase: "Speed introduction",
    recovery: false,
    note: "Repeat the 400 m pace. Speed waits until those reps feel repeatable.",
    sessions: [
      easy("tuesday", 25, 5.5),
      repeats({
        slot: "friday",
        title: "400 m intervals",
        reps: 6,
        minutes: fourHundred(6.5).minutes,
        seconds: fourHundred(6.5).seconds,
        speed: 6.5,
        recovery: 2,
        label: "400 m",
        summary: `6×400 m at 6.5 mph (about ${fourHundred(6.5).text}). Same speed as last week.`,
      }),
      easy("weekend", 25, 5.5, true, "25 min"),
    ],
  },
  {
    week: 11,
    phase: "Speed introduction",
    recovery: false,
    note: "800 m reps are slower than the 400s. The extra length is the change.",
    sessions: [
      easy("tuesday", 28, 5.5),
      repeats({
        slot: "friday",
        title: "800 m intervals",
        reps: 3,
        minutes: eightHundred(6.2).minutes,
        seconds: eightHundred(6.2).seconds,
        speed: 6.2,
        recovery: 3,
        label: "800 m",
        summary: `3×800 m at 6.2 mph (about ${eightHundred(6.2).text}) with 3 min walking recovery.`,
      }),
      easy("weekend", 20, 5.5, true, "20 min"),
    ],
  },
  {
    week: 12,
    phase: "Speed introduction",
    recovery: true,
    note: "Recovery week before 5K-pace work.",
    sessions: [
      easy("tuesday", 20, 5.5),
      repeats({
        slot: "friday",
        title: "Controlled intervals",
        reps: 4,
        minutes: 1,
        speed: 6.2,
        recovery: 2,
        summary: "4×1 min controlled at 6.2 mph.",
      }),
      easy("weekend", 15, 5.5, true, "15 min"),
    ],
  },
  {
    week: 13,
    phase: "Goal-pace preparation",
    recovery: false,
    note: "5K-pace work starts at 6.8 mph. The sub-25 target is 7.46 mph, not this workout.",
    sessions: [
      easy("tuesday", 28, 5.6),
      repeats({
        slot: "friday",
        title: "5K-pace reps",
        reps: 3,
        minutes: 5,
        speed: 6.8,
        recovery: 2,
        label: "5K-pace prep",
        summary: "3×5 min at 6.8 mph. Quicker than easy, still slower than 7.46 mph.",
      }),
      easy("weekend", 25, 5.5, true, "25 min"),
    ],
  },
  {
    week: 14,
    phase: "Goal-pace preparation",
    recovery: false,
    note: "Short mile-pace preparation. A 7:00 mile is about 8.57 mph; these reps are 7.2 mph.",
    sessions: [
      easy("tuesday", 28, 5.6),
      repeats({
        slot: "friday",
        title: "Mile-pace prep",
        reps: 6,
        minutes: fourHundred(7.2).minutes,
        seconds: fourHundred(7.2).seconds,
        speed: 7.2,
        recovery: 2,
        label: "400 m mile prep",
        summary: `6×400 m at 7.2 mph (about ${fourHundred(7.2).text}). Short reps, full recovery.`,
      }),
      easy("weekend", 25, 5.5, true, "25 min"),
    ],
  },
  {
    week: 15,
    phase: "Goal-pace preparation",
    recovery: false,
    note: "A little less easy running so the Friday reps can stay controlled.",
    sessions: [
      easy("tuesday", 22, 5.5),
      repeats({
        slot: "friday",
        title: "5K-pace reps",
        reps: 3,
        minutes: 6,
        speed: 6.6,
        recovery: 3,
        label: "5K-pace prep",
        summary: "3×6 min at 6.6 mph with 3 min walking recovery.",
      }),
      easy("weekend", 20, 5.5, true, "20 min"),
    ],
  },
  {
    week: 16,
    phase: "Goal-pace preparation",
    recovery: true,
    note: "Last training week. Keep Friday controlled. Monday is a rest or an easy walk before the testing week.",
    sessions: [
      easy("tuesday", 15, 5.5),
      repeats({
        slot: "friday",
        title: "Controlled intervals",
        reps: 4,
        minutes: 1,
        speed: 7,
        recovery: 2,
        summary: "4×1 min controlled at 7.0 mph. Still well under 8.57 mph.",
      }),
      easy("weekend", 12, 5.5, true, "10–15 min"),
    ],
  },
  {
    week: TESTING_WEEK,
    phase: "Testing",
    recovery: true,
    testing: true,
    note: "Recovery and testing, not a normal training week. No hard intervals. The Wednesday squat is about half of a usual lower-body day and has no hard lower accessories. Keep at least one full day between the mile and the 5K. Do not run a maximal test if your knee hurts or you are unusually sore. Move the test instead.",
    sessions: [
      mileTrial(),
      fiveKTrial(),
      {
        slot: "weekend",
        title: "Recovery and review",
        optional: true,
        quality: false,
        fixed: true,
        summary: "Optional easy walk. Review the mile and 5K against the 10-minute, 5.5 mph baseline. No intervals.",
        blocks: [{ type: "warmup", minutes: 15, speedMph: 3, label: "Optional walk" }],
      },
    ],
  },
];

function effortBlock(miles: number, mph: number, label: string): PlanBlock {
  const totalSeconds = Math.max(1, Math.round((miles / mph) * 3600));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const duration = minutes + seconds / 60;
  return { type: "running", minutes, seconds, speedMph: (miles * 60) / duration, label };
}

function mileTrial(): PlanSession {
  return {
    slot: "tuesday",
    title: "1-mile time trial",
    quality: false,
    fixed: true,
    postponable: true,
    testKind: "mile",
    summary: "Walk 3 min, jog 5 min, then 3 short accelerations. Run exactly 1.00 mile at 0.5–1% incline. The 10:00 at 6.00 mph segment is a template. Change it to the time you actually ran.",
    blocks: [
      { type: "warmup", minutes: 3, speedMph: 3, label: "Walk" },
      { type: "warmup", minutes: 5, speedMph: 5, label: "Easy jog" },
      { type: "warmup", minutes: 0, seconds: 20, speedMph: 6.5, repeats: 3, recoveryMinutes: 1, recoverySpeed: 3, label: "Acceleration" },
      { type: "warmup", minutes: 1, speedMph: 3, label: "Walk before the test" },
      effortBlock(1, 6, "1-mile time trial"),
    ],
  };
}

function fiveKTrial(): PlanSession {
  return {
    slot: "friday",
    title: "5K time trial",
    quality: false,
    fixed: true,
    postponable: true,
    testKind: "fivek",
    summary: "Walk 3 min, jog 5 min, then 2 easy minutes. Run 3.11 miles at 0.5–1% incline, even pace, and only speed up in the last mile if you still have it. The segment is a 6.00 mph template. Change it to the time you actually ran.",
    blocks: [
      { type: "warmup", minutes: 3, speedMph: 3, label: "Walk" },
      { type: "warmup", minutes: 5, speedMph: 5, label: "Easy jog" },
      { type: "warmup", minutes: 2, speedMph: 3.5, label: "Easy walk or jog" },
      effortBlock(FIVE_K_MILES, 6, "5K time trial"),
    ],
  };
}

export function manualTest(kind: TestKind, date = todayInputDate()): RunWorkout {
  const block = effortBlock(kind === "mile" ? 1 : FIVE_K_MILES, 6, kind === "mile" ? "1-mile time trial" : "5K time trial");
  return {
    id: createId(),
    date,
    name: kind === "mile" ? "1-mile time trial" : "5K time trial",
    notes: "",
    segments: [
      createSegment({
        type: "running",
        minutes: block.minutes,
        seconds: block.seconds,
        speedMph: block.speedMph,
        label: block.label,
      }),
    ],
    updatedAt: new Date().toISOString(),
    rpe: null,
    status: "logged",
    planWeek: null,
    planSlot: null,
    difficulty: null,
    testKind: kind,
    incline: 1,
    continuous: true,
  };
}

export function weekPlan(week: number): WeekPlan {
  return runningProgram[Math.min(PROGRAM_WEEKS, Math.max(1, week)) - 1] ?? runningProgram[0]!;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;
  const from = Date.UTC(sy, sm - 1, sd);
  const to = Date.UTC(ey, em - 1, ed);
  return Math.round((to - from) / 86_400_000);
}

export function currentProgramWeek(start: string, today = todayInputDate()): number {
  const elapsed = daysBetween(start, today);
  if (elapsed < 0) return 1;
  return Math.min(PROGRAM_WEEKS, Math.floor(elapsed / 7) + 1);
}

export function sessionDate(start: string, week: number, slot: PlanSlot): string {
  const tuesday = addDays(start, (week - 1) * 7);
  if (slot === "tuesday") return tuesday;
  if (slot === "friday") return addDays(tuesday, 3);
  return addDays(tuesday, 4);
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function adjustedSpeed(base: number, difficulty: RunDifficulty, quality: boolean): number {
  if (difficulty === "easier") return roundTenth(Math.max(quality ? 5 : 4.5, base - 0.3));
  if (difficulty === "harder") {
    const next = base + 0.1;
    const cap = quality ? 7.5 : 6;
    return roundTenth(Math.min(next, cap));
  }
  return roundTenth(base);
}

export function segmentsFor(session: PlanSession, difficulty: RunDifficulty): RunSegment[] {
  const segments: RunSegment[] = [];
  const locked = Boolean(session.fixed);
  for (const block of session.blocks) {
    const speed = !locked && block.type === "running" ? adjustedSpeed(block.speedMph, difficulty, session.quality) : block.speedMph;
    const repeats = block.repeats ?? 1;
    const fewer = !locked && difficulty === "easier" && !session.quality && block.type === "running";
    const minutes = fewer ? Math.max(8, Math.round(block.minutes * 0.85)) : block.minutes;
    const repCount = !locked && difficulty === "easier" && session.quality && repeats > 3 ? repeats - 1 : repeats;
    for (let index = 0; index < repCount; index += 1) {
      segments.push(
        createSegment({
          type: block.type,
          minutes,
          seconds: block.seconds ?? 0,
          speedMph: speed,
          label: block.label ?? "",
        }),
      );
      const recoveryMinutes = block.recoveryMinutes ?? 0;
      if (recoveryMinutes > 0 && index < repCount - 1) {
        segments.push(
          createSegment({
            type: "recovery",
            minutes: recoveryMinutes,
            speedMph: block.recoverySpeed ?? 3,
          }),
        );
      }
    }
  }
  return segments;
}

export function plannedRun(session: PlanSession, week: number, date: string, difficulty: RunDifficulty): RunWorkout {
  return {
    id: createId(),
    date,
    name: `Week ${week} ${session.title}`,
    notes: session.summary,
    segments: segmentsFor(session, difficulty),
    updatedAt: new Date().toISOString(),
    rpe: null,
    status: "logged",
    planWeek: week,
    planSlot: session.slot,
    difficulty: session.fixed ? "planned" : difficulty,
    testKind: session.testKind ?? null,
    incline: session.testKind ? 1 : null,
    continuous: session.testKind ? true : null,
  };
}

export interface RunAdvice {
  difficulty: RunDifficulty;
  reasons: string[];
}

export function adviseSession(
  session: PlanSession,
  week: WeekPlan,
  date: string,
  runs: RunWorkout[],
  workouts: WorkoutLog[],
  missedRequired = 0,
): RunAdvice {
  const reasons: string[] = [];
  let difficulty: RunDifficulty = "planned";
  if (week.recovery) reasons.push("This is a recovery week, so the plan already keeps the volume down.");

  const earlier = runs.filter((run) => run.date <= date);
  const previousLogged = earlier
    .filter((run) => run.status === "logged")
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0];
  const recentSkip = earlier.some((run) => run.status === "skipped" && daysBetween(run.date, date) <= 7);
  if (previousLogged) {
    const totals = runTotals(previousLogged.segments);
    const effort = `${formatMiles(totals.runningMiles)} in ${formatClock(totals.runningMinutes)} at ${formatPace(totals.paceSecondsPerMile)}`;
    reasons.push(
      previousLogged.rpe == null
        ? `Last logged run was ${effort}.`
        : `Last logged run was ${effort}, RPE ${previousLogged.rpe}.`,
    );
  }
  if (previousLogged?.rpe != null && previousLogged.rpe >= 8) {
    difficulty = "easier";
    reasons.push(`That RPE was ${previousLogged.rpe}, so this suggestion stays easier instead of adding speed.`);
  }
  if (missedRequired >= 2) {
    difficulty = "easier";
    reasons.push(`${missedRequired} required runs were missed in the last two weeks, so this suggestion does not add volume.`);
  } else if (missedRequired === 1) {
    reasons.push("A required run was missed recently, so this suggestion does not add speed or volume.");
  }
  if (recentSkip) reasons.push("A recent run was skipped, so this suggestion does not add speed or volume.");

  const squat = recentSquat(workouts, date);
  if (squat) {
    if (squat.rpe != null && squat.rpe >= 8) {
      difficulty = "easier";
      reasons.push(`${squat.name} on ${formatDisplayDate(squat.date)} was RPE ${squat.rpe}. Ease this run while the legs recover.`);
    } else if (session.slot !== "tuesday") {
      reasons.push(`${squat.name} is recent. Keep Friday and the weekend at the planned effort instead of the harder option.`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("No recent hard run or heavy squat. The planned workout is the conservative choice.");
  }
  if (session.fixed) {
    difficulty = "planned";
    reasons.push("The written distance stays put. After the effort, edit the time and speed to what you ran.");
  }
  if (session.testKind) {
    reasons.push("Skip this test if your knee hurts or you are unusually sore, and move the date. A postponed test is not marked missed.");
  }
  return { difficulty, reasons };
}

function recentSquat(workouts: WorkoutLog[], date: string): { name: string; date: string; rpe: number | null } | null {
  const keys = new Set(["barbell-squat", "light-squat", "squat-backoff"]);
  let best: { name: string; date: string; rpe: number | null } | null = null;
  for (const workout of workouts) {
    if (daysBetween(workout.date, date) < 0 || daysBetween(workout.date, date) > 3) continue;
    for (const exercise of workout.exercises) {
      if (!keys.has(exercise.exerciseKey) || exercise.status === "skipped") continue;
      const rpe = exercise.sets.reduce<number | null>((highest, set) => {
        if (!isCompletedSet(set) || set.rpe == null) return highest;
        return highest == null ? set.rpe : Math.max(highest, set.rpe);
      }, null);
      if (!best || workout.date > best.date) best = { name: exercise.name, date: workout.date, rpe };
    }
  }
  return best;
}

export function planRunFor(runs: RunWorkout[], week: number, slot: PlanSlot): RunWorkout | null {
  return (
    runs
      .filter((run) => run.planWeek === week && run.planSlot === slot)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}
