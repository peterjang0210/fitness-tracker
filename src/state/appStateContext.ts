import { createContext } from "react";
import type { Settings, ThemePreference, WeightUnit } from "../storage/appData.ts";

export interface SettingsPatch {
  theme?: ThemePreference;
  weightUnit?: WeightUnit;
}

export interface AppState {
  settings: Settings;
  storageError: string | null;
  updateSettings: (patch: SettingsPatch) => void;
}

export const AppStateContext = createContext<AppState | null>(null);
