export const STORAGE_KEY = "iron-mile.v1";

export type ThemePreference = "light" | "dark" | "system";
export type WeightUnit = "lb" | "kg";

export interface Settings {
  theme: ThemePreference;
  weightUnit: WeightUnit;
  updatedAt: string | null;
}

/**
 * Versioned document stored in localStorage.
 * Later stages add fields here and normalize them in `normalizeAppData`.
 */
export interface AppData {
  version: 1;
  settings: Settings;
}

export const defaultAppData: AppData = {
  version: 1,
  settings: {
    theme: "system",
    weightUnit: "lb",
    updatedAt: null,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTheme(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "lb" || value === "kg";
}

export function normalizeAppData(value: unknown): AppData {
  if (!isRecord(value) || !isRecord(value.settings)) {
    return defaultAppData;
  }

  const settings = value.settings;
  return {
    version: 1,
    settings: {
      theme: isTheme(settings.theme) ? settings.theme : defaultAppData.settings.theme,
      weightUnit: isWeightUnit(settings.weightUnit)
        ? settings.weightUnit
        : defaultAppData.settings.weightUnit,
      updatedAt: typeof settings.updatedAt === "string" ? settings.updatedAt : null,
    },
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppData;
    return normalizeAppData(JSON.parse(raw) as unknown);
  } catch {
    return defaultAppData;
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
