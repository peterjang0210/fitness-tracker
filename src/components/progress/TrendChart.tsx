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
  const numbers = data.flatMap((row) => series.map((item) => Number(row[item.key]) || 0));
  const peak = Math.max(...numbers, goal?.value ?? 0, 1);
  const yMax = Math.ceil(peak * 1.08);
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
                <YAxis stroke={ink} tick={{ fill: ink, fontSize: 12 }} width={48} domain={[0, yMax]} />
                <Tooltip formatter={(value) => [unit ? `${value} ${unit}` : value, ""]} />
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
                  domain={[0, yMax]}
                  tickFormatter={(value: number) => (unit === "pace" ? formatPace(value) : String(value))}
                />
                <Tooltip
                  formatter={(value, name) => [unit === "pace" ? formatPace(Number(value)) : unit ? `${value} ${unit}` : value, name]}
                />
                {goal ? <ReferenceLine y={goal.value} stroke="var(--accent)" strokeDasharray="4 4" /> : null}
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
