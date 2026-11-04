import type { NavIconName } from "../navigation/navItems.ts";

export function NavIcon({ name }: { name: NavIconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3.5v3M16 3.5v3M4 10h16" />
      </svg>
    );
  }

  if (name === "workouts") {
    return (
      <svg {...common}>
        <path d="M6 9v6M18 9v6M3 10.5v3M21 10.5v3M6 12h12" />
      </svg>
    );
  }

  if (name === "running") {
    return (
      <svg {...common}>
        <circle cx="15" cy="5" r="1.6" />
        <path d="M8 20l2.2-4.2 2.3 1.2 1.4-2.6-2.4-1.5 1.2-2.2 3.6 1.4 1.5 3.2" />
        <path d="M7.5 11.5L5 14" />
      </svg>
    );
  }

  if (name === "progress") {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="M7 15l4-4 2.5 2.5L19 8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </svg>
  );
}
