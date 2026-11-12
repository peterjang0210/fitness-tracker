import type { TestKind } from "../../domain/running.ts";

const mileRows = [
  ["10:00", "6.00 mph"],
  ["9:00", "6.67 mph"],
  ["8:30", "7.06 mph"],
  ["8:00", "7.50 mph"],
  ["7:30", "8.00 mph"],
  ["7:00", "8.57 mph"],
];

const fiveKRows = [
  ["32:00", "5.82 mph"],
  ["30:00", "6.21 mph"],
  ["28:00", "6.66 mph"],
  ["27:00", "6.94 mph"],
  ["26:00", "7.16 mph"],
  ["25:00", "7.46 mph"],
];

export function TestGuide({ kind = "both" }: { kind?: TestKind | "both" }) {
  return (
    <div className="guide-grid">
      {kind === "fivek" ? null : <GuideCard title="1-mile time trial" steps={mileSteps} rows={mileRows} caption="Mile time and the speed that holds it." />}
      {kind === "mile" ? null : <GuideCard title="5K time trial" steps={fiveKSteps} rows={fiveKRows} caption="5K time and the average speed that holds it. 5K is 3.11 miles." />}
    </div>
  );
}

function GuideCard({ title, steps, rows, caption }: { title: string; steps: string[]; rows: string[][]; caption: string }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      <ol className="guide-steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <table className="ref-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Time</th>
            <th>Speed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <td>{row[0]}</td>
              <td>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

const mileSteps = [
  "Walk for 3 minutes.",
  "Jog easily for 5 minutes.",
  "Do 2–3 accelerations of 15–20 seconds, with easy recovery between them.",
  "Walk briefly, then start.",
  "Set the incline to 0.5–1%.",
  "Run exactly 1.00 mile as fast as you can hold. Start at a pace you can finish, and only speed up if it still feels available.",
  "Record the time at 1.00 mile.",
];

const fiveKSteps = [
  "Walk for 3 minutes.",
  "Jog easily for 5 minutes.",
  "Walk or jog easily for 2 minutes.",
  "Set the incline to 0.5–1%.",
  "Run 3.11 miles (5 kilometers) at an even pace. Do not start too fast.",
  "Speed up in the last mile only if you still have it.",
  "Record the time at 3.11 miles.",
];
