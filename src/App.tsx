import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { ProgressPage } from "./pages/ProgressPage.tsx";
import { RunningPage } from "./pages/RunningPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { WorkoutsPage } from "./pages/WorkoutsPage.tsx";
import { AppStateProvider } from "./state/AppStateProvider.tsx";

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="running" element={<RunningPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppStateProvider>
  );
}
