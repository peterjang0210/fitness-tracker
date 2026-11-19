import { normalizeBlock, type GoalMetric, type TrainingBlock, type TrainingGoal } from "../../domain/trainingBlock.ts";

export const WIZARD_KEY = "iron-mile.block-wizard";

export const stepTitles = ["Details", "Goals", "Baselines", "Schedule", "Review"] as const;

export const metricLabel: Record<GoalMetric, string> = {
  weight: "Weight",
  "weight-reps": "Weight and reps",
  e1rm: "Estimated 1RM",
  time: "Time",
  distance: "Distance",
  frequency: "Frequency",
  duration: "Duration",
};

export const categoryLabel = {
  strength: "Strength",
  running: "Running",
  general: "General fitness",
} as const;

export const dayFields = [
  ["bench", "Bench"],
  ["squat", "Squat"],
  ["secondary", "Secondary lift"],
  ["shortRun", "Short run"],
  ["quality", "Quality run"],
  ["longRun", "Long run"],
] as const;

export interface WizardState {
  step: number;
  draft: TrainingBlock;
  suggested: string[];
}

export function readWizard(): WizardState | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<WizardState>;
    const draft = normalizeBlock(value.draft);
    if (!draft) return null;
    return {
      step: typeof value.step === "number" ? Math.min(4, Math.max(0, value.step)) : 0,
      draft,
      suggested: Array.isArray(value.suggested) ? value.suggested.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return null;
  }
}

export function writeWizard(state: WizardState | null) {
  if (!state) sessionStorage.removeItem(WIZARD_KEY);
  else sessionStorage.setItem(WIZARD_KEY, JSON.stringify(state));
}

export function parseGoalNumber(metric: GoalMetric, raw: string): number {
  if (metric === "time") {
    const match = raw.trim().match(/^(\d+):(\d{1,2})$/);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function goalInputValue(goal: TrainingGoal, field: "target" | "baseline"): string {
  const value = field === "target" ? goal.target : goal.baseline;
  if (value == null) return "";
  if (goal.metric === "time") {
    const rounded = Math.round(value);
    return `${Math.floor(rounded / 60)}:${(rounded % 60).toString().padStart(2, "0")}`;
  }
  return String(value);
}

export function inputModeFor(metric: GoalMetric): "decimal" | "text" {
  return metric === "time" ? "text" : "decimal";
}
