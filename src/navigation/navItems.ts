export type NavIconName = "dashboard" | "calendar" | "workouts" | "running" | "progress" | "settings";

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: NavIconName;
  end?: boolean;
}

/** Primary destinations shown in mobile bottom nav and desktop sidebar. */
export const navItems: NavItem[] = [
  { to: "/", label: "Home", short: "Home", icon: "dashboard", end: true },
  { to: "/workouts", label: "Workout", short: "Workout", icon: "workouts" },
  { to: "/progress", label: "Progress", short: "Progress", icon: "progress" },
  { to: "/settings", label: "Settings", short: "Settings", icon: "settings" },
];

/** Secondary destinations linked from Home / Workout / Settings. */
export const secondaryNavItems: NavItem[] = [
  { to: "/blocks", label: "Blocks", short: "Blocks", icon: "calendar" },
  { to: "/calendar", label: "Program", short: "Plan", icon: "calendar" },
  { to: "/running", label: "Running", short: "Runs", icon: "running" },
];
