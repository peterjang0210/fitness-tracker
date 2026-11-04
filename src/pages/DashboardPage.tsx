import { Link } from "react-router-dom";
import { Page } from "../components/layout/Page.tsx";

const areas = [
  {
    to: "/workouts",
    title: "Workouts",
    text: "Log sets, weight, reps, and RPE for the weekly strength sessions.",
  },
  {
    to: "/running",
    title: "Running",
    text: "Record treadmill segments and keep walking time out of the running totals.",
  },
  {
    to: "/progress",
    title: "Progress",
    text: "Charts for strength and running will read from the log stored on this device.",
  },
  {
    to: "/settings",
    title: "Settings",
    text: "Appearance and units are saved locally. There is no account.",
  },
];

const targets = [
  { label: "Bench press", value: "225 lb" },
  { label: "Squat", value: "315 lb for 3+ reps" },
  { label: "Mile", value: "7:00" },
  { label: "5K", value: "Sub 25:00" },
];

export function DashboardPage() {
  return (
    <Page
      eyebrow="Home"
      title="Training board"
      lede="A local log for the 16-week strength and running block. Nothing here is uploaded."
    >
      <div className="target-grid" aria-label="Training targets">
        {targets.map((target) => (
          <article key={target.label} className="target-card">
            <p>{target.label}</p>
            <strong>{target.value}</strong>
            <span>Not logged yet</span>
          </article>
        ))}
      </div>
      <div className="area-grid">
        {areas.map((area) => (
          <Link key={area.to} to={area.to} className="area-card">
            <h2>{area.title}</h2>
            <p>{area.text}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
