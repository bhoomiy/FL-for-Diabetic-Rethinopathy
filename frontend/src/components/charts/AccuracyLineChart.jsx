import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS, percent1 } from "./chartTheme";

export default function AccuracyLineChart({ data, series, height = 260, domain = [0.3, 0.9] }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="round" {...AXIS_PROPS} />
          <YAxis domain={domain} tickFormatter={percent1} {...AXIS_PROPS} />
          <Tooltip {...TOOLTIP_PROPS} formatter={(v) => percent1(v)} labelFormatter={(l) => `Round ${l}`} />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
