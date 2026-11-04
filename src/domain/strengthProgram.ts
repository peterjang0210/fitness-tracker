import type { WeightUnit } from "../storage/appData.ts";

export type SessionKey = "tuesday-bench" | "wednesday-squat" | "friday-secondary";

export function isSessionKey(value: string | null): value is SessionKey {
  return value === "tuesday-bench" || value === "wednesday-squat" || value === "friday-secondary";
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
  key: SessionKey;
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
        baseline: "Previous max 215 lb. Recently completed 155 lb for 3×5, final set RPE 6–7.",
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
        suggestedWeightLb: 135,
        baseline:
          "Previous max 375 lb. Estimated current capacity is 185×5, followed by significant soreness. Recent leg training has been inconsistent.",
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
    name: "Secondary squat and upper body",
    day: "Friday",
    summary: "Light squat 3×5, then upper-body accessories.",
    exercises: [
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
        exerciseKey: "cable-fly",
        name: "Cable fly",
        sets: 2,
        repTarget: "12–15",
        prescription: "2×12–15",
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

export function sessionTemplate(key: SessionKey): SessionTemplate {
  const template = sessionTemplates.find((item) => item.key === key);
  if (!template) throw new Error(`Unknown session ${key}`);
  return template;
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
