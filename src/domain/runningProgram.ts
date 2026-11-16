import { TESTING_WEEK } from "./strengthProgram.ts";
import { createId, formatDisplayDate, isCompletedSet, todayInputDate, type WorkoutLog } from "./workoutLog.ts";
import {
  createSegment,
  formatClock,
  formatMiles,
  formatPace,
  runTotals,
  type EasyFormat,
  type PlanSlot,
  type QualityFocus,
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
  choice?: "easy" | "quality";
  easyFormat?: EasyFormat;
  qualityFocus?: QualityFocus;
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

const shortRunMinutes = [0, 10, 12, 12, 10, 14, 14, 15, 12, 15, 16, 16, 12, 16, 16, 18, 12];
const longRunMinutes = [0, 12, 15, 20, 16, 22, 24, 26, 19, 27, 28, 30, 24, 28, 30, 32, 25];

export const runningProgram: WeekPlan[] = buildTrainingProgram();

function buildTrainingProgram(): WeekPlan[] {
  const weeks: WeekPlan[] = [];
  for (let week = 1; week <= 16; week += 1) {
    const deload = week === 4 || week === 8 || week === 12 || week === 16;
    weeks.push({
      week,
      phase: week <= 4 ? "Base and technique" : week <= 8 ? "Volume and strength" : week <= 12 ? "Strength development" : "Strength emphasis",
      recovery: deload,
      note: deload
        ? "Lighter running week. Hold the duration if recovery is behind, and keep Thursday shorter."
        : "Easy runs stay conversational, around RPE 3–4. Thursday is the only speed day. Change the day if you need to.",
      sessions: [
        easyDay("tuesday", shortRunMinutes[week] ?? 12),
        qualityDay(week),
        easyDay("weekend", longRunMinutes[week] ?? 25),
      ],
    });
  }
  weeks.push({
    week: TESTING_WEEK,
    phase: "Testing",
    recovery: true,
    testing: true,
    note: "Recovery and testing, not a normal training week. No hard intervals. The Wednesday squat is about half of a usual lower-body day and has no hard lower accessories. Keep at least one full day between the mile and the 5K. Do not run a maximal test if your knee hurts or you are unusually sore. Move the test instead.",
    sessions: [mileTrial(), fiveKTrial(), recoveryReview()],
  });
  return weeks;
}

function easyDay(slot: PlanSlot, minutes: number): PlanSession {
  return {
    slot,
    title: slot === "weekend" ? "Longer easy run" : "Short easy run",
    quality: false,
    choice: "easy",
    summary: easySummary(minutes, "steady"),
    blocks: easyFormatBlocks(minutes, "steady"),
  };
}

function qualityDay(week: number): PlanSession {
  const focus: QualityFocus = week % 2 === 0 ? "fivek" : "mile";
  return {
    slot: "thursday",
    title: focus === "mile" ? "Mile-focused intervals" : "5K-focused intervals",
    quality: true,
    choice: "quality",
    qualityFocus: focus,
    summary: qualitySummary(week, focus),
    blocks: qualityBlocks(week, focus),
  };
}

function recoveryReview(): PlanSession {
  return {
    slot: "weekend",
    title: "Recovery and review",
    optional: true,
    quality: false,
    fixed: true,
    summary: "Optional easy walk. Review the mile and 5K against the 10-minute, 5.5 mph baseline. No intervals.",
    blocks: [{ type: "warmup", minutes: 15, speedMph: 3, label: "Optional walk" }],
  };
}

export function easySummary(minutes: number, format: EasyFormat): string {
  const shared = `${minutes} min is the suggested length. Keep it at RPE 3–4, slow enough for full sentences. The speeds are a start, not a requirement.`;
  if (format === "progressive") return `Progressive easy run. ${shared} Speed rises every 5 minutes and the last piece eases back.`;
  if (format === "fartlek") return `Easy fartlek. ${shared} The quicker minute stays conversational.`;
  if (format === "variable") return `Variable steady run. ${shared} Small speed changes, same easy effort.`;
  return `Steady easy run. ${shared}`;
}

export function easyFormatBlocks(minutes: number, format: EasyFormat): PlanBlock[] {
  if (format === "progressive") return paceSteps(minutes, [5.2, 5.4, 5.6, 5.3], 5);
  if (format === "fartlek") return fartlek(minutes);
  if (format === "variable") return paceSteps(minutes, [5.3, 5.5, 5.4, 5.6], 4);
  return [{ type: "running", minutes, speedMph: 5.5, label: "Easy, conversational" }];
}

function paceSteps(minutes: number, speeds: number[], chunk: number): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  let left = minutes;
  let index = 0;
  while (left > 0) {
    const speed = speeds[Math.min(index, speeds.length - 1)] ?? 5.5;
    const piece = index === speeds.length - 1 ? left : Math.min(chunk, left);
    blocks.push({ type: "running", minutes: piece, speedMph: speed, label: `${speed.toFixed(1)} mph` });
    left -= piece;
    index += 1;
  }
  return blocks;
}

function fartlek(minutes: number): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  let left = minutes;
  while (left > 0) {
    const easy = Math.min(3, left);
    blocks.push({ type: "running", minutes: easy, speedMph: 5.3, label: "Comfortable" });
    left -= easy;
    if (left <= 0) break;
    const fast = Math.min(1, left);
    blocks.push({ type: "running", minutes: fast, speedMph: 5.8, label: "Slightly quicker" });
    left -= fast;
  }
  return blocks;
}

export function qualitySummary(week: number, focus: QualityFocus): string {
  const effort = week <= 4 ? "RPE 5–6" : week <= 8 ? "RPE 6–7" : "RPE 7–8";
  const work = focus === "mile" ? "400 m repeats" : "comfortably hard repeats";
  return `${work} at about ${effort}. Warm-up, strides, and cooldown stay out of the running distance. Stay well under goal pace until the logs support more speed.`;
}

export function qualityBlocks(week: number, focus: QualityFocus): PlanBlock[] {
  const deload = week === 4 || week === 8 || week === 12 || week === 16;
  const warmup: PlanBlock[] = [
    { type: "warmup", minutes: 3, speedMph: 3, label: "Walk" },
    { type: "warmup", minutes: week <= 4 ? 5 : 7, speedMph: 5, label: "Easy jog" },
    { type: "warmup", minutes: 0, seconds: 20, speedMph: 6.2, repeats: 3, recoveryMinutes: 1, recoverySpeed: 3, label: "Stride" },
  ];
  const cooldown: PlanBlock = { type: "cooldown", minutes: deload ? 5 : 8, speedMph: 3, label: "Cooldown" };
  if (focus === "mile") {
    const reps = deload ? 4 : week <= 3 ? 4 : 6;
    const speed = week <= 4 ? 6 : week <= 8 ? 6.3 : week <= 12 ? 6.6 : 6.8;
    const clock = repClock(400, speed);
    return [
      ...warmup,
      {
        type: "running",
        minutes: clock.minutes,
        seconds: clock.seconds,
        speedMph: speed,
        repeats: reps,
        recoveryMinutes: 2,
        recoverySpeed: 3,
        label: "400 m",
      },
      cooldown,
    ];
  }
  const reps = deload ? 2 : 3;
  const minutes = week <= 4 ? 5 : week <= 8 ? 6 : week <= 12 ? 7 : 8;
  const speed = week <= 4 ? 6 : week <= 8 ? 6.2 : week <= 12 ? 6.4 : 6.5;
  return [
    ...warmup,
    {
      type: "running",
      minutes,
      speedMph: speed,
      repeats: reps,
      recoveryMinutes: week <= 4 ? 2 : 3,
      recoverySpeed: 3,
      label: "5K-effort repeat",
    },
    cooldown,
  ];
}

export function recommendEasyFormat(week: number, lastRpe: number | null): EasyFormat {
  if (lastRpe != null && lastRpe >= 5) return "steady";
  const formats: EasyFormat[] = ["progressive", "fartlek", "variable"];
  return formats[(week - 1) % formats.length] ?? "steady";
}

export function sessionVariant(session: PlanSession, week: number, format: EasyFormat, focus: QualityFocus): PlanSession {
  if (session.choice === "easy") {
    const minutes = session.blocks.reduce((total, block) => total + (block.type === "running" ? block.minutes : 0), 0);
    return { ...session, easyFormat: format, summary: easySummary(minutes, format), blocks: easyFormatBlocks(minutes, format) };
  }
  if (session.choice === "quality") {
    return {
      ...session,
      qualityFocus: focus,
      title: focus === "mile" ? "Mile-focused intervals" : "5K-focused intervals",
      summary: qualitySummary(week, focus),
      blocks: qualityBlocks(week, focus),
    };
  }
  return session;
}

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
    easyFormat: null,
    qualityFocus: null,
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
  if (slot === "thursday") return addDays(tuesday, 2);
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
    easyFormat: session.easyFormat ?? null,
    qualityFocus: session.qualityFocus ?? null,
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
  if (!session.quality && previousLogged?.rpe != null && previousLogged.rpe >= 5) {
    difficulty = "easier";
    reasons.push(`The last run was RPE ${previousLogged.rpe}, so this suggestion keeps the easy day shorter instead of adding time.`);
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
