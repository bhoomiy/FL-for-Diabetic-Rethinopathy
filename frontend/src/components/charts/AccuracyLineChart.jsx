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

import {
  AXIS_PROPS,
  GRID_PROPS,
  TOOLTIP_PROPS,
} from "./chartTheme";

const formatAccuracy = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toFixed(1)}%`;
};

export default function AccuracyLineChart({
  data,
  series,
  height = 260,
  domain = [0, 100],
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid {...GRID_PROPS} />

          <XAxis
            dataKey="round"
            {...AXIS_PROPS}
            allowDecimals={false}
          />

          <YAxis
            domain={domain}
            tickFormatter={formatAccuracy}
            {...AXIS_PROPS}
          />

          <Tooltip
            {...TOOLTIP_PROPS}
            formatter={(value) => formatAccuracy(value)}
            labelFormatter={(label) => `Round ${label}`}
          />

          {series.length > 1 ? (
            <Legend wrapperStyle={{ fontSize: 12 }} />
          ) : null}

          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}