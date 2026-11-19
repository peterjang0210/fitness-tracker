import { useState } from "react";
import { Link } from "react-router-dom";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Page } from "../components/layout/Page.tsx";
import { sessionTemplates } from "../domain/strengthProgram.ts";
import { backupFilename, downloadText, parseBackup, runningCsv, strengthCsv } from "../domain/transfer.ts";
import { todayInputDate } from "../domain/workoutLog.ts";
import { isBuiltinExercise, mergedLibrary } from "../domain/exerciseLibrary.ts";
import { exerciseCategories, STORAGE_KEY, type AppData, type ExerciseCategory, type LibraryEdit, type LibraryExercise, type ThemePreference, type WeightUnit } from "../storage/appData.ts";
import { useAppState } from "../state/useAppState.ts";

const themeOptions: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Paper background" },
  { value: "dark", label: "Dark", hint: "Low-light background" },
  { value: "system", label: "System", hint: "Follow this device" },
];

const unitOptions: { value: WeightUnit; label: string; hint: string }[] = [
  { value: "lb", label: "Pounds", hint: "Default for the log" },
  { value: "kg", label: "Kilograms", hint: "Display preference" },
];

export function SettingsPage() {
  const {
    settings,
    workouts = [],
    runs = [],
    runTemplates = [],
    runningProgramStart = "2026-11-03",
    scheduleOverrides = [],
    libraryEdits = [],
    exerciseLibrary = [],
    futureSessions = [],
    blocks = [],
    activeBlockId = null,
    storageError,
    updateSettings,
    setRunningProgramStart,
    setLibraryEdit,
    saveLibraryExercise,
    deleteLibraryExercise,
    replaceData,
    clearTrainingLog,
  } = useAppState();
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const savedLabel = settings.updatedAt
    ? `Last saved ${new Date(settings.updatedAt).toLocaleString()}`
    : "No custom settings saved yet. A change is written to this browser immediately.";
  const snapshot = {
    version: 1 as const,
    settings,
    workouts,
    runs,
    runTemplates,
    runningProgramStart,
    scheduleOverrides,
    libraryEdits,
    exerciseLibrary,
    futureSessions,
    blocks,
    activeBlockId,
  };

  function exportJson() {
    downloadText(backupFilename(todayInputDate()), JSON.stringify(snapshot, null, 2), "application/json");
  }

  function readImport(file: File | undefined) {
    setImportError(null);
    setPendingImport(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackup(String(reader.result ?? ""));
      if (!parsed) {
        setImportError("That file is not an Iron Mile backup. The log on this device was left as it is.");
        return;
      }
      setPendingImport(parsed);
    };
    reader.readAsText(file);
  }

  return (
    <Page eyebrow="Preferences" title="Settings" lede="Theme, units, program start, and backups stay on this device.">
      <div className="settings-stack">
        <div className="secondary-links" aria-label="Related">
          <Link className="button" to="/blocks">
            Training blocks
          </Link>
          <Link className="button" to="/calendar">
            Program schedule
          </Link>
          <Link className="button" to="/running">
            Running log
          </Link>
        </div>
        <ChoiceGroup
          name="theme"
          legend="Appearance"
          value={settings.theme}
          options={themeOptions}
          onChange={(theme) => updateSettings({ theme })}
        />
        <ChoiceGroup
          name="weight-unit"
          legend="Weight unit"
          value={settings.weightUnit}
          options={unitOptions}
          onChange={(weightUnit) => updateSettings({ weightUnit })}
        />
        <article className="panel">
          <h2>Program</h2>
          <p>This date is week 1 of the active block. Moving it shifts that block’s calendar. Saved workouts keep their dates and stay attached to the block they were logged in.</p>
          <label className="field">
            <span>Week 1 Tuesday</span>
            <input type="date" value={runningProgramStart} onChange={(event) => setRunningProgramStart(event.target.value)} />
          </label>
        </article>
        <LibraryEditor edits={libraryEdits} onEdit={setLibraryEdit} />
        <ExerciseLibraryEditor exercises={exerciseLibrary} onSave={saveLibraryExercise} onDelete={deleteLibraryExercise} />
        <article className="panel">
          <h2>Backup</h2>
          <p>
            {workouts.length} workout{workouts.length === 1 ? "" : "s"} and {runs.length} run{runs.length === 1 ? "" : "s"} are stored under{" "}
            <code>{STORAGE_KEY}</code>.
          </p>
          <div className="inline-actions">
            <button type="button" className="button primary" onClick={exportJson}>
              Export JSON
            </button>
            <button type="button" className="button" onClick={() => downloadText(`iron-mile-strength-${todayInputDate()}.csv`, strengthCsv(snapshot), "text/csv")}>
              Export strength CSV
            </button>
            <button type="button" className="button" onClick={() => downloadText(`iron-mile-running-${todayInputDate()}.csv`, runningCsv(snapshot), "text/csv")}>
              Export running CSV
            </button>
          </div>
          <label className="field">
            <span>Import JSON</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                readImport(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {importError ? <p className="error">{importError}</p> : null}
          {pendingImport ? (
            <div className="confirm-box">
              <p>
                This file has {pendingImport.workouts.length} workouts and {pendingImport.runs.length} runs. Importing replaces the log, schedule, program start, and settings on this device.
              </p>
              <div className="inline-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    replaceData(pendingImport);
                    setPendingImport(null);
                  }}
                >
                  Replace with this file
                </button>
                <button type="button" className="button" onClick={() => setPendingImport(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </article>
        <article className="panel">
          <h2>Clear log</h2>
          <p>This removes workouts, runs, templates, schedule moves, custom exercises, future exercise lists, and exercise wording saved for new sessions. Theme and units stay.</p>
          {confirmClear ? (
            <div className="inline-actions">
              <button
                type="button"
                className="button danger"
                onClick={() => {
                  clearTrainingLog();
                  setConfirmClear(false);
                  setPendingImport(null);
                }}
              >
                Confirm clear
              </button>
              <button type="button" className="button" onClick={() => setConfirmClear(false)}>
                Keep the log
              </button>
            </div>
          ) : (
            <button type="button" className="button danger" onClick={() => setConfirmClear(true)}>
              Clear training log
            </button>
          )}
        </article>
        <article className="panel">
          <h2>Local storage</h2>
          <p>{savedLabel}</p>
          <p className="meta">No account, no server, no sync.</p>
          {storageError ? <p className="error">{storageError}</p> : <p className="ok">Storage is available.</p>}
        </article>
      </div>
    </Page>
  );
}

function ExerciseLibraryEditor({
  exercises,
  onSave,
  onDelete,
}: {
  exercises: LibraryExercise[];
  onSave: (exercise: LibraryExercise) => void;
  onDelete: (id: string) => void;
}) {
  const library = mergedLibrary(exercises);
  return (
    <article className="panel">
      <h2>Exercise library</h2>
      <p>These exercises can be added to any workout. Editing one here does not rewrite workouts you already saved. The original program template stays available from each workout.</p>
      {library.map((exercise) => (
        <details key={exercise.id} className="library-session">
          <summary>
            {exercise.name} · {exercise.muscleGroup}
          </summary>
          <LibraryExerciseFields exercise={exercise} custom={!isBuiltinExercise(exercise.id)} onSave={onSave} onDelete={onDelete} />
        </details>
      ))}
    </article>
  );
}

function LibraryExerciseFields({
  exercise,
  custom,
  onSave,
  onDelete,
}: {
  exercise: LibraryExercise;
  custom: boolean;
  onSave: (exercise: LibraryExercise) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(exercise);
  function commit(next: LibraryExercise = draft) {
    if (!next.name.trim()) return;
    onSave({ ...next, name: next.name.trim(), defaultSets: Math.max(1, Math.min(12, Math.round(next.defaultSets) || 3)) });
  }
  return (
    <div className="edit-grid">
      <label className="field">
        <span>Name</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onBlur={() => commit()}
        />
      </label>
      <label className="field">
        <span>Muscle group</span>
        <input
          value={draft.muscleGroup}
          onChange={(event) => setDraft({ ...draft, muscleGroup: event.target.value })}
          onBlur={() => commit()}
        />
      </label>
      <label className="field">
        <span>Category</span>
        <select
          value={draft.category}
          onChange={(event) => {
            const next = { ...draft, category: event.target.value as ExerciseCategory };
            setDraft(next);
            commit(next);
          }}
        >
          {exerciseCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Equipment</span>
        <input
          value={draft.equipment}
          onChange={(event) => setDraft({ ...draft, equipment: event.target.value })}
          onBlur={() => commit()}
        />
      </label>
      <label className="field">
        <span>Default sets</span>
        <input
          type="number"
          min="1"
          max="12"
          value={draft.defaultSets}
          onChange={(event) => setDraft({ ...draft, defaultSets: Number(event.target.value) || 1 })}
          onBlur={() => commit()}
        />
      </label>
      <label className="field">
        <span>Rep target</span>
        <input
          value={draft.defaultReps}
          onChange={(event) => setDraft({ ...draft, defaultReps: event.target.value })}
          onBlur={() => commit()}
        />
      </label>
      <label className="field grow">
        <span>Instructions</span>
        <input
          value={draft.instructions}
          onChange={(event) => setDraft({ ...draft, instructions: event.target.value })}
          onBlur={() => commit()}
        />
      </label>
      {custom ? (
        <button type="button" className="button" onClick={() => onDelete(exercise.id)}>
          Remove from library
        </button>
      ) : null}
    </div>
  );
}

function LibraryEditor({ edits, onEdit }: { edits: LibraryEdit[]; onEdit: (edit: LibraryEdit) => void }) {
  return (
    <article className="panel">
      <h2>Exercises for new workouts</h2>
      <p>Name, prescription, and rep target here are copied into the next session you start. A workout that is already saved keeps the wording it was logged with.</p>
      {sessionTemplates.map((session) => (
        <details key={session.key} className="library-session">
          <summary>{session.name}</summary>
          {session.exercises.map((exercise) => {
            const saved = edits.find((item) => item.sessionKey === session.key && item.exerciseKey === exercise.exerciseKey);
            const current = {
              name: saved?.name ?? exercise.name,
              prescription: saved?.prescription ?? exercise.prescription,
              repTarget: saved?.repTarget ?? exercise.repTarget,
            };
            function commit(patch: Partial<Pick<LibraryEdit, "name" | "prescription" | "repTarget">>) {
              onEdit({
                sessionKey: session.key,
                exerciseKey: exercise.exerciseKey,
                name: patch.name ?? current.name,
                prescription: patch.prescription ?? current.prescription,
                repTarget: patch.repTarget ?? current.repTarget,
              });
            }
            return (
              <div key={exercise.exerciseKey} className="edit-grid">
                <label className="field">
                  <span>Name</span>
                  <input value={current.name} onChange={(event) => commit({ name: event.target.value })} />
                </label>
                <label className="field">
                  <span>Prescription</span>
                  <input value={current.prescription} onChange={(event) => commit({ prescription: event.target.value })} />
                </label>
                <label className="field">
                  <span>Rep target</span>
                  <input value={current.repTarget} onChange={(event) => commit({ repTarget: event.target.value })} />
                </label>
              </div>
            );
          })}
        </details>
      ))}
    </article>
  );
}
