import type { ReactNode } from "react";
import { stepTitles } from "./blockUi.ts";

export function BlockProgress({ value, max }: { value: number; max: number }) {
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  return (
    <div className="block-meter" aria-hidden="true">
      <span style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  );
}

export function WizardSteps({ step }: { step: number }) {
  return (
    <div className="wizard-head">
      <p className="meta">
        Step {step + 1} of {stepTitles.length}
      </p>
      <ol className="wizard-steps">
        {stepTitles.map((title, index) => (
          <li key={title} className={index < step ? "is-done" : index === step ? "is-current" : ""} />
        ))}
      </ol>
    </div>
  );
}

export function StepNav({
  onBack,
  onNext,
  nextLabel,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="step-nav">
      <button type="button" className="button" onClick={onBack}>
        Back
      </button>
      <button type="button" className="button primary" onClick={onNext} disabled={disabled}>
        {nextLabel}
      </button>
    </div>
  );
}

export function BlockSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="block-section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
