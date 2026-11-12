import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "../../charts/index.ts";
import { formatPace } from "../../domain/running.ts";
import type { DatedPoint } from "../../domain/progress.ts";

export function TrendChart({
  title,
  data,
  series,
  kind,
  empty,
  goal,
  unit,
  note,
}: {
  title: string;
  data: DatedPoint[];
  series: { key: string; name: string; color: string }[];
  kind: "line" | "bar";
  empty: string;
  goal?: { value: number; name: string };
  unit?: string;
  note?: string;
}) {
  const ink = "var(--muted)";
  const pace = unit === "pace";
  const numbers = data.flatMap((row) => series.map((item) => Number(row[item.key])).filter((value) => Number.isFinite(value) && value > 0));
  const peak = Math.max(1, ...numbers, goal?.value ?? 0);
  const floor = Math.min(peak, ...numbers, goal?.value ?? peak);
  const yMin = pace ? Math.max(0, Math.floor(floor * 0.92)) : 0;
  const yMax = Math.ceil(peak * (pace ? 1.06 : 1.08));
  const tooltipStyle = {
    background: "var(--bg-raised)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--ink)",
  };
  return (
    <article className="panel chart-card">
      <h2>{title}</h2>
      {note ? <p className="chart-note">{note}</p> : null}
      {data.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            {kind === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid stroke={ink} strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="label" stroke={ink} tick={{ fill: ink, fontSize: 12 }} />
                <YAxis stroke={ink} tick={{ fill: ink, fontSize: 12 }} width={48} domain={[yMin, yMax]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [unit ? `${value} ${unit}` : value, ""]} />
                {series.map((item) => (
                  <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} radius={4} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid stroke={ink} strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="label" stroke={ink} tick={{ fill: ink, fontSize: 12 }} />
                <YAxis
                  stroke={ink}
                  tick={{ fill: ink, fontSize: 12 }}
                  width={56}
                  reversed={pace}
                  domain={[yMin, yMax]}
                  tickFormatter={(value: number) => (pace ? formatPace(value) : String(value))}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [pace ? formatPace(Number(value)) : unit ? `${value} ${unit}` : value, name]}
                />
                {goal ? (
                  <ReferenceLine
                    y={goal.value}
                    stroke="var(--accent)"
                    strokeDasharray="4 4"
                    label={{ value: goal.name, fill: "var(--ink)", fontSize: 12, position: "insideTopRight" }}
                  />
                ) : null}
                {series.map((item) => (
                  <Line key={item.key} type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} dot={{ r: 3 }} />
                ))}
                {series.length > 1 ? <Legend /> : null}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
