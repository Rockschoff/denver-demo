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

export function SavedCharts() {
  const graphs = useGraphStore(s => s.graphs);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {graphs.length>0?graphs.map((g, i) => (
        <Card key={i} className="shadow-lg">
          <CardHeader>
            <CardTitle>{g.name}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={g.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="X" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Y"
                  name={`Primary (${g.agg1})`}
                />
                {g.useSecondary && (
                  <Line
                    type="monotone"
                    dataKey="Y2"
                    name={`Secondary (${g.agg2})`}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )):<p className="text-gray-400">Empty</p>}
    </div>
  );
}
