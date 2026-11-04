import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppStateContext, type SettingsPatch } from "./appStateContext.ts";
import {
  loadAppData,
  saveAppData,
  STORAGE_KEY,
  type AppData,
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
    return "This browser blocked local storage, so settings will not survive a refresh.";
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [storageError, setStorageError] = useState<string | null>(() => readStorageError());

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
      storageError,
      updateSettings(patch: SettingsPatch) {
        const next: AppData = {
          version: 1,
          settings: {
            ...data.settings,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        };
        setData(next);
        try {
          saveAppData(next);
          setStorageError(null);
        } catch {
          setStorageError("This browser blocked local storage, so settings will not survive a refresh.");
        }
      },
    }),
    [data.settings, storageError],
  );

  return <AppStateContext value={value}>{children}</AppStateContext>;
}
