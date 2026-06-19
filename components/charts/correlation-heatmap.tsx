"use client";

interface CorrelationHeatmapProps {
  matrix: number[][];
  labels: string[];
}

const COLOR_SCALE = [
  { val: -1, color: "rgb(220, 38, 38)" },
  { val: -0.5, color: "rgb(252, 165, 165)" },
  { val: 0, color: "rgb(209, 209, 214)" },
  { val: 0.5, color: "rgb(147, 197, 253)" },
  { val: 1, color: "rgb(37, 99, 235)" },
];

function getColor(val: number): string {
  const clamped = Math.max(-1, Math.min(1, val));
  for (let i = 0; i < COLOR_SCALE.length - 1; i++) {
    const lo = COLOR_SCALE[i];
    const hi = COLOR_SCALE[i + 1];
    if (clamped >= lo.val && clamped <= hi.val) {
      const t = (clamped - lo.val) / (hi.val - lo.val);
      // Simple linear interpolation
      const loRgb = lo.color.match(/\d+/g)!.map(Number);
      const hiRgb = hi.color.match(/\d+/g)!.map(Number);
      const r = Math.round(loRgb[0] + t * (hiRgb[0] - loRgb[0]));
      const g = Math.round(loRgb[1] + t * (hiRgb[1] - loRgb[1]));
      const b = Math.round(loRgb[2] + t * (hiRgb[2] - loRgb[2]));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return "rgb(255, 255, 255)";
}

export function CorrelationHeatmap({ matrix, labels }: CorrelationHeatmapProps) {
  const size = labels.length;
  const cellSize = Math.min(60, 400 / size);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Header row */}
        <div className="flex">
          <div style={{ width: cellSize * 1.5 }} />
          {labels.map((label) => (
            <div
              key={label}
              style={{ width: cellSize }}
              className="overflow-hidden text-center text-xs text-muted-foreground"
              title={label}
            >
              {label.slice(0, 5)}
            </div>
          ))}
        </div>
        {/* Matrix rows */}
        {matrix.map((row, i) => (
          <div key={labels[i]} className="flex items-center">
            <div
              style={{ width: cellSize * 1.5 }}
              className="pr-1 text-right text-xs text-muted-foreground"
              title={labels[i]}
            >
              {labels[i].slice(0, 6)}
            </div>
            {row.map((val, j) => (
              <div
                key={j}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getColor(val),
                }}
                className="flex items-center justify-center border border-background text-xs"
                title={`${labels[i]} × ${labels[j]}: ${val.toFixed(2)}`}
              >
                {size <= 10 ? val.toFixed(2) : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
