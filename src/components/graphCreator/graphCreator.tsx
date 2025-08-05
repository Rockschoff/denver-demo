/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import { executeSnowflakeQuery } from "@/lib/snowflakeClient";

// export default function GraphCreator(){
//     /*
    
//     Create a good looking UI with shacn and recharts this a graph creator ui that looks good and is used create graphs
//     it will query the following snowflake tables
//     create or replace TABLE DENVER_BETA.DATA.CAP_TORQUE (
// 	QPF_ID VARCHAR(16777216),
// 	LINE NUMBER(38,0),
// 	PART VARCHAR(16777216),
// 	PROCESS VARCHAR(16777216),
// 	SHIFT VARCHAR(16777216),
// 	EMPLOYEE VARCHAR(16777216),
// 	DATE TIMESTAMP_NTZ(9),
// 	LINESTATUS VARCHAR(16777216),
// 	NUMOFSAMPLES NUMBER(38,0),
// 	CAPTORQUE NUMBER(38,6),
// 	CAPPERHEAD NUMBER(38,0),
// 	COMMENTS VARCHAR(16777216),
// 	OUTOFSPEC BOOLEAN,
// 	CAPTORQUEID NUMBER(38,0)
// );

// create or replace TABLE DENVER_BETA.DATA.FILL_WEIGHTS (
// 	QPF_ID VARCHAR(16777216),
// 	LINE NUMBER(38,0),
// 	PART VARCHAR(16777216),
// 	PROCESS VARCHAR(16777216),
// 	SHIFT VARCHAR(16777216),
// 	EMPLOYEE VARCHAR(16777216),
// 	DATE TIMESTAMP_NTZ(9),
// 	LINESTATUS VARCHAR(16777216),
// 	NUMOFSAMPLES NUMBER(38,0),
// 	FILLWEIGHT NUMBER(38,2),
// 	COMMENTS VARCHAR(16777216),
// 	OUTOFSPEC BOOLEAN,
// 	FILLWEIGHTSID NUMBER(38,0)
// );

// there is should be agood intuitive form and people should be able to save  the graphs and the add trendlines to them and assign to specific folder
//     */

// // user await executeSnowflakeQuery(query).data to get data
// }

// src/components/ui/date-range-picker.tsx
import { useState, useMemo } from "react";
import { Save, SlidersHorizontal, LineChart as LineIcon } from "lucide-react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { addDays, format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Configuration
const tables = [
  { key: "CAP_TORQUE", label: "Cap Torque" },
  { key: "FILL_WEIGHTS", label: "Fill Weights" },
  { key: "TOP_LOAD", label: "Top Load" },
];
const metricsMap: Record<string, { key: string; label: string }[]> = {
  CAP_TORQUE: [
    { key: "CAPTORQUE", label: "Cap Torque" },
    { key: "NUMOFSAMPLES", label: "# Samples" },
  ],
  FILL_WEIGHTS: [
    { key: "FILLWEIGHT", label: "Fill Weight" },
    { key: "NUMOFSAMPLES", label: "# Samples" },
  ],
  TOP_LOAD: [
    { key: "TOPLOAD", label: "Top Load" },
    { key: "NUMOFSAMPLES", label: "# Samples" },
  ],
};
const defaultPalette = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

// Generate placeholder for multiple metrics
function generatePlaceholderData(
  metricKeys: string[],
  dateRange: { from: Date; to: Date }
): any[] {
  const data: any[] = [];
  const values: Record<string, number> = metricKeys.reduce((acc, key) => {
    acc[key] = key.includes("TORQUE") ? 12 : 510;
    return acc;
  }, {} as Record<string, number>);
  let current = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  while (current <= end) {
    const entry: any = { date: format(current, "yyyy-MM-dd") };
    metricKeys.forEach((key) => {
      const base = values[key];
      const randomFactor = (Math.random() - 0.5) * (key.includes("TORQUE") ? 2 : 15);
      const trend =
        ((current.getTime() - dateRange.from.getTime()) /
          (1000 * 60 * 60 * 24)) *
        (key.includes("TORQUE") ? 0.05 : -0.1);
      values[key] += randomFactor + (trend / 10);
      entry[key] = values[key];
    });
    data.push(entry);
    current = addDays(current, 1);
  }
  return data;
}

export default function GraphCreator() {
  // State
  const [table, setTable] = useState(tables[0].key);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    metricsMap[tables[0].key][0].key,
  ]);
  const [colors, setColors] = useState<Record<string, string>>(
    metricsMap[table].reduce((acc, m, i) => {
      acc[m.key] = defaultPalette[i % defaultPalette.length];
      return acc;
    }, {} as Record<string, string>)
  );
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [thresholds, setThresholds] = useState<
    { label: string; value: number; color: string }[]
  >([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveGraphName, setSaveGraphName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("general");

  // Data
  const data = useMemo(
    () => generatePlaceholderData(selectedMetrics, dateRange),
    [selectedMetrics, dateRange]
  );

  // Handlers
  const handleTableChange = (newTable: string) => {
    setTable(newTable);
    const first = metricsMap[newTable][0].key;
    setSelectedMetrics([first]);
    setColors(
      metricsMap[newTable].reduce((acc, m, i) => {
        acc[m.key] = defaultPalette[i % defaultPalette.length];
        return acc;
      }, {} as Record<string, string>)
    );
  };
  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };
  const handleColorChange = (key: string, value: string) => {
    setColors((c) => ({ ...c, [key]: value }));
  };
  const addThreshold = () =>
    setThresholds((t) => [...t, { label: "", value: 0, color: "#ff0000" }]);
  const updateThreshold = (
    i: number,
    t: { label: string; value: number; color: string }
  ) =>
    setThresholds((thr) => thr.map((x, idx) => (idx === i ? t : x)));
  const removeThreshold = (i: number) =>
    setThresholds((t) => t.filter((_, idx) => idx !== i));
  const handleSaveGraph = () => {
    if (!saveGraphName) {
      alert("Please provide a name for the graph.");
      return;
    }
    alert(`"${saveGraphName}" was saved to "${selectedFolder}".`);
    setShowSaveDialog(false);
    setSaveGraphName("");
  };

  const title = tables.find((t) => t.key === table)?.label + " Metrics";

  return (
    <>
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-full bg-muted/20">
        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Configuration
            </CardTitle>
            <CardDescription>Pick tables, metrics, colors, and thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Data Table</Label>
              <Select value={table} onValueChange={handleTableChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Metrics</Label>
              {metricsMap[table].map((m) => (
                <div key={m.key} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    checked={selectedMetrics.includes(m.key)}
                    onCheckedChange={() => toggleMetric(m.key)}
                  />
                  <span>{m.label}</span>
                  <Input
                    type="color"
                    value={colors[m.key]}
                    onChange={(e) =>
                      handleColorChange(m.key, e.target.value)
                    }
                    className="h-6 w-10 p-0"
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Date Range</Label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={dateRange.from.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDateRange({
                      ...dateRange,
                      from: new Date(e.target.value),
                    })
                  }
                />
                <Input
                  type="date"
                  value={dateRange.to.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDateRange({
                      ...dateRange,
                      to: new Date(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Thresholds</Label>
              {thresholds.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2 py-1"
                >
                  <Input
                    placeholder="Label"
                    value={t.label}
                    onChange={(e) =>
                      updateThreshold(i, {
                        ...t,
                        label: e.target.value,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Value"
                    value={t.value}
                    onChange={(e) =>
                      updateThreshold(i, {
                        ...t,
                        value: Number(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <Input
                    type="color"
                    value={t.color}
                    onChange={(e) =>
                      updateThreshold(i, {
                        ...t,
                        color: e.target.value,
                      })
                    }
                    className="h-6 w-10 p-0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeThreshold(i)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addThreshold}>
                Add Threshold
              </Button>
            </div>

            <Button
              onClick={() => setShowSaveDialog(true)}
              variant="outline"
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Graph
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineIcon className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>
              Showing {selectedMetrics.length} metric(s) over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] pr-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(str) => format(new Date(str), "MMM d")}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedMetrics.map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={
                      metricsMap[table].find((m) => m.key === key)?.label ||
                      key
                    }
                    stroke={colors[key]}
                    fill={colors[key]}
                    fillOpacity={0.3}
                  />
                ))}
                {thresholds.map((t, i) => (
                  <ReferenceLine
                    key={i}
                    y={t.value}
                    stroke={t.color}
                    strokeDasharray="3 3"
                    label={t.label}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Graph</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="graph-name">Graph Name</Label>
              <Input
                id="graph-name"
                value={saveGraphName}
                onChange={(e) => setSaveGraphName(e.target.value)}
                placeholder="e.g., Q3 Production Line 5 Torque"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder">Assign to Folder</Label>
              <Select
                onValueChange={setSelectedFolder}
                defaultValue={selectedFolder}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Reports</SelectItem>
                  <SelectItem value="production-line-5">
                    Production Line 5
                  </SelectItem>
                  <SelectItem value="quality-assurance">
                    Quality Assurance
                  </SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="folder">Assign to Sub-Folder</Label>
              <Select
                onValueChange={setSelectedFolder}
                defaultValue={selectedFolder}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Reports</SelectItem>
                  <SelectItem value="production-line-5">
                    Production Line 5
                  </SelectItem>
                  <SelectItem value="quality-assurance">
                    Quality Assurance
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveGraph}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
