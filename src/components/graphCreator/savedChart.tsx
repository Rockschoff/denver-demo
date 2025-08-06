import React from "react";
import { useGraphStore } from "@/lib/zustandStores";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "../ui/button";

// A constant array for moving average periods to check against.
// This should match the options in GraphCreator.tsx.
const maOptions = [3, 7, 15];

export function SavedCharts() {
  const graphs = useGraphStore(s => s.graphs);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {graphs.length > 0 ? (
        graphs.map((g, i) => {
          // Check which data keys exist in the saved data for dynamic rendering.
          const dataKeys = g.data.length > 0 ? Object.keys(g.data[0]) : [];
          const hasSecondary = dataKeys.some(k => k.startsWith('Y2'));

          return (
            <Card key={i} className="shadow-lg">
              <CardHeader>
                <CardTitle>{g.name}<br/><br/><Button>+ Include Graph</Button></CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={g.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="X" />
                    <YAxis yAxisId="left" />
                    {hasSecondary && <YAxis yAxisId="right" orientation="right" />}
                    <Tooltip />
                    <Legend />
                    
                    {/* Primary Series and its analysis lines */}
                    {dataKeys.includes('Y') && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Y"
                        name={`Primary (${g.y1Name} - ${g.agg1})`}
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                    {dataKeys.includes('Y_Trend') && (
                      <Line
                        yAxisId="left"
                        dataKey="Y_Trend"
                        name="Primary Trend"
                        stroke="#c0392b"
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                    {maOptions.map(p =>
                      dataKeys.includes(`Y_MA${p}`) && (
                        <Line
                          key={`saved-ma1-${p}`}
                          yAxisId="left"
                          dataKey={`Y_MA${p}`}
                          name={`Primary ${p}-Day MA`}
                          stroke="#e67e22"
                          dot={false}
                        />
                      )
                    )}

                    {/* Secondary Series and its analysis lines */}
                    {dataKeys.includes('Y2') && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Y2"
                        name={`Secondary (${g.y2Name} - ${g.agg2})`}
                        stroke="#82ca9d"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                     {dataKeys.includes('Y2_Trend') && (
                      <Line
                        yAxisId="right"
                        dataKey="Y2_Trend"
                        name="Secondary Trend"
                        stroke="#16a085"
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                    {maOptions.map(p =>
                      dataKeys.includes(`Y2_MA${p}`) && (
                        <Line
                          key={`saved-ma2-${p}`}
                          yAxisId="right"
                          dataKey={`Y2_MA${p}`}
                          name={`Secondary ${p}-Day MA`}
                          stroke="#2ecc71"
                          dot={false}
                        />
                      )
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <p className="text-gray-400 col-span-full text-center py-8">
          No saved graphs yet. Create and save a graph to see it here.
        </p>
      )}
    </div>
  );
}