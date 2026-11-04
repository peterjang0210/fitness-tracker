import { useState } from "react";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Page } from "../components/layout/Page.tsx";
import { sessionTemplates } from "../domain/strengthProgram.ts";
import { backupFilename, downloadText, parseBackup, runningCsv, strengthCsv } from "../domain/transfer.ts";
import { todayInputDate } from "../domain/workoutLog.ts";
import { STORAGE_KEY, type AppData, type LibraryEdit, type ThemePreference, type WeightUnit } from "../storage/appData.ts";
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
    storageError,
    updateSettings,
    setRunningProgramStart,
    setLibraryEdit,
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
    <Page
      eyebrow="Preferences"
      title="Settings"
      lede="Theme, units, the program start, and a copy of the log stay on this device. Export a file before you clear anything."
    >
      <div className="settings-stack">
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
          <p>Week 1 begins on this Tuesday. Moving it shifts the calendar and the running plan. Saved workouts keep their own dates.</p>
          <label className="field">
            <span>Week 1 Tuesday</span>
            <input type="date" value={runningProgramStart} onChange={(event) => setRunningProgramStart(event.target.value)} />
          </label>
        </article>
        <LibraryEditor edits={libraryEdits} onEdit={setLibraryEdit} />
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
          <p>This removes workouts, runs, templates, schedule moves, and exercise wording saved for new sessions. Theme and units stay.</p>
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
