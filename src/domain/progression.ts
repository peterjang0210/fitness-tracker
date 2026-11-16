export type LiftKind = "bench" | "squat" | "light";

export const progressionRules = {
  bench: {
    comfortableThroughRpe: 6,
    smallIncreaseThroughRpe: 7,
    holdThroughRpe: 8,
    comfortableIncreaseLb: 5,
    smallIncreaseLb: 2.5,
  },
  squat: {
    earlyIncreaseThroughRpe: 5,
    standardIncreaseThroughRpe: 7,
    holdThroughRpe: 8,
    earlyIncreaseLb: 10,
    standardIncreaseLb: 5,
  },
  light: {
    increaseThroughRpe: 6,
    holdThroughRpe: 8,
    increaseLb: 5,
  },
  deload: {
    keepFraction: 0.925,
    incrementLb: 2.5,
  },
} as const;

export interface LiftPerformance {
  weightLb: number;
  repsMet: boolean;
  maxRpe: number | null;
  failed: boolean;
}

export interface LoadRecommendation {
  weightLb: number;
  deltaLb: number;
  reason: string;
}

export function nextLoad(kind: LiftKind, sessions: LiftPerformance[]): LoadRecommendation | null {
  const latest = sessions[0];
  if (!latest) return null;
  const prior = sessions[1];
  const sameWeight =
    prior != null && Math.abs(prior.weightLb - latest.weightLb) < 0.1 && latest.failed && prior.failed;
  if (sameWeight) {
    const weightLb = roundTo(latest.weightLb * progressionRules.deload.keepFraction, progressionRules.deload.incrementLb);
    return {
      weightLb,
      deltaLb: roundTo(weightLb - latest.weightLb, progressionRules.deload.incrementLb),
      reason: `The same weight was missed twice in a row, so the next recommendation is ${formatLb(weightLb)}, about 7.5% lighter. Rebuild from there.`,
    };
  }
  const deltaLb = increaseFor(kind, latest);
  const weightLb = roundTo(latest.weightLb + deltaLb, progressionRules.deload.incrementLb);
  return { weightLb, deltaLb, reason: reasonFor(kind, latest, deltaLb, weightLb) };
}

function increaseFor(kind: LiftKind, latest: LiftPerformance): number {
  if (latest.failed || !latest.repsMet) return 0;
  const rpe = latest.maxRpe;
  if (kind === "bench") {
    const rules = progressionRules.bench;
    if (rpe == null || rpe <= rules.comfortableThroughRpe) return rules.comfortableIncreaseLb;
    if (rpe <= rules.smallIncreaseThroughRpe) return rules.smallIncreaseLb;
    return 0;
  }
  if (kind === "squat") {
    const rules = progressionRules.squat;
    if (rpe != null && rpe <= rules.earlyIncreaseThroughRpe) return rules.earlyIncreaseLb;
    if (rpe == null || rpe <= rules.standardIncreaseThroughRpe) return rules.standardIncreaseLb;
    return 0;
  }
  const rules = progressionRules.light;
  if (rpe == null || rpe <= rules.increaseThroughRpe) return rules.increaseLb;
  return 0;
}

function reasonFor(kind: LiftKind, latest: LiftPerformance, deltaLb: number, weightLb: number): string {
  const shown = formatLb(weightLb);
  const name = kind === "squat" ? "Squat" : kind === "light" ? "Light squat" : "Bench";
  if (!latest.repsMet) {
    return `${name} missed the prescribed reps, so the recommendation holds at ${shown}.`;
  }
  if (latest.failed) {
    return `${name} was harder than an RPE 8, or the notes mention pain or missed technique, so the recommendation holds at ${shown}.`;
  }
  if (deltaLb === 0) {
    return `${name} finished at RPE ${latest.maxRpe}, so the recommendation holds at ${shown}.`;
  }
  if (deltaLb === 10) {
    return `Squat reps were comfortable at RPE ${latest.maxRpe}, so the recommendation adds 10 lb, to ${shown}.`;
  }
  if (deltaLb === 2.5) {
    return `${name} reps were complete around RPE ${latest.maxRpe}, so the recommendation adds 2.5 lb, to ${shown}.`;
  }
  if (latest.maxRpe == null) {
    return `${name} reps were complete and RPE was blank, so the recommendation adds ${deltaLb} lb, to ${shown}.`;
  }
  return `${name} reps were complete at RPE ${latest.maxRpe}, so the recommendation adds ${deltaLb} lb, to ${shown}.`;
}

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function formatLb(value: number): string {
  const rounded = roundTo(value, 0.5);
  return Number.isInteger(rounded) ? `${rounded} lb` : `${rounded.toFixed(1)} lb`;
}
