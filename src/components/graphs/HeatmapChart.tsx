/* eslint-disable @typescript-eslint/no-explicit-any */
// components/HeatmapChart.tsx
"use client";
import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface HeatmapDataRow {
  [key: string]: string | number;
}

interface HeatmapChartProps {
  data: HeatmapDataRow[];
  xField: string;
  yField: string;
  colorField: string;
  title?: string;
  cellSize?: number; // optional cell size in pixels
}

const toTitleCase = (str: string) =>
  str
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  xField,
  yField,
  colorField,
  title,
  cellSize = 50,
}) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data
      </div>
    );
  }

  // Extract unique labels
  const xLabels = Array.from(new Set(data.map((d) => String(d[xField]))));
  const yLabels = Array.from(new Set(data.map((d) => String(d[yField]))));

  // Build matrix and find min/max
  const matrix = yLabels.map((y) =>
    xLabels.map((x) => {
      const hit = data.find(
        (d) => String(d[xField]) === x && String(d[yField]) === y
      );
      return hit ? Number(hit[colorField]) : 0;
    })
  );

  const flat = matrix.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  // Ensure zero values get a light hue
  const colorFor = (v: number) => {
    const t = max > min ? (v - min) / (max - min) : 0;
    const alpha = v === min ? 0.1 : t;
    return `rgba(66, 86, 244, ${alpha})`;
  };

  // grid dimensions: include header row + label column
  const cols = xLabels.length + 1;
  const rows = yLabels.length + 1;

  return (
    <div className="heatmap-wrapper" style={{ overflow: "auto" }}>
      {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
      <div
        className="heatmap-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: 1,
          border: "1px solid #e5e7eb",
        }}
      >
        {/* corner placeholder */}
        <div />

        {/* X-axis labels (commented out) */}
        {false && xLabels.map((x) => (
          <div
            key={x}
            style={{
              width: cellSize,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              transform: "rotate(-45deg)",
              transformOrigin: "center",
            }}
          >
            {x}
          </div>
        ))}

        {/* Rows: Y label + cells */}
        {yLabels.map((y, rowIdx) => (
          <React.Fragment key={y}>
            {/* Y label (commented out) */}
            {false && (
              <div
                style={{
                  width: cellSize,
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 4,
                  fontSize: "12px",
                }}
              >
                {y}
              </div>
            )}

            {/* Cells */}
            {xLabels.map((x, colIdx) => {
              const value = matrix[rowIdx][colIdx];
              return (
                <Tooltip key={`${x}__${y}`}>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: colorFor(value),
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>{toTitleCase(xField)}:</strong> {x}
                      </p>
                      <p>
                        <strong>{toTitleCase(yField)}:</strong> {y}
                      </p>
                      <p>
                        <strong>{toTitleCase(colorField)}:</strong> {value}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center mt-4 gap-2">
        <span className="text-sm">{min}</span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: `linear-gradient(to right, ${colorFor(min)}, ${colorFor(
              max
            )})`,
            minWidth: 100,
          }}
        />
        <span className="text-sm">{max}</span>
      </div>
    </div>
  );
};
