import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BlockProgress, BlockSection, StepNav, WizardSteps } from "../components/blocks/BlockWidgets.tsx";
import {
  categoryLabel,
  dayFields,
  goalInputValue,
  inputModeFor,
  metricLabel,
  parseGoalNumber,
  readWizard,
  writeWizard,
  type WizardState,
} from "../components/blocks/blockUi.ts";
import { Page } from "../components/layout/Page.tsx";
import { currentProgramWeek, weekPlanForBlock } from "../domain/runningProgram.ts";
import { weekItems } from "../domain/schedule.ts";
import {
  blankBlock,
  blockEndDate,
  blockLength,
  compareBlocks,
  formatGoalValue,
  goalDraft,
  reviewBlock,
  suggestBaseline,
  type BlockEmphasis,
  type GoalCategory,
  type GoalMetric,
  type GoalOutcome,
  type TrainingBlock,
  type TrainingGoal,
} from "../domain/trainingBlock.ts";
import { formatDisplayDate, todayInputDate } from "../domain/workoutLog.ts";
import { useAppState } from "../state/useAppState.ts";

const outcomeLabel: Record<GoalOutcome, string> = {
  beyond: "Improved beyond target",
  achieved: "Achieved",
  partial: "Partially achieved",
  missed: "Not achieved",
  untested: "Untested",
};

const presets: Array<Parameters<typeof goalDraft>[0]> = [
  { name: "Bench press", category: "strength", metric: "weight", target: 225, unit: "lb", exerciseKey: "flat-bench" },
  { name: "Squat", category: "strength", metric: "weight-reps", target: 315, unit: "lb", reps: 3, exerciseKey: "barbell-squat" },
  { name: "Mile", category: "running", metric: "time", target: 420, unit: "sec" },
  { name: "5K", category: "running", metric: "time", target: 1500, unit: "sec" },
  { name: "Weekly running distance", category: "running", metric: "distance", target: 10, unit: "mi" },
  { name: "Soccer sessions", category: "general", metric: "frequency", target: 1, unit: "sessions" },
];

const emphases: { value: BlockEmphasis; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "strength", label: "Strength" },
  { value: "running", label: "Running" },
  { value: "maintain", label: "Maintain" },
  { value: "general", label: "General fitness" },
];

const categories: GoalCategory[] = ["strength", "running", "general"];

type Screen = { name: "home" } | { name: "wizard" } | { name: "detail"; id: string };
type DetailTab = "overview" | "schedule" | "goals" | "progress" | "settings";

export function BlocksPage() {
  const { blocks, activeBlockId, workouts, runs, scheduleOverrides = [], saveBlock, activateBlock, completeBlock, archiveBlock, removeBlock } = useAppState();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [pending, setPending] = useState<WizardState | null>(() => readWizard());
  const [tab, setTab] = useState<DetailTab>("overview");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [compareId, setCompareId] = useState("");
  const today = todayInputDate();
  const active = blocks.find((block) => block.id === activeBlockId && block.status === "active") ?? null;
  const upcoming = blocks.filter((block) => block.status === "upcoming");
  const completed = blocks.filter((block) => block.status === "completed" || block.status === "archived");
  const detail = screen.name === "detail" ? (blocks.find((block) => block.id === screen.id) ?? null) : null;

  useEffect(() => {
    if (wizard) writeWizard(wizard);
  }, [wizard]);

  function openWizard(state: WizardState) {
    setWizard(state);
    setPending(state);
    setError("");
    setScreen({ name: "wizard" });
  }

  function leaveWizard() {
    if (wizard) {
      writeWizard(wizard);
      setPending(wizard);
    }
    setScreen({ name: "home" });
  }

  function discardWizard() {
    writeWizard(null);
    setWizard(null);
    setPending(null);
    setScreen({ name: "home" });
  }

  function updateDraft(patch: Partial<TrainingBlock>) {
    setWizard((current) => (current ? { ...current, draft: { ...current.draft, ...patch } } : current));
    setError("");
  }

  function updateGoal(goal: TrainingGoal, confirmBaseline = false) {
    setWizard((current) => {
      if (!current) return current;
      return {
        ...current,
        suggested: confirmBaseline ? current.suggested.filter((id) => id !== goal.id) : current.suggested,
        draft: { ...current.draft, goals: current.draft.goals.map((item) => (item.id === goal.id ? goal : item)) },
      };
    });
  }

  function addGoal(goal: TrainingGoal) {
    const suggestion = suggestBaseline(goal, workouts, runs);
    const next = { ...goal, baseline: suggestion.baseline ?? goal.baseline, baselineNote: suggestion.baselineNote || goal.baselineNote };
    setWizard((current) => {
      if (!current) return current;
      return {
        ...current,
        suggested: next.baseline == null ? current.suggested : [...current.suggested, next.id],
        draft: { ...current.draft, goals: [...current.draft.goals, next] },
      };
    });
  }

  function removeGoal(id: string) {
    setWizard((current) =>
      current
        ? {
            ...current,
            suggested: current.suggested.filter((item) => item !== id),
            draft: { ...current.draft, goals: current.draft.goals.filter((goal) => goal.id !== id) },
          }
        : current,
    );
  }

  function continueStep() {
    if (!wizard) return;
    if (wizard.step === 0) {
      if (!wizard.draft.name.trim()) {
        setError("Name is required.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(wizard.draft.startDate)) {
        setError("Start date is required.");
        return;
      }
    }
    if (wizard.step === 1) {
      const suggested = new Set(wizard.suggested);
      const goals = wizard.draft.goals.map((goal) => {
        if (goal.baseline != null) return goal;
        const suggestion = suggestBaseline(goal, workouts, runs);
        if (suggestion.baseline == null) return { ...goal, baselineNote: suggestion.baselineNote };
        suggested.add(goal.id);
        return { ...goal, baseline: suggestion.baseline, baselineNote: suggestion.baselineNote };
      });
      const next = { ...wizard, step: 2, suggested: [...suggested], draft: { ...wizard.draft, goals } };
      setWizard(next);
      setError("");
      return;
    }
    setWizard({ ...wizard, step: Math.min(4, wizard.step + 1) });
    setError("");
  }

  function finish(activate: boolean) {
    if (!wizard) return;
    const draft = { ...wizard.draft, name: wizard.draft.name.trim(), status: "upcoming" as const };
    if (!draft.name || !/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) {
      setWizard({ ...wizard, step: 0 });
      setError("Name and start date are required.");
      return;
    }
    saveBlock(draft);
    const blocked = blocks.some((block) => block.status === "active" && block.id !== draft.id);
    if (activate && !blocked) {
      activateBlock(draft.id);
      setNotice(`${draft.name} is active.`);
    } else if (activate && blocked) {
      setNotice("The current block is still active. This one is saved as upcoming.");
    } else {
      setNotice("Saved. You can activate it after the current block ends.");
    }
    discardWizard();
  }

  const pageTitle = screen.name === "wizard" ? "New block" : screen.name === "detail" ? (detail?.name ?? "Block") : "Blocks";

  return (
    <Page eyebrow="Training" title={pageTitle} lede={screen.name === "home" ? "The block you are in, and the ones you have finished." : undefined}>
      <div className="block-flow">
        {notice ? <p className="callout">{notice}</p> : null}
        {screen.name === "home" ? (
          <Overview
            active={active}
            upcoming={upcoming}
            completed={completed}
            pending={pending}
            workouts={workouts}
            runs={runs}
            today={today}
            onCreate={() => openWizard({ step: 0, draft: blankBlock(today), suggested: [] })}
            onResume={() => pending && openWizard(pending)}
            onDiscard={discardWizard}
            onOpen={(id) => {
              setTab("overview");
              setScreen({ name: "detail", id });
            }}
            onEdit={(block) => openWizard({ step: 0, draft: { ...block, days: { ...block.days }, goals: block.goals.map((goal) => ({ ...goal })) }, suggested: [] })}
            onRemove={(id) => removeBlock(id)}
          />
        ) : null}
        {screen.name === "wizard" && wizard ? (
          <Wizard
            state={wizard}
            error={error}
            previous={blocks.filter((block) => block.id !== wizard.draft.id)}
            copyFrom={copyFrom}
            onCopyFrom={setCopyFrom}
            onDraft={updateDraft}
            onGoal={updateGoal}
            onAdd={addGoal}
            onRemoveGoal={removeGoal}
            onBack={() => (wizard.step === 0 ? leaveWizard() : setWizard({ ...wizard, step: wizard.step - 1 }))}
            onNext={continueStep}
            onJump={(step) => setWizard({ ...wizard, step })}
            onActivate={() => finish(true)}
            onSave={() => finish(false)}
          />
        ) : null}
        {screen.name === "detail" && detail ? (
          <Detail
            block={detail}
            tab={tab}
            onTab={setTab}
            workouts={workouts}
            runs={runs}
            overrides={scheduleOverrides}
            today={today}
            completed={completed}
            compareId={compareId}
            onCompare={setCompareId}
            onBack={() => setScreen({ name: "home" })}
            onConfirm={() => {
              completeBlock(detail.id);
              setNotice("Results saved. The log is unchanged.");
              setScreen({ name: "home" });
            }}
            onArchive={() => archiveBlock(detail.id)}
            onEdit={() => openWizard({ step: 0, draft: { ...detail, days: { ...detail.days }, goals: detail.goals.map((goal) => ({ ...goal })) }, suggested: [] })}
            onRemove={() => {
              removeBlock(detail.id);
              setScreen({ name: "home" });
            }}
          />
        ) : null}
      </div>
    </Page>
  );
}

function Overview({
  active,
  upcoming,
  completed,
  pending,
  workouts,
  runs,
  today,
  onCreate,
  onResume,
  onDiscard,
  onOpen,
  onEdit,
  onRemove,
}: {
  active: TrainingBlock | null;
  upcoming: TrainingBlock[];
  completed: TrainingBlock[];
  pending: WizardState | null;
  workouts: ReturnType<typeof useAppState>["workouts"];
  runs: ReturnType<typeof useAppState>["runs"];
  today: string;
  onCreate: () => void;
  onResume: () => void;
  onDiscard: () => void;
  onOpen: (id: string) => void;
  onEdit: (block: TrainingBlock) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <div className="step-nav">
        <button type="button" className="button primary" onClick={onCreate}>
          Create new block
        </button>
        {pending ? (
          <button type="button" className="button" onClick={onResume}>
            Resume {pending.draft.name || "draft"}
          </button>
        ) : null}
        {pending ? (
          <button type="button" className="button quiet" onClick={onDiscard}>
            Discard draft
          </button>
        ) : null}
      </div>
      {active ? <ActiveCard block={active} today={today} onOpen={() => onOpen(active.id)} /> : (
        <section className="panel">
          <h2>No active block</h2>
          <p>Create the next block when you are ready. Your log and charts stay where they are.</p>
        </section>
      )}
      {upcoming.length > 0 ? (
        <BlockSection title="Upcoming">
          <ul className="block-list">
            {upcoming.map((block) => (
              <li key={block.id}>
                <div>
                  <strong>{block.name}</strong>
                  <p className="meta">
                    {block.trainingWeeks} weeks · {formatDisplayDate(block.startDate)}
                  </p>
                </div>
                <div className="inline-actions">
                  <button type="button" className="button" onClick={() => onEdit(block)}>
                    Edit
                  </button>
                  <button type="button" className="button" onClick={() => onRemove(block.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </BlockSection>
      ) : null}
      <BlockSection title="Completed">
        {completed.length === 0 ? <p className="meta">Finished blocks show up here.</p> : null}
        <ul className="block-list">
          {completed.map((block) => {
            const review = block.assessment ?? reviewBlock(block, workouts, runs, blockEndDate(block));
            const met = review.goals.filter((goal) => goal.outcome === "achieved" || goal.outcome === "beyond").length;
            return (
              <li key={block.id}>
                <div>
                  <strong>{block.name}</strong>
                  <p className="meta">
                    {formatDisplayDate(blockEndDate(block))} · {blockLength(block)} weeks
                    {review.goals.length > 0 ? ` · ${met}/${review.goals.length} goals` : ""}
                    {block.status === "archived" ? " · archived" : ""}
                  </p>
                </div>
                <button type="button" className="button" onClick={() => onOpen(block.id)}>
                  View results
                </button>
              </li>
            );
          })}
        </ul>
      </BlockSection>
    </>
  );
}

function ActiveCard({ block, today, onOpen }: { block: TrainingBlock; today: string; onOpen: () => void }) {
  const total = blockLength(block);
  const week = currentProgramWeek(block.startDate, today, total);
  const phase = weekPlanForBlock(block, week).phase;
  return (
    <section className="panel block-hero">
      <p className="status-pill is-today">Active</p>
      <h2>{block.name}</h2>
      <p>
        Week {week} of {total} · {phase}
      </p>
      <p className="meta">
        {formatDisplayDate(block.startDate)} – {formatDisplayDate(blockEndDate(block))}
      </p>
      <BlockProgress value={week} max={total} />
      {block.goals.length > 0 ? (
        <ul className="goal-picks">
          {block.goals.map((goal) => (
            <li key={goal.id}>
              {goal.name} {formatGoalValue(goal.target, goal)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta">No goals on this block.</p>
      )}
      <button type="button" className="button" onClick={onOpen}>
        Open block
      </button>
    </section>
  );
}

function Wizard({
  state,
  error,
  previous,
  copyFrom,
  onCopyFrom,
  onDraft,
  onGoal,
  onAdd,
  onRemoveGoal,
  onBack,
  onNext,
  onJump,
  onActivate,
  onSave,
}: {
  state: WizardState;
  error: string;
  previous: TrainingBlock[];
  copyFrom: string;
  onCopyFrom: (id: string) => void;
  onDraft: (patch: Partial<TrainingBlock>) => void;
  onGoal: (goal: TrainingGoal, confirmBaseline?: boolean) => void;
  onAdd: (goal: TrainingGoal) => void;
  onRemoveGoal: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  onJump: (step: number) => void;
  onActivate: () => void;
  onSave: () => void;
}) {
  const { draft, step, suggested } = state;
  const source = previous.find((block) => block.id === copyFrom);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<GoalCategory>("general");
  const [customMetric, setCustomMetric] = useState<GoalMetric>("frequency");
  const [customTarget, setCustomTarget] = useState("1");
  const [customUnit, setCustomUnit] = useState("sessions");

  return (
    <section className="panel">
      <WizardSteps step={step} />
      <h2>{["Block details", "Goals", "Starting baselines", "Training schedule", "Review and activate"][step]}</h2>
      <p className="meta">
        {
          [
            "Name the block and choose how long it runs.",
            "Add only the goals you want for this block.",
            "Confirm the starting point. Suggestions come from your latest log.",
            "Choose the days this block uses.",
            "Check the plan, then activate it.",
          ][step]
        }
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      {step === 0 ? (
        <>
          <label className="field">
            <span>Name</span>
            <input value={draft.name} onChange={(event) => onDraft({ name: event.target.value })} />
          </label>
          <label className="field">
            <span>Start date</span>
            <input type="date" value={draft.startDate} onChange={(event) => onDraft({ startDate: event.target.value })} />
          </label>
          <div className="button-row" role="group" aria-label="Duration">
            {[8, 12, 16].map((weeks) => (
              <button key={weeks} type="button" className={draft.trainingWeeks === weeks ? "button is-selected" : "button"} onClick={() => onDraft({ trainingWeeks: weeks })}>
                {weeks} weeks
              </button>
            ))}
          </div>
          <label className="field">
            <span>Training weeks</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={52}
              value={draft.trainingWeeks}
              onChange={(event) => onDraft({ trainingWeeks: Math.min(52, Math.max(1, Number(event.target.value) || 1)) })}
            />
          </label>
          <label className="choice-line">
            <input type="checkbox" checked={draft.includeTesting} onChange={(event) => onDraft({ includeTesting: event.target.checked })} />
            <span>Add a testing week</span>
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={draft.emphasis} onChange={(event) => onDraft({ emphasis: event.target.value as BlockEmphasis })}>
              {emphases.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {step === 1 ? (
        <>
          {categories.map((category) => (
            <div key={category} className="goal-group">
              <h3>{categoryLabel[category]}</h3>
              <div className="button-row">
                {presets
                  .filter((preset) => preset.category === category)
                  .map((preset) => {
                    const existing = draft.goals.find((goal) => goal.name === preset.name && goal.category === preset.category);
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        className={existing ? "button is-selected" : "button"}
                        onClick={() => (existing ? onRemoveGoal(existing.id) : onAdd(goalDraft(preset)))}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
              </div>
              {draft.goals
                .filter((goal) => goal.category === category)
                .map((goal) => (
                  <GoalTarget key={goal.id} goal={goal} onChange={(next) => onGoal(next)} onRemove={() => onRemoveGoal(goal.id)} />
                ))}
            </div>
          ))}
          {previous.length > 0 ? (
            <label className="field">
              <span>Keep a goal from a previous block</span>
              <select value={copyFrom} onChange={(event) => onCopyFrom(event.target.value)}>
                <option value="">Choose a block</option>
                {previous.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {source ? (
            <div className="button-row">
              {source.goals.map((goal) => (
                <button key={goal.id} type="button" className="button" onClick={() => onAdd({ ...goal, id: goalDraft(goal).id })}>
                  Keep {goal.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="goal-group">
            <h3>Custom goal</h3>
            <label className="field">
              <span>Name</span>
              <input value={customName} onChange={(event) => setCustomName(event.target.value)} />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={customCategory} onChange={(event) => setCustomCategory(event.target.value as GoalCategory)}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Measurement</span>
              <select value={customMetric} onChange={(event) => setCustomMetric(event.target.value as GoalMetric)}>
                {(Object.keys(metricLabel) as GoalMetric[]).map((metric) => (
                  <option key={metric} value={metric}>
                    {metricLabel[metric]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Target {customMetric === "time" ? "(m:ss)" : ""}</span>
              <input inputMode={inputModeFor(customMetric)} value={customTarget} onChange={(event) => setCustomTarget(event.target.value)} />
            </label>
            <label className="field">
              <span>Unit</span>
              <input value={customUnit} onChange={(event) => setCustomUnit(event.target.value)} />
            </label>
            <button
              type="button"
              className="button"
              onClick={() => {
                if (!customName.trim()) return;
                onAdd(goalDraft({ name: customName.trim(), category: customCategory, metric: customMetric, target: parseGoalNumber(customMetric, customTarget), unit: customUnit.trim() || "lb" }));
                setCustomName("");
              }}
            >
              Add goal
            </button>
          </div>
        </>
      ) : null}
      {step === 2 ? (
        categories.map((category) => {
          const goals = draft.goals.filter((goal) => goal.category === category);
          if (goals.length === 0) return null;
          return (
            <div key={category} className="goal-group">
              <h3>{categoryLabel[category]}</h3>
              {goals.map((goal) => (
                <BaselineField key={goal.id} goal={goal} suggested={suggested.includes(goal.id)} onChange={(next) => onGoal(next, true)} />
              ))}
            </div>
          );
        })
      ) : null}
      {step === 3 ? (
        <>
          <div className="day-picks">
            {dayFields.map(([key, label]) => (
              <button key={key} type="button" className={draft.days[key] ? "button is-selected" : "button"} onClick={() => onDraft({ days: { ...draft.days, [key]: !draft.days[key] } })}>
                {label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>First quality-run week</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={draft.trainingWeeks}
              value={draft.qualityStartWeek}
              onChange={(event) => onDraft({ qualityStartWeek: Math.max(1, Number(event.target.value) || 1) })}
            />
          </label>
        </>
      ) : null}
      {step === 4 ? <Review draft={draft} onJump={onJump} /> : null}
      {step < 4 ? <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" /> : (
        <div className="step-nav">
          <button type="button" className="button" onClick={onBack}>
            Back
          </button>
          <button type="button" className="button" onClick={onSave}>
            Save for later
          </button>
          <button type="button" className="button primary" onClick={onActivate}>
            Activate training block
          </button>
        </div>
      )}
    </section>
  );
}

function GoalTarget({ goal, onChange, onRemove }: { goal: TrainingGoal; onChange: (goal: TrainingGoal) => void; onRemove: () => void }) {
  return (
    <div className="goal-row">
      <div className="block-section-head">
        <strong>{goal.name}</strong>
        <button type="button" className="button quiet" onClick={onRemove}>
          Remove
        </button>
      </div>
      <p className="meta">Measurement: {metricLabel[goal.metric]}</p>
      <label className="field">
        <span>Target {goal.metric === "time" ? "(m:ss)" : goal.unit ? `(${goal.unit})` : ""}</span>
        <input
          inputMode={inputModeFor(goal.metric)}
          value={goalInputValue(goal, "target")}
          onChange={(event) => onChange({ ...goal, target: parseGoalNumber(goal.metric, event.target.value) })}
        />
      </label>
      {goal.metric === "weight-reps" ? (
        <label className="field">
          <span>Reps</span>
          <input type="number" inputMode="numeric" min={1} value={goal.reps ?? ""} onChange={(event) => onChange({ ...goal, reps: Number(event.target.value) || null })} />
        </label>
      ) : null}
    </div>
  );
}

function BaselineField({ goal, suggested, onChange }: { goal: TrainingGoal; suggested: boolean; onChange: (goal: TrainingGoal) => void }) {
  return (
    <div className="goal-row">
      <strong>{goal.name}</strong>
      <p className="meta">
        Target {formatGoalValue(goal.target, goal)} · {metricLabel[goal.metric]}
      </p>
      <label className="field">
        <span>{suggested ? "Suggested starting baseline" : "Starting baseline"} {goal.metric === "time" ? "(m:ss)" : ""}</span>
        <input
          inputMode={inputModeFor(goal.metric)}
          value={goalInputValue(goal, "baseline")}
          placeholder="Optional"
          onChange={(event) =>
            onChange({
              ...goal,
              baseline: event.target.value.trim() ? parseGoalNumber(goal.metric, event.target.value) : null,
              baselineNote: "",
            })
          }
        />
      </label>
      {suggested && goal.baselineNote ? (
        <details className="hint">
          <summary>Why this suggestion</summary>
          <p>{goal.baselineNote}</p>
        </details>
      ) : null}
    </div>
  );
}

function Review({ draft, onJump }: { draft: TrainingBlock; onJump: (step: number) => void }) {
  const plan = weekPlanForBlock(draft, 1);
  const lifts = [draft.days.bench ? "Bench" : "", draft.days.squat ? "Squat" : "", draft.days.secondary ? "Secondary lift" : ""].filter(Boolean);
  const days = dayFields.filter(([key]) => draft.days[key]).map(([, label]) => label);
  const priority = emphases.find((item) => item.value === draft.emphasis)?.label ?? draft.emphasis;
  return (
    <div className="review-list">
      <ReviewRow label="Block" onEdit={() => onJump(0)}>
        {draft.name}. {draft.trainingWeeks} training weeks{draft.includeTesting ? " plus a test week" : ""}. {formatDisplayDate(draft.startDate)} to {formatDisplayDate(blockEndDate(draft))}. Priority: {priority}.
      </ReviewRow>
      <ReviewRow label="Goals" onEdit={() => onJump(1)}>
        {draft.goals.length === 0 ? "None yet." : draft.goals.map((goal) => `${goal.name} ${formatGoalValue(goal.target, goal)}`).join(", ")}
      </ReviewRow>
      <ReviewRow label="Baselines" onEdit={() => onJump(2)}>
        {draft.goals.length === 0 ? "None yet." : draft.goals.map((goal) => `${goal.name} ${formatGoalValue(goal.baseline, goal)}`).join(", ")}
      </ReviewRow>
      <ReviewRow label="Schedule" onEdit={() => onJump(3)}>
        {days.join(", ") || "No days selected"}. Quality runs from week {draft.qualityStartWeek}. Week 1: {lifts.join(", ") || "no lifts"}; {plan.sessions.map((session) => session.title).join(", ") || "no runs"}.
      </ReviewRow>
    </div>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="goal-row">
      <div className="block-section-head">
        <h3>{label}</h3>
        <button type="button" className="button quiet" onClick={onEdit}>
          Edit
        </button>
      </div>
      <p>{children}</p>
    </div>
  );
}

function Detail({
  block,
  tab,
  onTab,
  workouts,
  runs,
  overrides,
  today,
  completed,
  compareId,
  onCompare,
  onBack,
  onConfirm,
  onArchive,
  onEdit,
  onRemove,
}: {
  block: TrainingBlock;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  workouts: ReturnType<typeof useAppState>["workouts"];
  runs: ReturnType<typeof useAppState>["runs"];
  overrides: ReturnType<typeof useAppState>["scheduleOverrides"];
  today: string;
  completed: TrainingBlock[];
  compareId: string;
  onCompare: (id: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  onArchive: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const total = blockLength(block);
  const week = currentProgramWeek(block.startDate, today, total);
  const plan = weekPlanForBlock(block, Math.min(week, total));
  const review = block.assessment ?? reviewBlock(block, workouts, runs, block.status === "active" ? today : blockEndDate(block));
  const ended = today >= blockEndDate(block);
  const upcoming = weekItems(block.startDate, week, overrides, workouts, runs, today, block).filter((item) => item.kind !== "note" && item.date >= today).slice(0, 4);
  const other = completed.find((item) => item.id === compareId);
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "schedule", label: "Schedule" },
    { id: "goals", label: "Goals" },
    { id: "progress", label: "Progress" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <>
      <button type="button" className="button" onClick={onBack}>
        All blocks
      </button>
      <div className="block-tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "button is-selected" : "button"} onClick={() => onTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <section className="panel">
          <p className={`status-pill ${block.status === "active" ? "is-today" : "is-done"}`}>{block.status}</p>
          <h2>
            Week {Math.min(week, total)} of {total}
          </h2>
          <p>{plan.phase}</p>
          <BlockProgress value={Math.min(week, total)} max={total} />
          {block.status !== "active" && review.goals.length > 0 ? (
            <ul className="block-list">
              {review.goals.map((goal) => (
                <li key={goal.goalId}>
                  <div>
                    <strong>{goal.name}</strong>
                    <p className="meta">
                      Start {goal.baseline} · Final {goal.final} · Goal {goal.target}
                    </p>
                  </div>
                  <span className={`status-pill ${goal.outcome === "missed" ? "is-missed" : goal.outcome === "untested" ? "is-open" : "is-done"}`}>{outcomeLabel[goal.outcome]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="block-list">
              {block.goals.map((goal) => (
                <li key={goal.id}>
                  <div>
                    <strong>{goal.name}</strong>
                    <p className="meta">Target {formatGoalValue(goal.target, goal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {block.status === "active" && upcoming.length > 0 ? (
            <>
              <h3>Coming up</h3>
              <ul className="block-list">
                {upcoming.map((item) => (
                  <li key={`${item.kind}-${item.key}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <p className="meta">{formatDisplayDate(item.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
      {tab === "schedule" ? (
        <section className="panel">
          <h2>This block</h2>
          <p>{dayFields.filter(([key]) => block.days[key]).map(([, label]) => label).join(", ") || "No days selected"}.</p>
          <p className="meta">Quality runs begin in week {block.qualityStartWeek}.</p>
          <h3>Week {plan.week}</h3>
          <p>
            {plan.note} {plan.sessions.map((session) => session.title).join(", ") || "No runs"}.
          </p>
          <p className="meta">
            <Link to="/calendar">Open the program calendar</Link>
          </p>
        </section>
      ) : null}
      {tab === "goals" ? (
        <section className="panel">
          <h2>Goals</h2>
          {block.goals.length === 0 ? <p>No goals on this block.</p> : null}
          {categories.map((category) => {
            const goals = block.goals.filter((goal) => goal.category === category);
            if (goals.length === 0) return null;
            return (
              <div key={category} className="goal-group">
                <h3>{categoryLabel[category]}</h3>
                {goals.map((goal) => {
                  const result = review.goals.find((item) => item.goalId === goal.id);
                  return (
                    <div key={goal.id} className="goal-row">
                      <strong>{goal.name}</strong>
                      <p className="meta">Measurement: {metricLabel[goal.metric]}</p>
                      <p>Target {formatGoalValue(goal.target, goal)}</p>
                      <p>Starting baseline {formatGoalValue(goal.baseline, goal)}</p>
                      {result ? <p className="meta">{outcomeLabel[result.outcome]} · latest {result.final}</p> : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      ) : null}
      {tab === "progress" ? (
        <section className="panel">
          <h2>This block</h2>
          <div className="fact-grid">
            <p><strong>{review.completed}</strong><span className="meta">Logged</span></p>
            <p><strong>{review.missed}</strong><span className="meta">Still open</span></p>
            <p><strong>{review.runningMiles.toFixed(1)}</strong><span className="meta">Miles</span></p>
          </div>
          <p className="meta">
            <Link to="/progress">Lifetime charts</Link> include every block. The chart page can also show this block alone.
          </p>
          {completed.length >= 2 ? (
            <>
              <h3>Compare</h3>
              <label className="field">
                <span>Other block</span>
                <select value={compareId} onChange={(event) => onCompare(event.target.value)}>
                  <option value="">Choose</option>
                  {completed
                    .filter((item) => item.id !== block.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              {other ? (
                <ul className="block-list">
                  {compareBlocks(block, other, workouts, runs).map((row) => (
                    <li key={row.label}>
                      <div>
                        <strong>{row.label}</strong>
                        <p className="meta">
                          {row.left} · {row.right}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
      {tab === "settings" ? (
        <section className="panel">
          <h2>Settings</h2>
          <p className="meta">
            {formatDisplayDate(block.startDate)} – {formatDisplayDate(blockEndDate(block))} · {emphases.find((item) => item.value === block.emphasis)?.label}
          </p>
          <div className="step-nav">
            {block.status === "active" && ended ? (
              <button type="button" className="button primary" onClick={onConfirm}>
                Confirm results and complete
              </button>
            ) : null}
            {block.status === "upcoming" ? (
              <button type="button" className="button" onClick={onEdit}>
                Edit block
              </button>
            ) : null}
            {block.status === "completed" ? (
              <button type="button" className="button" onClick={onArchive}>
                Archive
              </button>
            ) : null}
            {block.status === "upcoming" ? (
              <button type="button" className="button" onClick={onRemove}>
                Remove
              </button>
            ) : null}
          </div>
          {block.status === "active" && !ended ? <p className="meta">You can complete this block after {formatDisplayDate(blockEndDate(block))}.</p> : null}
        </section>
      ) : null}
    </>
  );
}
