import { useState } from "react";
import StatusBadge from "@/components/common/StatusBadge";

// Accessible 5x5 confusion matrix with raw-count / normalized toggle.
export default function ConfusionMatrixTable({ labels, matrix }) {
  const [normalized, setNormalized] = useState(false);
  const rowTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const max = Math.max(...matrix.flat());

  const cellValue = (value, rowIndex) =>
    normalized ? (rowTotals[rowIndex] ? (value / rowTotals[rowIndex]) * 100 : 0) : value;

  const intensity = (value, rowIndex) => {
    const ratio = normalized ? (rowTotals[rowIndex] ? value / rowTotals[rowIndex] : 0) : value / max;
    return Math.min(0.85, 0.06 + ratio * 0.8);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Matrix value mode">
          {[
            { key: false, label: "Raw counts" },
            { key: true, label: "Normalized %" },
          ].map((opt) => (
            <button
              key={String(opt.key)}
              type="button"
              aria-pressed={normalized === opt.key}
              onClick={() => setNormalized(opt.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                normalized === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <StatusBadge tone="warning">Demonstration values</StatusBadge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <caption className="sr-only">
            Confusion matrix. Rows are the actual diabetic retinopathy class, columns are the predicted class.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left font-medium text-muted-foreground">
                Actual \ Predicted
              </th>
              {labels.map((l) => (
                <th key={l} scope="col" className="p-2 text-center font-medium text-muted-foreground">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={labels[i]}>
                <th scope="row" className="whitespace-nowrap p-2 text-left font-medium text-foreground">
                  {labels[i]}
                </th>
                {row.map((value, j) => {
                  const display = cellValue(value, i);
                  return (
                    <td key={`${i}-${j}`} className="p-1">
                      <div
                        title={`Actual ${labels[i]}, predicted ${labels[j]}: ${value} samples`}
                        className={`grid h-12 place-items-center rounded-lg text-xs font-semibold tabular-nums ${
                          i === j ? "text-success" : "text-foreground"
                        }`}
                        style={{
                          backgroundColor:
                            i === j
                              ? `color-mix(in oklch, var(--color-success) ${intensity(value, i) * 100}%, transparent)`
                              : `color-mix(in oklch, var(--color-destructive) ${intensity(value, i) * 100}%, transparent)`,
                        }}
                      >
                        {normalized ? `${display.toFixed(1)}%` : display}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
