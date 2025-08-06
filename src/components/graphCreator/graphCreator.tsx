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
  Tooltip as UiTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import { type SavedGraph, useGraphStore } from "@/lib/zustandStores";
import { Info, Plus, Trash2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";

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
    const addW = (w: WhereClause[], set: any, cols: string[]) => set([...w, { column: cols[0] || "", operator: operators[0], value: "" }]);
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
        <TooltipProvider>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Primary Query Card */}
                <Card className="lg:col-span-2 shadow-lg">
                    <CardHeader><CardTitle>Primary Query</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { id: "plant", label: "Plant", element: (
                                    <Select key="plant" defaultValue="Denver">
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["Denver", "Temple", "Dallas"].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )},
                                { id: "table", label: "Table", element: (
                                    <Select key="table" value={table} onValueChange={setTable}>
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {tables.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )},
                                { id: "xCol", label: "X Column (Date/Category)", element: (
                                    <Select key="xCol" value={xColumn} onValueChange={setXColumn}>
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>{columns.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                                    </Select>
                                )},
                                { id: "yCol", label: "Y Column (Value)", element: (
                                    <Select key="yCol" value={yColumn} onValueChange={setYColumn}>
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>{columns.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                                    </Select>
                                )},
                                { id: "agg", label: "Aggregate", element: (
                                    <Select key="agg" value={aggFunc} onValueChange={setAggFunc}>
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>{aggregates.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent>
                                    </Select>
                                )},
                            ].map(({ id, label, element }) => (
                                <div key={id} className="flex flex-col space-y-1">
                                    <Label htmlFor={id}>{label}</Label>
                                    {element}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2 pt-2 border-t mt-4">
                            <Label>Analytics</Label>
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
                        {/* Group By */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Group By</Label>
                                <Badge variant="secondary">{groupBy.length} selected</Badge>
                            </div>
                            <ScrollArea className="h-28 rounded border">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2">
                                    {columns.map((c) => (
                                        <label key={`gb1-${c}`} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <Checkbox checked={groupBy.includes(c)} onCheckedChange={() => toggleG(groupBy, setGroupBy, c)} />
                                            <span className="truncate">{c}</span>
                                        </label>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <Separator className="my-4" />
                        {/* Filters */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">Filters <UiTooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Filters are combined with AND.</TooltipContent></UiTooltip></Label>
                                {whereClauses.length > 0 && <Badge variant="outline">{whereClauses.length}</Badge>}
                            </div>
                            <div className="space-y-2 rounded-lg border p-2">
                                {whereClauses.length === 0 ? (<div className="text-sm text-muted-foreground px-1">No filters added.</div>) : (
                                    whereClauses.map((w, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-2">
                                            <Select value={w.column} onValueChange={(v) => updW(whereClauses, setWhereClauses, i, "column", v)}><SelectTrigger className="col-span-5 h-9"><SelectValue placeholder="Column" /></SelectTrigger><SelectContent>{columns.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select>
                                            <Select value={w.operator} onValueChange={(v) => updW(whereClauses, setWhereClauses, i, "operator", v)}><SelectTrigger className="col-span-2 h-9"><SelectValue placeholder="Op" /></SelectTrigger><SelectContent>{operators.map((op) => (<SelectItem key={op} value={op}>{op}</SelectItem>))}</SelectContent></Select>
                                            <Input className="col-span-4 h-9" placeholder="Value" value={w.value} onChange={(e) => updW(whereClauses, setWhereClauses, i, "value", e.target.value)} />
                                            <Button size="icon" variant="ghost" className="col-span-1" onClick={() => remW(whereClauses, setWhereClauses, i)} aria-label="Remove filter"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))
                                )}
                                <div className="pt-1">
                                    <Button size="sm" variant="outline" onClick={() => addW(whereClauses, setWhereClauses, columns)}><Plus className="mr-2 h-4 w-4" /> Add Filter</Button>
                                </div>
                            </div>
                        </div>
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
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {[
                                        { id: "plant", label: "Plant", element: (
                                            <Select key="plant" defaultValue="Denver">
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {["Denver", "Temple", "Dallas"].map(t => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )},
                                        { id: "table2", label: "Table", element: (
                                            <Select key="table2" value={table2} onValueChange={setTable2}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>{tables.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                                            </Select>
                                        )},
                                        { id: "xCol2", label: "X Column (Date/Category)", element: (
                                            <Select key="xCol2" value={x2} onValueChange={setX2}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>{columns2.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                                            </Select>
                                        )},
                                        { id: "yCol2", label: "Y Column (Value)", element: (
                                            <Select key="yCol2" value={y2} onValueChange={setY2}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>{columns2.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                                            </Select>
                                        )},
                                        { id: "agg2", label: "Aggregate", element: (
                                            <Select key="agg2" value={agg2} onValueChange={setAgg2}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>{aggregates.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent>
                                            </Select>
                                        )},
                                    ].map(({ id, label, element }) => (
                                        <div key={id} className="flex flex-col space-y-1">
                                            <Label htmlFor={id}>{label}</Label>
                                            {element}
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2 pt-2 border-t mt-4">
                                    <Label>Analytics</Label>
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
                                {/* Group By */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Group By</Label>
                                        <Badge variant="secondary">{groupBy2.length} selected</Badge>
                                    </div>
                                    <ScrollArea className="h-28 rounded border">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2">
                                            {columns2.map((c) => (
                                                <label key={`gb2-${c}`} className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <Checkbox checked={groupBy2.includes(c)} onCheckedChange={() => toggleG(groupBy2, setGroupBy2, c)} />
                                                    <span className="truncate">{c}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <Separator className="my-4" />
                                {/* Filters */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2">Filters <UiTooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Filters are combined with AND.</TooltipContent></UiTooltip></Label>
                                        {where2.length > 0 && <Badge variant="outline">{where2.length}</Badge>}
                                    </div>
                                    <div className="space-y-2 rounded-lg border p-2">
                                        {where2.length === 0 ? (<div className="text-sm text-muted-foreground px-1">No filters added.</div>) : (
                                            where2.map((w, i) => (
                                                <div key={i} className="grid grid-cols-12 gap-2">
                                                    <Select value={w.column} onValueChange={(v) => updW(where2, setWhere2, i, "column", v)}><SelectTrigger className="col-span-5 h-9"><SelectValue placeholder="Column" /></SelectTrigger><SelectContent>{columns2.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select>
                                                    <Select value={w.operator} onValueChange={(v) => updW(where2, setWhere2, i, "operator", v)}><SelectTrigger className="col-span-2 h-9"><SelectValue placeholder="Op" /></SelectTrigger><SelectContent>{operators.map((op) => (<SelectItem key={op} value={op}>{op}</SelectItem>))}</SelectContent></Select>
                                                    <Input className="col-span-4 h-9" placeholder="Value" value={w.value} onChange={(e) => updW(where2, setWhere2, i, "value", e.target.value)} />
                                                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => remW(where2, setWhere2, i)} aria-label="Remove filter"><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            ))
                                        )}
                                        <div className="pt-1">
                                            <Button size="sm" variant="outline" onClick={() => addW(where2, setWhere2, columns2)}><Plus className="mr-2 h-4 w-4" /> Add Filter</Button>
                                        </div>
                                    </div>
                                </div>
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
                            <RechartsTooltip />
                            <Legend />
                            {/* Primary Series */}
                            <Line yAxisId="left" type="monotone" dataKey="Y" name={`Primary (${yColumn})`} stroke="#8884d8" strokeWidth={2} dot={false} />
                            {showTrendline1 && <Line yAxisId="left" dataKey="Y_Trend" name="Primary Trend" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
                            {maPeriods1.map(p => <Line key={`ma1-line-${p}`} yAxisId="left" type="monotone" dataKey={`Y_MA${p}`} name={`Primary ${p}-Day MA`} stroke={`#${(p*333).toString(16)}66`} dot={false} />)}
                            {/* Secondary Series */}
                            {useSecondary && <Line yAxisId="right" type="monotone" dataKey="Y2" name={`Secondary (${y2})`} stroke="#82ca9d" strokeWidth={2} dot={false} />}
                            {useSecondary && showTrendline2 && <Line yAxisId="right" dataKey="Y2_Trend" name="Secondary Trend" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
                            {useSecondary && maPeriods2.map(p => <Line key={`ma2-line-${p}`} yAxisId="right" type="monotone" dataKey={`Y2_MA${p}`} name={`Secondary ${p}-Day MA`} stroke={`#66${(p*333).toString(16)}`} dot={false} />)}
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
                                                <RechartsTooltip />
                                                <Legend />
                                                {dataKeys.includes('Y') && <Line yAxisId="left" type="monotone" dataKey="Y" name={`Primary (${g.y1Name || g.agg1})`} stroke="#8884d8" dot={false} />}
                                                {dataKeys.includes('Y_Trend') && <Line yAxisId="left" dataKey="Y_Trend" name="Primary Trend" stroke="#8884d8" strokeDasharray="5 5" dot={false} />}
                                                {maOptions.map(p => dataKeys.includes(`Y_MA${p}`) && <Line key={`saved-ma1-${p}`} yAxisId="left" dataKey={`Y_MA${p}`} name={`Primary ${p}-Day MA`} stroke="#e67e22" dot={false} />)}
                                                {dataKeys.includes('Y2') && <Line yAxisId="right" type="monotone" dataKey="Y2" name={`Secondary (${g.y2Name || g.agg2})`} stroke="#82ca9d" dot={false} />}
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
        </TooltipProvider>
    );
}