import { createContext } from "react";
import type { RunTemplate, RunWorkout } from "../domain/running.ts";
import type { ScheduleOverride } from "../domain/schedule.ts";
import type { WorkoutLog } from "../domain/workoutLog.ts";
import type { AppData, LibraryEdit, Settings, ThemePreference, WeightUnit } from "../storage/appData.ts";

export interface SettingsPatch {
  theme?: ThemePreference;
  weightUnit?: WeightUnit;
}

export interface AppState {
  settings: Settings;
  workouts: WorkoutLog[];
  runs: RunWorkout[];
  runTemplates: RunTemplate[];
  storageError: string | null;
  updateSettings: (patch: SettingsPatch) => void;
  saveWorkout: (workout: WorkoutLog) => void;
  deleteWorkout: (workoutId: string) => void;
  saveRun: (run: RunWorkout) => void;
  deleteRun: (runId: string) => void;
  saveRunTemplate: (template: RunTemplate) => void;
  deleteRunTemplate: (templateId: string) => void;
  runningProgramStart: string;
  scheduleOverrides: ScheduleOverride[];
  libraryEdits: LibraryEdit[];
  setRunningProgramStart: (date: string) => void;
  setSessionDate: (override: ScheduleOverride) => void;
  setLibraryEdit: (edit: LibraryEdit) => void;
  replaceData: (data: AppData) => void;
  clearTrainingLog: () => void;
}

export const AppStateContext = createContext<AppState | null>(null);
