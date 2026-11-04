export type NavIconName = "dashboard" | "workouts" | "running" | "progress" | "settings";

export interface NavItem {
  to: string;
  label: string;
  icon: NavIconName;
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/workouts", label: "Workouts", icon: "workouts" },
  { to: "/running", label: "Running", icon: "running" },
  { to: "/progress", label: "Progress", icon: "progress" },
  { to: "/settings", label: "Settings", icon: "settings" },
];
