import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export default function AlgorithmComparisonChart({
  fedAvg,
  fedProx,
  height = 300,
}) {
  const data = [
    {
      metric: "Validation Accuracy",
      FedAvg: fedAvg?.accuracy ?? 0,
      FedProx: fedProx?.accuracy ?? 0,
    },
    {
      metric: "Macro F1",
      FedAvg: fedAvg ? fedAvg.macroF1 * 100 : 0,
      FedProx: fedProx ? fedProx.macroF1 * 100 : 0,
    },
    {
      metric: "Weighted F1",
      FedAvg: fedAvg ? fedAvg.weightedF1 * 100 : 0,
      FedProx: fedProx ? fedProx.weightedF1 * 100 : 0,
    },
  ];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 8,
            left: -10,
            bottom: 0,
          }}
        >
          <CartesianGrid {...GRID_PROPS} />

          <XAxis
            dataKey="metric"
            {...AXIS_PROPS}
          />

          <YAxis
            {...AXIS_PROPS}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />

          <Tooltip
            {...TOOLTIP_PROPS}
            formatter={(value) => [
              `${Number(value).toFixed(2)}%`,
            ]}
          />

          <Legend
            wrapperStyle={{ fontSize: 12 }}
          />

          <Bar
            dataKey="FedAvg"
            fill="#e96fa4"
            radius={[6, 6, 0, 0]}
            />

            <Bar
            dataKey="FedProx"
            fill="#6f8f78"
            radius={[6, 6, 0, 0]}
            />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}