export type NavIconName = "dashboard" | "calendar" | "workouts" | "running" | "progress" | "settings";

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: NavIconName;
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", short: "Home", icon: "dashboard", end: true },
  { to: "/calendar", label: "Program", short: "Plan", icon: "calendar" },
  { to: "/workouts", label: "Workout Log", short: "Lifts", icon: "workouts" },
  { to: "/running", label: "Running Log", short: "Runs", icon: "running" },
  { to: "/progress", label: "Progress", short: "Charts", icon: "progress" },
  { to: "/settings", label: "Settings", short: "More", icon: "settings" },
];
