/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { executeSnowflakeQuery } from "@/lib/snowflakeClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import { type SavedGraph, useGraphStore } from "@/lib/zustandStores";

// --- CONSTANTS ---
const tables = ["CAP_TORQUE", "FILL_WEIGHTS", "TOP_LOAD", "PRESAGE" , "HOLDS" , "CAPA" , "COMPLAINTS"];
const operators = ["=", "!=", ">", "<", ">=", "<=", "LIKE"];
const aggregates = ["SUM", "AVG", "MIN", "MAX", "COUNT", "NONE"];
const maOptions = [3, 7, 15];

// --- TYPE DEFINITIONS ---
type WhereClause = { column: string; operator: string; value: string };

// --- HELPER FUNCTIONS ---

/**
 * Adds a linear regression trendline to a dataset.
 * @param data The input data array, expected to be sorted by X.
 * @param yKey The key for the Y-values (e.g., 'Y').
 * @returns A new array with trendline data added.
 */
function addTrendline(data: any[], yKey: string): any[] {
  const trendKey = `${yKey}_Trend`;
  
  // Create points for regression, converting X to numeric values (timestamps for dates).
  const points = data
    .map(d => ({
      x: new Date(d.X).getTime(),
      y: parseFloat(d[yKey]),
      original: d,
    }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y));

  if (points.length < 2) return data; // Not enough data for a trendline.

  // Calculate sums for linear regression formula
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  });

  const n = points.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  if (isNaN(slope) || isNaN(intercept)) return data; // Invalid calculation

  // Add the calculated trend value to each data point.
  return data.map(d => {
      const xVal = new Date(d.X).getTime();
      if(isNaN(xVal)) return d;
      return {
        ...d,
        [trendKey]: slope * xVal + intercept,
      };
  });
}

/**
 * Adds a moving average to a dataset.
 * @param data The input data array, expected to be sorted by X.
 * @param yKey The key for the Y-values (e.g., 'Y').
 * @param period The moving average period (e.g., 3, 7).
 * @returns A new array with moving average data added.
 */
function addMovingAverage(data: any[], yKey: string, period: number): any[] {
  const maKey = `${yKey}_MA${period}`;
  if (period <= 0 || data.length < period) return data;

  return data.map((d, i, arr) => {
    if (i < period - 1) {
      return { ...d, [maKey]: null }; // Not enough data points yet
    }
    const slice = arr.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + (parseFloat(val[yKey]) || 0), 0);
    const avg = sum / period;
    return { ...d, [maKey]: isNaN(avg) ? null : avg };
  });
}

/**
 * Merges two datasets on the 'X' key, renaming keys from the second dataset.
 * @param d1 Primary dataset.
 * @param d2 Secondary dataset.
 * @returns A single merged and sorted array for charting.
 */
function mergeData(d1: any[], d2: any[]): any[] {
  const map = new Map<string, any>();

  // Add all data from the primary dataset.
  d1.forEach(item => map.set(item.X, { ...item }));

  // Add or merge data from the secondary dataset.
  d2.forEach(item_d2 => {
    const existing = map.get(item_d2.X) || { X: item_d2.X };
    const mergedItem = { ...existing };
    
    // Rename keys from d2 by replacing 'Y' with 'Y2' (e.g., Y -> Y2, Y_Trend -> Y2_Trend).
    for (const key in item_d2) {
      if (key !== 'X') {
        const newKey = key.replace('Y', 'Y2');
        mergedItem[newKey] = item_d2[key];
      }
    }
    map.set(item_d2.X, mergedItem);
  });
  
  // Return a sorted array of the merged data.
  return Array.from(map.values()).sort((a, b) => new Date(a.X).getTime() - new Date(b.X).getTime());
}

// --- COMPONENT ---
export default function GraphCreator() {
  // --- STATE MANAGEMENT ---
  // Primary Query State
  const [table, setTable] = useState(tables[0]);
  const [columns, setColumns] = useState<string[]>([]);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [aggFunc, setAggFunc] = useState(aggregates[0]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [showTrendline1, setShowTrendline1] = useState(false);
  const [maPeriods1, setMaPeriods1] = useState<number[]>([]);

  // Secondary Query State
  const [useSecondary, setUseSecondary] = useState(false);
  const [table2, setTable2] = useState(tables[0]);
  const [columns2, setColumns2] = useState<string[]>([]);
  const [where2, setWhere2] = useState<WhereClause[]>([]);
  const [x2, setX2] = useState("");
  const [y2, setY2] = useState("");
  const [agg2, setAgg2] = useState(aggregates[0]);
  const [groupBy2, setGroupBy2] = useState<string[]>([]);
  const [showTrendline2, setShowTrendline2] = useState(false);
  const [maPeriods2, setMaPeriods2] = useState<number[]>([]);
  
  // Chart and Data State
  const [chartData, setChartData] = useState<any[]>([]);
  const { graphs: saved, addGraph } = useGraphStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING & PROCESSING ---

  // Effect to load column schema for the primary table
  useEffect(() => {
    async function loadSchema() {
      const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_CATALOG='DENVER_BETA' AND TABLE_SCHEMA='DATA' AND TABLE_NAME='${table}'`;
      try {
        const res = await executeSnowflakeQuery(sql);
        const cols = res.data.map((r: any) => r.COLUMN_NAME);
        setColumns(cols);
        setXColumn(cols.find(c => c.toUpperCase().includes("DATE")) || cols[0] || "");
        setYColumn(cols[1] || cols[0] || "");
        setWhereClauses([]);
        setGroupBy([]);
      } catch (e: any) {
        setError("Failed to load table schema: " + e.message);
      }
    }
    loadSchema();
  }, [table]);

  // Effect to load column schema for the secondary table
  useEffect(() => {
    if (useSecondary) {
      async function loadSchema2() {
        const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_CATALOG='DENVER_BETA' AND TABLE_SCHEMA='DATA' AND TABLE_NAME='${table2}'`;
        try {
          const res = await executeSnowflakeQuery(sql);
          const cols = res.data.map((r: any) => r.COLUMN_NAME);
          setColumns2(cols);
          setX2(cols.find(c => c.toUpperCase().includes("DATE")) || cols[0] || "");
          setY2(cols[1] || cols[0] || "");
          setWhere2([]);
          setGroupBy2([]);
        } catch (e: any) {
            setError("Failed to load secondary table schema: " + e.message);
        }
      }
      loadSchema2();
    }
  }, [table2, useSecondary]);

  // --- UI HANDLERS ---
  const addW = (w: WhereClause[], set: any) => set([...w, { column: columns[0] || "", operator: operators[0], value: "" }]);
  const updW = (w: WhereClause[], set: any, idx: number, key: keyof WhereClause, val: string) => set(w.map((c, i) => (i === idx ? { ...c, [key]: val } : c)));
  const remW = (w: WhereClause[], set: any, idx: number) => set(w.filter((_, i) => i !== idx));
  const toggleG = (cols: string[], set: any, col: string) => set(cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col]);
  const toggleMaPeriod = (period: number, periods: number[], setPeriods: React.Dispatch<React.SetStateAction<number[]>>) => {
    setPeriods(prev => prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]);
  };

  // --- CORE LOGIC ---
  const buildQuery = (t: string, xc: string, yc: string, ag: string, gb: string[], wh: WhereClause[]) => {
    const selectCol = gb.length > 0 ? gb.join(', ') : xc;
    const yAgg = ag !== "NONE" ? `${ag}(${yc})` : yc;
    const sel = `SELECT ${selectCol} AS X, ${yAgg} AS Y`;
    const frm = `FROM DENVER_BETA.DATA.${t}`;
    const whr = wh.length ? `WHERE ` + wh.map(w => `${w.column} ${w.operator} '${w.value}'`).join(" AND ") : "";
    const grp = gb.length ? `GROUP BY ${gb.join(",")}` : "";
    const ord = `ORDER BY X`;
    return [sel, frm, whr, grp, ord].filter(Boolean).join(" ");
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      // --- Primary Query Execution and Processing ---
      const q1 = buildQuery(table, xColumn, yColumn, aggFunc, groupBy, whereClauses);
      const r1 = await executeSnowflakeQuery(q1);
      let d1 = r1.data.map((r: any) => ({ X: r.X, Y: r.Y }))
          .sort((a, b) => new Date(a.X).getTime() - new Date(b.X).getTime());

      if (showTrendline1) d1 = addTrendline(d1, 'Y');
      for (const period of maPeriods1) d1 = addMovingAverage(d1, 'Y', period);

      // --- Secondary Query Execution and Processing ---
      if (useSecondary) {
        const q2 = buildQuery(table2, x2, y2, agg2, groupBy2, where2);
        const r2 = await executeSnowflakeQuery(q2);
        let d2 = r2.data.map((r: any) => ({ X: r.X, Y: r.Y }))
            .sort((a, b) => new Date(a.X).getTime() - new Date(b.X).getTime());

        if (showTrendline2) d2 = addTrendline(d2, 'Y');
        for (const period of maPeriods2) d2 = addMovingAverage(d2, 'Y', period);
        
        setChartData(mergeData(d1, d2));
      } else {
        setChartData(d1);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const save = () => {
    if (!chartData.length) return;
    const name = prompt("Enter a name for this graph:");
    if (!name) return;
    
    // The chartData object already contains all the processed data,
    // including columns for trendlines and moving averages. We save this
    // directly so the SavedCharts component doesn't need to re-calculate anything.
    addGraph({
      name,
      data: chartData,
      agg1: aggFunc,
      agg2: useSecondary ? agg2 : undefined,
      y1Name: yColumn, // Pass the column name for a better legend
      y2Name: useSecondary ? y2 : undefined,
      useSecondary,
    });
  };

  const hasSecondaryInData = (data: SavedGraph["data"]) => data.some(d => d.Y2 !== null && d.Y2 !== undefined);

  // --- RENDER ---
  return (
    <>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Primary Query Card */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader><CardTitle>Primary Query</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Label>Table</Label>
            <Select value={table} onValueChange={setTable}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Label>X Column (Date/Category)</Label>
            <Select value={xColumn} onValueChange={setXColumn}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Label>Y Column (Value)</Label>
            <Select value={yColumn} onValueChange={setYColumn}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Label>Aggregate</Label>
            <Select value={aggFunc} onValueChange={setAggFunc}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{aggregates.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            
            <div className="space-y-2 pt-2 border-t mt-4">
                <Label>Analysis Options</Label>
                <div className="flex items-center space-x-2">
                    <Checkbox id="trend1" checked={showTrendline1} onCheckedChange={(c) => setShowTrendline1(c === true)} />
                    <Label htmlFor="trend1">Show Trendline</Label>
                </div>
                <div className="flex space-x-4 items-center">
                    <Label>Moving Averages:</Label>
                    {maOptions.map(p => (
                        <div key={`ma1-${p}`} className="flex items-center space-x-2">
                            <Checkbox id={`ma1-${p}`} checked={maPeriods1.includes(p)} onCheckedChange={() => toggleMaPeriod(p, maPeriods1, setMaPeriods1)} />
                            <Label htmlFor={`ma1-${p}`}>{p}-Day</Label>
                        </div>
                    ))}
                </div>
            </div>

            <Label>Group By</Label>
            <div className="p-2 border rounded max-h-24 overflow-auto">{columns.map(c => (<div key={c} className="flex items-center space-x-2"><Checkbox checked={groupBy.includes(c)} onCheckedChange={() => toggleG(groupBy, setGroupBy, c)} /><span>{c}</span></div>))}</div>
            <Label>Filters</Label>
            {whereClauses.map((w, i) => (<div key={i} className="flex space-x-2 items-center"><Select value={w.column} onValueChange={v => updW(whereClauses, setWhereClauses, i, "column", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Select value={w.operator} onValueChange={v => updW(whereClauses, setWhereClauses, i, "operator", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select><Input placeholder="Value" value={w.value} onChange={e => updW(whereClauses, setWhereClauses, i, "value", e.target.value)} /><Button size="sm" variant="destructive" onClick={() => remW(whereClauses, setWhereClauses, i)}>X</Button></div>))}
            <Button size="sm" variant="outline" onClick={() => addW(whereClauses, setWhereClauses)}>Add Filter</Button>
          </CardContent>
        </Card>

        {/* Secondary Query and Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Checkbox id="useSecondary" checked={useSecondary} onCheckedChange={checked => setUseSecondary(checked === true)} />
            <Label htmlFor="useSecondary" className="text-lg">Add Secondary Y-Axis</Label>
          </div>
          {useSecondary && (
            <Card className="shadow-lg">
              <CardHeader><CardTitle>Secondary Query</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Label>Table</Label>
                <Select value={table2} onValueChange={setTable2}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                <Label>X Column (Date/Category)</Label>
                <Select value={x2} onValueChange={setX2}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns2.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Label>Y Column (Value)</Label>
                <Select value={y2} onValueChange={setY2}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns2.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Label>Aggregate</Label>
                <Select value={agg2} onValueChange={setAgg2}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{aggregates.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                
                <div className="space-y-2 pt-2 border-t mt-4">
                    <Label>Analysis Options</Label>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="trend2" checked={showTrendline2} onCheckedChange={(c) => setShowTrendline2(c === true)} />
                        <Label htmlFor="trend2">Show Trendline</Label>
                    </div>
                    <div className="flex space-x-4 items-center">
                        <Label>Moving Averages:</Label>
                        {maOptions.map(p => (
                            <div key={`ma2-${p}`} className="flex items-center space-x-2">
                                <Checkbox id={`ma2-${p}`} checked={maPeriods2.includes(p)} onCheckedChange={() => toggleMaPeriod(p, maPeriods2, setMaPeriods2)} />
                                <Label htmlFor={`ma2-${p}`}>{p}-Day</Label>
                            </div>
                        ))}
                    </div>
                </div>

                <Label>Group By</Label>
                <div className="p-2 border rounded max-h-24 overflow-auto">{columns2.map(c => (<div key={c} className="flex items-center space-x-2"><Checkbox checked={groupBy2.includes(c)} onCheckedChange={() => toggleG(groupBy2, setGroupBy2, c)} /><span>{c}</span></div>))}</div>
                <Label>Filters</Label>
                {where2.map((w, i) => (<div key={i} className="flex space-x-2 items-center"><Select value={w.column} onValueChange={v => updW(where2, setWhere2, i, "column", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns2.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Select value={w.operator} onValueChange={v => updW(where2, setWhere2, i, "operator", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select><Input placeholder="Value" value={w.value} onChange={e => updW(where2, setWhere2, i, "value", e.target.value)} /><Button size="sm" variant="destructive" onClick={() => remW(where2, setWhere2, i)}>X</Button></div>))}
                <Button size="sm" variant="outline" onClick={() => addW(where2, setWhere2)}>Add Filter</Button>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
          <Button onClick={run} disabled={loading} className="w-full text-lg py-6">
            {loading ? "Loading..." : "Generate Graph"}
          </Button>
          <Button variant="outline" onClick={save} disabled={!chartData.length || loading} className="w-full">
            Save Graph to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Chart Display */}
      <Card className="m-4">
        <CardHeader><CardTitle>Combined Chart</CardTitle></CardHeader>
        <CardContent className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="X" allowDuplicatedCategory={false} />
              <YAxis yAxisId="left" />
              {useSecondary && <YAxis yAxisId="right" orientation="right" />}
              <Tooltip />
              <Legend />
              {/* Primary Series */}
              <Line yAxisId="left" type="monotone" dataKey="Y" name={`Primary (${yColumn})`} stroke="#8884d8" strokeWidth={2} />
              {showTrendline1 && <Line yAxisId="left" dataKey="Y_Trend" name="Primary Trend" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
              {maPeriods1.map(p => <Line key={`ma1-line-${p}`} yAxisId="left" type="monotone" dataKey={`Y_MA${p}`} name={`Primary ${p}-Day MA`} stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} dot={false} />)}
              
              {/* Secondary Series */}
              {useSecondary && <Line yAxisId="right" type="monotone" dataKey="Y2" name={`Secondary (${y2})`} stroke="#82ca9d" strokeWidth={2} />}
              {useSecondary && showTrendline2 && <Line yAxisId="right" dataKey="Y2_Trend" name="Secondary Trend" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
              {useSecondary && maPeriods2.map(p => <Line key={`ma2-line-${p}`} yAxisId="right" type="monotone" dataKey={`Y2_MA${p}`} name={`Secondary ${p}-Day MA`} stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} dot={false} />)}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Saved Charts Display */}
      {saved.length > 0 && (
        <div className="p-4">
          <h2 className="text-2xl font-semibold mb-4">Saved Charts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {saved.map((g, idx) => {
              const sec = hasSecondaryInData(g.data);
              const dataKeys = g.data.length > 0 ? Object.keys(g.data[0]) : [];
              return (
                <Card key={idx} className="shadow-lg">
                  <CardHeader><CardTitle>{g.name}</CardTitle></CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={g.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="X" />
                        <YAxis yAxisId="left" />
                        {sec && <YAxis yAxisId="right" orientation="right" />}
                        <Tooltip />
                        <Legend />
                        {dataKeys.includes('Y') && <Line yAxisId="left" type="monotone" dataKey="Y" name={`Primary (${g.agg1})`} stroke="#8884d8" />}
                        {dataKeys.includes('Y_Trend') && <Line yAxisId="left" dataKey="Y_Trend" name="Primary Trend" stroke="#8884d8" strokeDasharray="5 5" dot={false} />}
                        {maOptions.map(p => dataKeys.includes(`Y_MA${p}`) && <Line key={`saved-ma1-${p}`} yAxisId="left" dataKey={`Y_MA${p}`} name={`Primary ${p}-Day MA`} stroke="#e67e22" dot={false} />)}

                        {dataKeys.includes('Y2') && <Line yAxisId="right" type="monotone" dataKey="Y2" name={`Secondary (${g.agg2})`} stroke="#82ca9d" />}
                        {dataKeys.includes('Y2_Trend') && <Line yAxisId="right" dataKey="Y2_Trend" name="Secondary Trend" stroke="#82ca9d" strokeDasharray="5 5" dot={false} />}
                        {maOptions.map(p => dataKeys.includes(`Y2_MA${p}`) && <Line key={`saved-ma2-${p}`} yAxisId="right" dataKey={`Y2_MA${p}`} name={`Secondary ${p}-Day MA`} stroke="#2ecc71" dot={false} />)}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}