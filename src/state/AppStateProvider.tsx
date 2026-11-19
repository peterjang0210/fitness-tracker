import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RunTemplate, RunWorkout } from "../domain/running.ts";
import type { ScheduleOverride } from "../domain/schedule.ts";
import { reviewBlock, type TrainingBlock } from "../domain/trainingBlock.ts";
import type { WorkoutLog } from "../domain/workoutLog.ts";
import { AppStateContext, type SettingsPatch } from "./appStateContext.ts";
import {
  defaultAppData,
  loadAppData,
  normalizeAppData,
  saveAppData,
  STORAGE_KEY,
  type AppData,
  type FutureSessionPlan,
  type LibraryEdit,
  type LibraryExercise,
  type ThemePreference,
} from "../storage/appData.ts";

function resolvedTheme(theme: ThemePreference): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(theme: ThemePreference) {
  const next = resolvedTheme(theme);
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
}

function readStorageError(): string | null {
  const probeKey = `${STORAGE_KEY}.probe`;
  try {
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return null;
  } catch {
    return "This browser blocked local storage, so workouts, runs, and settings will not survive a refresh.";
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [storageError, setStorageError] = useState<string | null>(() => readStorageError());
  const dataRef = useRef(data);
  dataRef.current = data;

  const commit = useCallback((recipe: (current: AppData) => AppData) => {
    const next = recipe(dataRef.current);
    dataRef.current = next;
    setData(next);
    try {
      saveAppData(next);
      setStorageError(null);
    } catch {
      setStorageError("This browser blocked local storage, so workouts, runs, and settings will not survive a refresh.");
    }
  }, []);

  useEffect(() => {
    applyTheme(data.settings.theme);
    if (data.settings.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [data.settings.theme]);

  const value = useMemo(
    () => ({
      settings: data.settings,
      workouts: data.workouts,
      runs: data.runs,
      runTemplates: data.runTemplates,
      runningProgramStart: data.runningProgramStart,
      scheduleOverrides: data.scheduleOverrides ?? [],
      libraryEdits: data.libraryEdits ?? [],
      exerciseLibrary: data.exerciseLibrary ?? [],
      futureSessions: data.futureSessions ?? [],
      blocks: data.blocks ?? [],
      activeBlockId: data.activeBlockId ?? null,
      storageError,
      updateSettings(patch: SettingsPatch) {
        commit((current) => ({
          ...current,
          settings: {
            ...current.settings,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        }));
      },
      saveWorkout(workout: WorkoutLog) {
        const nextWorkout = {
          ...workout,
          blockId: workout.blockId ?? dataRef.current.activeBlockId,
          updatedAt: new Date().toISOString(),
        };
        commit((current) => ({
          ...current,
          workouts: current.workouts.some((item) => item.id === workout.id)
            ? current.workouts.map((item) => (item.id === workout.id ? nextWorkout : item))
            : [nextWorkout, ...current.workouts],
        }));
      },
      deleteWorkout(workoutId: string) {
        commit((current) => ({
          ...current,
          workouts: current.workouts.filter((workout) => workout.id !== workoutId),
        }));
      },
      saveRun(run: RunWorkout) {
        const nextRun = {
          ...run,
          blockId: run.blockId ?? dataRef.current.activeBlockId,
          updatedAt: new Date().toISOString(),
        };
        commit((current) => ({
          ...current,
          runs: current.runs.some((item) => item.id === run.id)
            ? current.runs.map((item) => (item.id === run.id ? nextRun : item))
            : [nextRun, ...current.runs],
        }));
      },
      deleteRun(runId: string) {
        commit((current) => ({
          ...current,
          runs: current.runs.filter((run) => run.id !== runId),
        }));
      },
      saveRunTemplate(template: RunTemplate) {
        const nextTemplate = { ...template, updatedAt: new Date().toISOString() };
        commit((current) => ({
          ...current,
          runTemplates: current.runTemplates.some((item) => item.id === template.id)
            ? current.runTemplates.map((item) => (item.id === template.id ? nextTemplate : item))
            : [nextTemplate, ...current.runTemplates],
        }));
      },
      deleteRunTemplate(templateId: string) {
        commit((current) => ({
          ...current,
          runTemplates: current.runTemplates.filter((template) => template.id !== templateId),
        }));
      },
      setRunningProgramStart(date: string) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        commit((current) => ({
          ...current,
          runningProgramStart: date,
          blocks: current.blocks.map((block) => (block.id === current.activeBlockId ? { ...block, startDate: date } : block)),
        }));
      },
      saveBlock(block: TrainingBlock) {
        commit((current) => ({
          ...current,
          blocks: current.blocks.some((item) => item.id === block.id)
            ? current.blocks.map((item) => (item.id === block.id ? block : item))
            : [...current.blocks, block],
        }));
      },
      activateBlock(blockId: string) {
        commit((current) => {
          const block = current.blocks.find((item) => item.id === blockId);
          if (!block || block.status === "archived") return current;
          if (current.blocks.some((item) => item.status === "active" && item.id !== blockId)) return current;
          return {
            ...current,
            activeBlockId: blockId,
            runningProgramStart: block.startDate,
            blocks: current.blocks.map((item) => (item.id === blockId ? { ...item, status: "active" } : item)),
          };
        });
      },
      completeBlock(blockId: string) {
        commit((current) => {
          const block = current.blocks.find((item) => item.id === blockId);
          if (!block) return current;
          const assessment = { ...reviewBlock(block, current.workouts, current.runs), confirmedAt: new Date().toISOString() };
          return {
            ...current,
            activeBlockId: current.activeBlockId === blockId ? null : current.activeBlockId,
            blocks: current.blocks.map((item) => (item.id === blockId ? { ...item, status: "completed", assessment } : item)),
          };
        });
      },
      removeBlock(blockId: string) {
        commit((current) => {
          const block = current.blocks.find((item) => item.id === blockId);
          if (!block || block.status !== "upcoming") return current;
          const used = current.workouts.some((workout) => workout.blockId === blockId) || current.runs.some((run) => run.blockId === blockId);
          if (used) return current;
          return { ...current, blocks: current.blocks.filter((item) => item.id !== blockId) };
        });
      },
      archiveBlock(blockId: string) {
        commit((current) => ({
          ...current,
          activeBlockId: current.activeBlockId === blockId ? null : current.activeBlockId,
          blocks: current.blocks.map((item) => (item.id === blockId ? { ...item, status: "archived" } : item)),
        }));
      },
      setLibraryEdit(edit: LibraryEdit) {
        commit((current) => ({
          ...current,
          libraryEdits: [
            ...(current.libraryEdits ?? []).filter(
              (item) => !(item.sessionKey === edit.sessionKey && item.exerciseKey === edit.exerciseKey),
            ),
            edit,
          ],
        }));
      },
      saveLibraryExercise(exercise: LibraryExercise) {
        if (!exercise.id || !exercise.name.trim()) return;
        commit((current) => ({
          ...current,
          exerciseLibrary: [
            ...(current.exerciseLibrary ?? []).filter((item) => item.id !== exercise.id),
            { ...exercise, name: exercise.name.trim() },
          ],
        }));
      },
      deleteLibraryExercise(exerciseId: string) {
        commit((current) => ({
          ...current,
          exerciseLibrary: (current.exerciseLibrary ?? []).filter((item) => item.id !== exerciseId),
        }));
      },
      saveFutureSession(plan: FutureSessionPlan) {
        commit((current) => ({
          ...current,
          futureSessions: [
            ...(current.futureSessions ?? []).filter((item) => item.sessionKey !== plan.sessionKey),
            plan,
          ],
        }));
      },
      replaceData(next: AppData) {
        commit(() => normalizeAppData(next));
      },
      clearTrainingLog() {
        commit((current) => ({
          ...defaultAppData,
          settings: current.settings,
        }));
      },
      setSessionDate(override: ScheduleOverride) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(override.date)) return;
        commit((current) => ({
          ...current,
          scheduleOverrides: [
            ...(current.scheduleOverrides ?? []).filter(
              (item) =>
                !(
                  item.week === override.week &&
                  item.kind === override.kind &&
                  item.key === override.key &&
                  (item.blockId ?? null) === (override.blockId ?? null)
                ),
            ),
            override,
          ],
        }));
      },
    }),
    [commit, data.settings, data.workouts, data.runs, data.runTemplates, data.runningProgramStart, data.scheduleOverrides, data.libraryEdits, data.exerciseLibrary, data.futureSessions, data.blocks, data.activeBlockId, storageError],
  );

  return <AppStateContext value={value}>{children}</AppStateContext>;
}
