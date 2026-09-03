import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DR_CLASSES } from "@/constants/drClasses";
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS } from "./chartTheme";

// Stacked bar chart of the five DR classes across clients.
export default function DistributionChart({ data, height = 300, stacked = true }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="client" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} />
          <Tooltip {...TOOLTIP_PROPS} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {DR_CLASSES.map((c, i) => (
            <Bar
              key={c.key}
              dataKey={c.key}
              name={c.label}
              stackId={stacked ? "dist" : undefined}
              fill={c.color}
              radius={stacked && i === DR_CLASSES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
