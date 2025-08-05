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
import { BarChart as BarIcon, LineChart as LineIcon, Save, SlidersHorizontal, TrendingUp } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from "recharts";
import type { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";

// ShadCN UI Components & Utils
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Removed toast and date-range-picker imports
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

// --- CONFIGURATION & PLACEHOLDER DATA GENERATION ---
const tables = [
  { key: "CAP_TORQUE", label: "Cap Torque" },
  { key: "FILL_WEIGHTS", label: "Fill Weights" },
  { key: "TOP_LOAD", label: "Top Load" }
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
};

const generatePlaceholderData = (metricKey: string, dateRange: DateRange | undefined): any[] => {
  if (!dateRange?.from || !dateRange?.to) return [];
  const data = [];
  let currentDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);
  const isTorque = metricKey.includes('TORQUE');
  let value = isTorque ? 12 : 510;

  while (currentDate <= endDate) {
    const randomFactor = (Math.random() - 0.5) * (isTorque ? 2 : 15);
    const trendFactor = ((currentDate.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) * (isTorque ? 0.05 : -0.1);
    value += randomFactor + (isTorque ? 0.02 : -0.05);

    data.push({
      date: format(currentDate, "yyyy-MM-dd"),
      [metricKey]: value + trendFactor,
    });
    currentDate = addDays(currentDate, 1);
  }
  return data;
};

export default function GraphCreator() {
  // --- STATE MANAGEMENT ---
  const [table, setTable] = useState<string>(tables[0].key);
  const [metric, setMetric] = useState<string>(metricsMap[tables[0].key][0].key);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // UI State
  const [includeTrend, setIncludeTrend] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveGraphName, setSaveGraphName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("general");

  // --- DERIVED DATA (NO FETCHING) ---
  const data = useMemo(() => generatePlaceholderData(metric, dateRange), [metric, dateRange]);

  // --- TRENDLINE CALCULATION ---
  const withTrend = (dataToProcess: any[]): any[] => {
    const points = dataToProcess.map(d => ({ x: new Date(d.date).getTime(), y: d[metric] }));
    const n = points.length;
    if (n < 2) return dataToProcess;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return dataToProcess.map(d => ({ ...d, trend: intercept + slope * new Date(d.date).getTime() }));
  };

  const chartData = useMemo(() => (includeTrend ? withTrend(data) : data), [includeTrend, data, metric]);

  // --- HANDLERS ---
  const handleTableChange = (newTable: string) => {
    setTable(newTable);
    setMetric(metricsMap[newTable][0].key);
  };

  const handleSaveGraph = () => {
    if (!saveGraphName) {
      alert("Please provide a name for the graph.");
      return;
    }
    alert(`"${saveGraphName}" was saved to the "${selectedFolder}" folder.`);
    setShowSaveDialog(false);
    setSaveGraphName("");
  };

  const metricLabel = metricsMap[table].find(m => m.key === metric)?.label || metric;
  const graphTitle = `${metricLabel} Trend`;

  return (
    <>
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-full bg-muted/20">
        {/* --- LEFT PANEL: CONTROLS --- */}
        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Graph Configuration
            </CardTitle>
            <CardDescription>Select data and options to visualize.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Data Table</Label>
              <Select value={table} onValueChange={handleTableChange}>
                <SelectTrigger><SelectValue placeholder="Select Table" /></SelectTrigger>
                <SelectContent>
                  {tables.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue placeholder="Select Metric" /></SelectTrigger>
                <SelectContent>
                  {metricsMap[table].map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Replaced date-range-picker with two date inputs */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.from?.toISOString().split('T')[0] || ''}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.to?.toISOString().split('T')[0] || ''}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="trendline-switch">Add Trendline</Label>
                <p className="text-[0.8rem] text-muted-foreground">Show a linear regression line.</p>
              </div>
              <Switch id="trendline-switch" checked={includeTrend} onCheckedChange={setIncludeTrend} />
            </div>

            <Button onClick={() => setShowSaveDialog(true)} variant="outline" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Graph
            </Button>
          </CardContent>
        </Card>

        {/* --- RIGHT PANEL: GRAPH DISPLAY --- */}
        <Card className="lg:col-span-3 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineIcon className="h-5 w-5 text-primary" />
              {graphTitle}
            </CardTitle>
            <CardDescription>
              Displaying illustrative data for {metricLabel} from the {table} table.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] pr-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={str => format(new Date(str), 'MMM d')} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                  labelFormatter={label => format(new Date(label), 'eeee, MMM d, yyyy')}
                />
                <Legend />
                <Area type="monotone" dataKey={metric} name={metricLabel} stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMetric)" />
                {includeTrend && <Line type="linear" dataKey="trend" name="Trend" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* --- SAVE DIALOG --- */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Graph</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="graph-name">Graph Name</Label>
              <Input id="graph-name" value={saveGraphName} onChange={e => setSaveGraphName(e.target.value)} placeholder="e.g., Q3 Production Line 5 Torque" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder">Assign to Folder</Label>
              <Select onValueChange={setSelectedFolder} defaultValue={selectedFolder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Reports</SelectItem>
                  <SelectItem value="production-line-5">Production Line 5</SelectItem>
                  <SelectItem value="quality-assurance">Quality Assurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={handleSaveGraph}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
