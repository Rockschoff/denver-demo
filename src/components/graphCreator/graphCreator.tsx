/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

const tables = ["CAP_TORQUE", "FILL_WEIGHTS", "TOP_LOAD", "PRESAGE" , "HOLDS" , "CAPA" , "COMPLAINTS"];
const operators = ["=", "!=", ">", "<", ">=", "<=", "LIKE"];
const aggregates = ["SUM", "AVG", "MIN", "MAX", "COUNT" , "NONE"];

type WhereClause = { column: string; operator: string; value: string };
// type SavedGraph = { name: string; data: any[] };

// Merge two datasets on X
function mergeData(d1: any[], d2: any[]) {
  const map = new Map<string, any>();
  d1.forEach(d => {
    map.set(d.X, { X: d.X, Y: d.Y, Y2: null });
  });
  d2.forEach(d => {
    if (map.has(d.X)) map.get(d.X).Y2 = d.Y;
    else map.set(d.X, { X: d.X, Y: null, Y2: d.Y });
  });
  return Array.from(map.values()).sort((a, b) => (a.X < b.X ? -1 : 1));
}

export default function GraphCreator() {
  // Primary
  const [table, setTable] = useState(tables[0]);
  const [columns, setColumns] = useState<string[]>([]);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [aggFunc, setAggFunc] = useState(aggregates[0]);
  const [groupBy, setGroupBy] = useState<string[]>([]);

  // Secondary
  const [useSecondary, setUseSecondary] = useState(false);
  const [table2, setTable2] = useState(tables[0]);
  const [columns2, setColumns2] = useState<string[]>([]);
  const [where2, setWhere2] = useState<WhereClause[]>([]);
  const [x2, setX2] = useState("");
  const [y2, setY2] = useState("");
  const [agg2, setAgg2] = useState(aggregates[0]);
  const [groupBy2, setGroupBy2] = useState<string[]>([]);

  const [data, setData] = useState<any[]>([]);
  const [data2, setData2] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const saved = useGraphStore((s) => s.graphs);
  const addGraph = useGraphStore((s) => s.addGraph);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schema for both
  useEffect(() => {
    async function load(
      colsSetter: any,
      tableName: string,
      setX: any,
      setY: any,
      setW: any,
      setG: any
    ) {
      const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_CATALOG='DENVER_BETA' AND TABLE_SCHEMA='DATA' AND TABLE_NAME='${tableName}'`;
      const res = await executeSnowflakeQuery(sql);
      const cols = res.data.map((r: any) => r.COLUMN_NAME);
      colsSetter(cols);
      setX(cols[0] || "");
      setY(cols[1] || cols[0] || "");
      setW([]);
      setG([]);
    }
    load(setColumns, table, setXColumn, setYColumn, setWhereClauses, setGroupBy);
  }, [table]);

  useEffect(() => {
    if (useSecondary) {
      async function load2() {
        const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_CATALOG='DENVER_BETA' AND TABLE_SCHEMA='DATA' AND TABLE_NAME='${table2}'`;
        const res = await executeSnowflakeQuery(sql);
        const cols = res.data.map((r: any) => r.COLUMN_NAME);
        setColumns2(cols);
        setX2(cols[0] || "");
        setY2(cols[1] || cols[0] || "");
        setWhere2([]);
        setGroupBy2([]);
      }
      load2();
    }
  }, [table2, useSecondary]);

  const addW = (w: WhereClause[], set: any) =>
    set([...w, { column: "", operator: operators[0], value: "" }]);
  const updW = (
    w: WhereClause[],
    set: any,
    idx: number,
    key: keyof WhereClause,
    val: string
  ) => set(w.map((c, i) => (i === idx ? { ...c, [key]: val } : c)));
  const remW = (w: WhereClause[], set: any, idx: number) =>
    set(w.filter((_, i) => i !== idx));
  const toggleG = (cols: string[], set: any, col: string) =>
    set(cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col]);

  const build = (
    t: string,
    xc: string,
    yc: string,
    ag: string,
    gb: string[],
    wh: WhereClause[]
  ) => {
    const sel = `SELECT ${gb[0] || xc} AS X, ${ag!="NONE"?`${ag}(${yc})`:yc} AS Y`;
    const frm = `FROM DENVER_BETA.DATA.${t}`;
    const whr = wh.length
      ? `WHERE ` +
        wh.map(w => `${w.column} ${w.operator} '${w.value}'`).join(" AND ")
      : "";
    const grp = gb.length ? `GROUP BY ${gb.join(",")}` : "";
    return [sel, frm, whr, grp].filter(Boolean).join(" ");
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const q1 = build(table, xColumn, yColumn, aggFunc, groupBy, whereClauses);
      const r1 = await executeSnowflakeQuery(q1);
      const d1 = r1.data.map((r: any) => ({ X: r.X, Y: r.Y }));
      setData(d1);
      if (useSecondary) {
        const q2 = build(table2, x2, y2, agg2, groupBy2, where2);
        const r2 = await executeSnowflakeQuery(q2);
        const d2 = r2.data.map((r: any) => ({ X: r.X, Y: r.Y }));
        setData2(d2);
        setChartData(mergeData(d1, d2));
      } else {
        setChartData(d1.map(d => ({ X: d.X, Y: d.Y })));
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const save = () => {
    if (!chartData.length) return;
    const name = prompt("Save name:");
    if (!name) return;
    addGraph({
      name,
      data: chartData,
      agg1: aggFunc,
      agg2: useSecondary ? agg2 : undefined,
      useSecondary,
    });
  };
  const hasSecondaryInData = (data: SavedGraph["data"]) =>
    data.some(d => d.Y2 !== null && d.Y2 !== undefined);

  return (
    <>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Increased width: span 2 columns on large screens */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Primary Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Table</Label>
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tables.map(t => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>X Column</Label>
            <Select value={xColumn} onValueChange={setXColumn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Y Column</Label>
            <Select value={yColumn} onValueChange={setYColumn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Aggregate</Label>
            <Select value={aggFunc} onValueChange={setAggFunc}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aggregates.map(a => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Group By</Label>
            <div className="p-2 border rounded max-h-24 overflow-auto">
              {columns.map(c => (
                <div key={c} className="flex items-center">
                  <Checkbox
                    checked={groupBy.includes(c)}
                    onCheckedChange={() =>
                      toggleG(groupBy, setGroupBy, c)
                    }
                  />
                  <span>{c}</span>
                </div>
              ))}
            </div>
            <Label>Filters</Label>
            {whereClauses.map((w, i) => (
              <div key={i} className="flex space-x-2">
                <Select
                  value={w.column}
                  onValueChange={v =>
                    updW(whereClauses, setWhereClauses, i, "column", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={w.operator}
                  onValueChange={v =>
                    updW(whereClauses, setWhereClauses, i, "operator", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={w.value}
                  onChange={e =>
                    updW(whereClauses, setWhereClauses, i, "value", e.target.value)
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remW(whereClauses, setWhereClauses, i)}
                >
                  X
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => addW(whereClauses, setWhereClauses)}
            >
              Add
            </Button>
          </CardContent>
        </Card>

        {/* Adjusted to span remaining 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={useSecondary}
              onCheckedChange={checked => setUseSecondary(checked === true)}
            />
            <span>Add Secondary Axis</span>
          </div>
          {useSecondary && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Secondary Query</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Table</Label>
                <Select value={table2} onValueChange={setTable2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>X Column</Label>
                <Select value={x2} onValueChange={setX2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns2.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Y Column</Label>
                <Select value={y2} onValueChange={setY2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns2.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Aggregate</Label>
                <Select value={agg2} onValueChange={setAgg2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aggregates.map(a => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Group By</Label>
                <div className="p-2 border rounded max-h-24 overflow-auto">
                  {columns2.map(c => (
                    <div key={c} className="flex items-center">
                      <Checkbox
                        checked={groupBy2.includes(c)}
                        onCheckedChange={() =>
                          toggleG(groupBy2, setGroupBy2, c)
                        }
                      />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
                <Label>Filters</Label>
                {where2.map((w, i) => (
                  <div key={i} className="flex space-x-2">
                    <Select
                      value={w.column}
                      onValueChange={v =>
                        updW(where2, setWhere2, i, "column", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns2.map(c => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={w.operator}
                      onValueChange={v =>
                        updW(where2, setWhere2, i, "operator", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op} value={op}>
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={w.value}
                      onChange={e =>
                        updW(where2, setWhere2, i, "value", e.target.value)
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remW(where2, setWhere2, i)}
                    >
                      X
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addW(where2, setWhere2)}
                >
                  Add
                </Button>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={run}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Loading..." : "Run Both Queries"}
          </Button>
          <Button
            variant="outline"
            onClick={save}
            disabled={!chartData.length}
            className="w-full"
          >
            Save Combined Graph
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Combined Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="X" xAxisId="primary" />
              {useSecondary && (
                <XAxis dataKey="X" xAxisId="secondary" orientation="top" />
              )}
              <YAxis yAxisId="left" />
              {useSecondary && (
                <YAxis yAxisId="right" orientation="right" />
              )}
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Y"
                name={`Primary (${aggFunc})`}
              />
              {useSecondary && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Y2"
                  name={`Secondary (${agg2})`}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {saved.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Saved Charts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {saved.map((g, idx) => {
              const sec = hasSecondaryInData(g.data);
              return (
                <Card key={idx} className="shadow-lg">
                  <CardHeader>
                    <CardTitle>{g.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={g.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="X" xAxisId="0" />
                        {sec && (
                          <XAxis
                            dataKey="X"
                            xAxisId="1"
                            orientation="top"
                          />
                        )}
                        <YAxis yAxisId="0" />
                        {sec && (
                          <YAxis yAxisId="1" orientation="right" />
                        )}
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="0"
                          type="monotone"
                          dataKey="Y"
                          name="Series 1"
                        />
                        {sec && (
                          <Line
                            yAxisId="1"
                            type="monotone"
                            dataKey="Y2"
                            name="Series 2"
                          />
                        )}
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
