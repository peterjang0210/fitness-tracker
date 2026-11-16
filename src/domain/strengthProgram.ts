import type { WeightUnit } from "../storage/appData.ts";

export const TESTING_WEEK = 17;

export type ProgramSessionKey = "tuesday-bench" | "wednesday-squat" | "friday-secondary";
export type SessionKey = ProgramSessionKey | "custom";

export function isProgramSessionKey(value: string | null): value is ProgramSessionKey {
  return value === "tuesday-bench" || value === "wednesday-squat" || value === "friday-secondary";
}

export function isSessionKey(value: string | null): value is SessionKey {
  return isProgramSessionKey(value) || value === "custom";
}

export interface ExerciseTemplate {
  exerciseKey: string;
  name: string;
  sets: number;
  repTarget: string;
  prescription: string;
  optional?: boolean;
  suggestedWeightLb?: number;
  baseline?: string;
}

export interface SessionTemplate {
  key: ProgramSessionKey;
  name: string;
  day: string;
  summary: string;
  exercises: ExerciseTemplate[];
}

export const sessionTemplates: SessionTemplate[] = [
  {
    key: "tuesday-bench",
    name: "Bench and upper body",
    day: "Tuesday",
    summary: "Flat bench 3×5, then upper-body accessories.",
    exercises: [
      {
        exerciseKey: "flat-bench",
        name: "Flat barbell bench press",
        sets: 3,
        repTarget: "5",
        prescription: "3×5",
        suggestedWeightLb: 160,
        baseline: "Reference point: 160 lb for 3×5 around RPE 5. Historical max about 215 lb. Logged sets replace this reference.",
      },
      {
        exerciseKey: "incline-db-press",
        name: "Incline dumbbell press",
        sets: 2,
        repTarget: "8–10",
        prescription: "2×8–10",
      },
      {
        exerciseKey: "cable-row",
        name: "Cable row",
        sets: 3,
        repTarget: "8–12",
        prescription: "3×8–12",
      },
      {
        exerciseKey: "lat-pulldown",
        name: "Lat pulldown",
        sets: 2,
        repTarget: "10–12",
        prescription: "2×10–12",
      },
      {
        exerciseKey: "cable-lateral-raise",
        name: "Cable lateral raise",
        sets: 2,
        repTarget: "12–15",
        prescription: "2×12–15",
      },
      {
        exerciseKey: "triceps-pushdown",
        name: "Triceps pushdown",
        sets: 2,
        repTarget: "10–15",
        prescription: "2×10–15",
      },
      {
        exerciseKey: "cable-biceps-curl",
        name: "Cable biceps curl",
        sets: 2,
        repTarget: "10–15",
        prescription: "2×10–15",
        optional: true,
      },
    ],
  },
  {
    key: "wednesday-squat",
    name: "Squat and lower body",
    day: "Wednesday",
    summary: "Squat 3×5, with room to add a fourth set later.",
    exercises: [
      {
        exerciseKey: "barbell-squat",
        name: "Barbell squat",
        sets: 3,
        repTarget: "5",
        prescription: "3×5",
        suggestedWeightLb: 145,
        baseline: "Reference point: 145 lb for 3×5 around RPE 2–3. Historical max about 375 lb. Logged sets replace this reference.",
      },
      {
        exerciseKey: "squat-backoff",
        name: "Squat back-off",
        sets: 1,
        repTarget: "5",
        prescription: "1–2×5",
        optional: true,
        suggestedWeightLb: 115,
      },
      {
        exerciseKey: "leg-press",
        name: "Leg press",
        sets: 2,
        repTarget: "10–12",
        prescription: "2×10–12",
      },
      {
        exerciseKey: "leg-curl",
        name: "Leg curl",
        sets: 2,
        repTarget: "10–12",
        prescription: "2×10–12",
      },
      {
        exerciseKey: "leg-extension",
        name: "Leg extension",
        sets: 2,
        repTarget: "12–15",
        prescription: "2×12–15",
      },
      {
        exerciseKey: "calf-raise",
        name: "Calf raise",
        sets: 2,
        repTarget: "12–15",
        prescription: "2×12–15",
        optional: true,
      },
    ],
  },
  {
    key: "friday-secondary",
    name: "Secondary bench and light squat",
    day: "Friday",
    summary: "Paused bench, a lighter squat, and a short list of upper-body accessories.",
    exercises: [
      {
        exerciseKey: "paused-bench",
        name: "Paused bench press",
        sets: 3,
        repTarget: "6",
        prescription: "3×6",
        suggestedWeightLb: 125,
        baseline: "Second bench day. Start lighter than Tuesday and progress it on its own. Target about RPE 6–7.",
      },
      {
        exerciseKey: "light-squat",
        name: "Light squat",
        sets: 3,
        repTarget: "5",
        prescription: "3×5",
        suggestedWeightLb: 115,
        baseline: "No light squat has been logged yet. Keep it easier than the Wednesday session.",
      },
      {
        exerciseKey: "bodyweight-dips",
        name: "Bodyweight dips",
        sets: 3,
        repTarget: "6–10",
        prescription: "3×6–10",
      },
      {
        exerciseKey: "pulldown-or-archer",
        name: "Lat pulldown or archer pulls",
        sets: 3,
        repTarget: "8–12",
        prescription: "3×8–12",
      },
      {
        exerciseKey: "cable-pullover",
        name: "Cable pullover",
        sets: 2,
        repTarget: "10–12",
        prescription: "2×10–12",
      },
      {
        exerciseKey: "cable-biceps-curl",
        name: "Cable biceps curl",
        sets: 2,
        repTarget: "10–15",
        prescription: "2×10–15",
      },
      {
        exerciseKey: "triceps-pushdown",
        name: "Triceps pushdown",
        sets: 2,
        repTarget: "10–15",
        prescription: "2×10–15",
      },
    ],
  },
];

const testingSquat: SessionTemplate = {
  key: "wednesday-squat",
  name: "Easy squat",
  day: "Wednesday",
  summary: "About half of a normal lower-body day. Two easy sets, and no leg press, curls, or extensions.",
  exercises: [
    {
      exerciseKey: "barbell-squat",
      name: "Barbell squat",
      sets: 2,
      repTarget: "5",
      prescription: "2×5 easy",
      suggestedWeightLb: 115,
      baseline:
        "Testing week keeps the squat and drops the lower-body accessories, which cuts this session by about half. Skip it if your knee hurts. The mile was yesterday and the 5K is Friday.",
    },
  ],
};

export function sessionTemplate(key: ProgramSessionKey, week?: number | null): SessionTemplate {
  if (week === TESTING_WEEK && key === "wednesday-squat") return testingSquat;
  const template = sessionTemplates.find((item) => item.key === key);
  if (!template) throw new Error(`Unknown session ${key}`);
  if (week == null || week < 1 || week > 16) return template;
  return applyPhase(structuredClone(template), week);
}

function applyPhase(template: SessionTemplate, week: number): SessionTemplate {
  const deload = week === 4 || week === 8 || week === 12 || week === 16;
  template.summary = phaseSummary(template.key, week, deload);
  template.exercises = template.exercises.map((exercise) => {
    const shaped = phaseSets(template.key, exercise, week, deload);
    return { ...exercise, ...shaped };
  });
  return template;
}

function phaseSummary(key: ProgramSessionKey, week: number, deload: boolean): string {
  if (deload) return `Week ${week} is a lighter week. Volume is about half of the surrounding weeks.`;
  if (key === "tuesday-bench") return `Week ${week} primary bench. Upper-body accessories follow the main sets.`;
  if (key === "wednesday-squat") return `Week ${week} primary squat. Keep the accessories lighter than the squat.`;
  return `Week ${week} paused bench, light squat, and a short accessory list.`;
}

function phaseSets(
  key: ProgramSessionKey,
  exercise: ExerciseTemplate,
  week: number,
  deload: boolean,
): Pick<ExerciseTemplate, "sets" | "repTarget" | "prescription"> {
  if ((key === "tuesday-bench" && exercise.exerciseKey === "flat-bench") || (key === "wednesday-squat" && exercise.exerciseKey === "barbell-squat")) {
    if (week <= 3) return { sets: 3, repTarget: "5", prescription: "3×5" };
    if (week === 4) return { sets: 2, repTarget: "5", prescription: "2×5" };
    if (week <= 7) return { sets: 4, repTarget: "5", prescription: "4×5" };
    if (week === 8) return { sets: 2, repTarget: "5", prescription: "2×5" };
    if (week <= 11) return { sets: 4, repTarget: "4", prescription: "4×4" };
    if (week === 12) return { sets: 2, repTarget: "4", prescription: "2×4" };
    if (week <= 15) return { sets: 4, repTarget: "3", prescription: "1×3 top, 3×3 back-off" };
    return { sets: 2, repTarget: "3", prescription: "1×3 top, 1×3 back-off" };
  }
  if (exercise.exerciseKey === "paused-bench") {
    if (week <= 8) return { sets: deload ? 2 : 3, repTarget: "6", prescription: deload ? "2×6" : "3×6" };
    return { sets: deload ? 2 : 3, repTarget: "5", prescription: deload ? "2×5" : "3×5" };
  }
  if (exercise.exerciseKey === "light-squat") {
    if (week >= 13) return { sets: 2, repTarget: "3", prescription: "2×3" };
    if (deload) return { sets: 2, repTarget: "5", prescription: "2×5" };
    return { sets: 3, repTarget: "5", prescription: "3×5" };
  }
  if (!deload) return { sets: exercise.sets, repTarget: exercise.repTarget, prescription: exercise.prescription };
  const sets = Math.max(1, Math.round(exercise.sets * 0.5));
  return { sets, repTarget: exercise.repTarget, prescription: `${sets}×${exercise.repTarget}` };
}

export function exerciseTemplate(exerciseKey: string): ExerciseTemplate | undefined {
  for (const session of sessionTemplates) {
    const match = session.exercises.find((exercise) => exercise.exerciseKey === exerciseKey);
    if (match) return match;
  }
  return undefined;
}

const LB_PER_KG = 2.2046226218;

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  const pounds = from === "lb" ? value : value * LB_PER_KG;
  const converted = to === "lb" ? pounds : pounds / LB_PER_KG;
  return Math.round(converted * 2) / 2;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${unit}`;
}
