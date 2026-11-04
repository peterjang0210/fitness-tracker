import { use } from "react";
import { AppStateContext } from "./appStateContext.ts";

export function useAppState() {
  const value = use(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return value;
}
