/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react";
import { executeSnowflakeQuery } from "@/lib/snowflakeClient";
import { format, subDays, addDays, startOfWeek, startOfMonth, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';

// Import ShadCN UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

// Define the type for a single complaint record based on the schema
type Complaint = {
    QPF_ID: string;
    CASE_ID: number;
    PERIOD: number;
    QUANTITY: number;
    RECEIVED_DATE: string; // ISO string format
    CLOSED_CASE_DATE: string;
    STORE: string;
    PRODUCT_TYPE: string;
    BOTTLE_SIZE: string;
    FG_ITEM_CODE: string;
    PRODUCT_DESCRIPTION: string;
    DATE_CODE: string;
    BB_DATE: string;
    MANUFACTURE_DATE: string;
    MFG_TIME: number;
    LINE: string;
    PLANT_LOCATION: string;
    SUBJECT_LEVEL_1: string;
    SUBJECT_LEVEL_2: string;
    SUBJECT_LEVEL_3: string;
    SUBJECT_DESCRIPTION: string;
    VERBATIM: string;
    RESPONSIBLE_REP_: string;
    METHOD: string;
    SOURCE: string;
    STORE_LOCATION: string;
    QA_ALERT_DATE: string;
    QA_INVESTIGATION_NOTES: string;
    CAPA_NUMBER: number;
    PO_NUMBER: string;
};

interface ComplaintDetailsProps {
    complaint: Complaint;
    defaultStartOffset?: number;
    defaultEndOffset?: number;
}

export function ComplaintDetails({
  complaint,
  defaultStartOffset = 4,
  defaultEndOffset = 4,
}: ComplaintDetailsProps) {
  // Configurable offsets
  const [startOffset, setStartOffset] = useState<number>(defaultStartOffset);
  const [endOffset, setEndOffset] = useState<number>(defaultEndOffset);

  // State for formatted date strings
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');

  const [detailsList, setDetailsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { MANUFACTURE_DATE } = complaint;
    if (!MANUFACTURE_DATE) {
      // No manufacture date: clear details and loading
      setDetailsList([]);
      setIsLoading(false);
      setStartDateStr('');
      setEndDateStr('');
      return;
    }

    const manufactureDate = parseISO(MANUFACTURE_DATE);
    // Update formatted strings when offsets or date change
    const newStartStr = format(subDays(manufactureDate, startOffset), 'MMM d, yyyy');
    const newEndStr = format(addDays(manufactureDate, endOffset), 'MMM d, yyyy');
    setStartDateStr(newStartStr);
    setEndDateStr(newEndStr);

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const startDate = format(subDays(manufactureDate, startOffset), 'yyyy-MM-dd');
        const endDate = format(addDays(manufactureDate, endOffset), 'yyyy-MM-dd');

        const queries = {
          presage: `SELECT count(*) as count FROM PRESAGE WHERE RESULT_STATUS != 'ALLOWED' AND DATE BETWEEN '${startDate}' AND '${endDate}'`,
          capTorque: `SELECT count(*) as count FROM CAP_TORQUE WHERE OUTOFSPEC = 'TRUE' AND DATE BETWEEN '${startDate}' AND '${endDate}'`,
          topLoad: `SELECT count(*) as count FROM TOP_LOAD WHERE OUTOFSPEC = 'TRUE' AND DATE BETWEEN '${startDate}' AND '${endDate}'`,
          fillWeights: `SELECT count(*) as count FROM FILL_WEIGHTS WHERE OUTOFSPEC = 'TRUE' AND DATE BETWEEN '${startDate}' AND '${endDate}'`,
          holds: `SELECT count(*) as count FROM HOLDS WHERE CREATED BETWEEN '${startDate}' AND '${endDate}'`,
        };

        const [presageRes, capTorqueRes, topLoadRes, fillWeightsRes, holdsRes] = await Promise.all([
          executeSnowflakeQuery(queries.presage),
          executeSnowflakeQuery(queries.capTorque),
          executeSnowflakeQuery(queries.topLoad),
          executeSnowflakeQuery(queries.fillWeights),
          executeSnowflakeQuery(queries.holds),
        ]);

        const counts = {
          presage: presageRes?.data?.[0]?.COUNT ?? 0,
          capTorque: capTorqueRes?.data?.[0]?.COUNT ?? 0,
          topLoad: topLoadRes?.data?.[0]?.COUNT ?? 0,
          fillWeights: fillWeightsRes?.data?.[0]?.COUNT ?? 0,
          holds: holdsRes?.data?.[0]?.COUNT ?? 0,
        };

        const parts: string[] = [];
        if (counts.presage > 0) parts.push(`${counts.presage} Presage failures`);
        if (counts.capTorque > 0) parts.push(`${counts.capTorque} out-of-spec Cap Torques`);
        if (counts.topLoad > 0) parts.push(`${counts.topLoad} out-of-spec Top Loads`);
        if (counts.fillWeights > 0) parts.push(`${counts.fillWeights} out-of-spec Fill Weights`);
        if (counts.holds > 0) parts.push(`${counts.holds} new Holds`);

        setDetailsList(parts);
      } catch (error) {
        console.error("Failed to fetch complaint details:", error);
        setDetailsList(["Could not load additional details."]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [complaint.MANUFACTURE_DATE, startOffset, endOffset]);

  return (
    <div className="p-4 bg-muted space-y-4">
      {/* Offset Controls */}
      <div className="flex items-center gap-4">
        <label className="flex flex-col text-sm">
          Start Offset (days)
          <Input
            type="number"
            value={startOffset}
            min={0}
            onChange={(e) => setStartOffset(Number(e.target.value))}
            className="w-20"
          />
        </label>
        <label className="flex flex-col text-sm">
          End Offset (days)
          <Input
            type="number"
            value={endOffset}
            min={0}
            onChange={(e) => setEndOffset(Number(e.target.value))}
            className="w-20"
          />
        </label>
      </div>

      {/* Only show summary if manufacture date is present */}
      {complaint.MANUFACTURE_DATE && (
        isLoading ? (
          <Skeleton className="h-4 w-3/4" />
        ) : (
          <div>
            {detailsList.length > 0 ? (
              <>
                <p className="text-sm">Between {startDateStr} and {endDateStr}, the following failures occurred:</p>
                <ul className="list-disc ml-5 text-sm space-y-1">
                  {detailsList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm font-medium">No related operational issues found between {startDateStr} and {endDateStr}.</p>
            )}
          </div>
        )
      )}

      <Collapsible>
        <CollapsibleTrigger className="text-sm font-bold underline">
          Show Full Complaint Details
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-2">
          <ul className="list-disc list-inside text-sm">
            {Object.entries(complaint).map(([key, value]) => (
              <li key={key}>
                <span className="font-semibold">{key}:</span> {String(value)}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}



// --- Main Dashboard Component ---
// ---- Extracted Nested Pie Chart Component ----
// ---- Extracted Nested Pie Chart Component ----
interface NestedPieProps {
  data: Complaint[];
  days: string;
  onDaysChange: (value: string) => void;
  colors: string[];
}

// --- Custom Tooltip Component ---
// A styled tooltip to show details on hover.
const NestedPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const nameParts = data.name.split(' > ');
    const displayName = nameParts[nameParts.length - 1];
    return (
      <div className="bg-white/80 backdrop-blur-sm p-2 border border-gray-300 rounded-lg shadow-lg text-sm">
        <p className="font-bold text-gray-800">{displayName}</p>
        <p className="text-gray-600">{`Complaints: ${data.value}`}</p>
      </div>
    );
  }
  return null;
};


// --- Refactored NestedPieChart Component ---
// This version uses a custom label area at the bottom for better readability.

export function NestedPieChart({ data, days, onDaysChange, colors }: NestedPieProps) {
  // State to hold the data of the currently hovered slice
  const [activeSlice, setActiveSlice] = useState<any>(null);

  // Memoized function to filter data based on the selected date range
  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(days, 10));
    return data.filter(c => parseISO(c.RECEIVED_DATE) >= cutoff);
  }, [data, days]);

  // Memoized function to process the filtered data into a hierarchical structure for the pie charts
  const pieData = useMemo(() => {
    const l1 = new Map<string, number>();
    const l2 = new Map<string, number>();
    const l3 = new Map<string, number>();
    const l4 = new Map<string, number>();

    filtered.forEach(c => {
      if (c.SUBJECT_LEVEL_1) {
        l1.set(c.SUBJECT_LEVEL_1, (l1.get(c.SUBJECT_LEVEL_1) || 0) + 1);
      }
      if (c.SUBJECT_LEVEL_1 && c.SUBJECT_LEVEL_2) {
        const k2 = `${c.SUBJECT_LEVEL_1} > ${c.SUBJECT_LEVEL_2}`;
        l2.set(k2, (l2.get(k2) || 0) + 1);
      }
      if (c.SUBJECT_LEVEL_1 && c.SUBJECT_LEVEL_2 && c.SUBJECT_LEVEL_3) {
        const k3 = `${c.SUBJECT_LEVEL_1} > ${c.SUBJECT_LEVEL_2} > ${c.SUBJECT_LEVEL_3}`;
        l3.set(k3, (l3.get(k3) || 0) + 1);
      }
      if (c.SUBJECT_LEVEL_1 && c.SUBJECT_LEVEL_2 && c.SUBJECT_LEVEL_3 && c.SUBJECT_DESCRIPTION) {
        const k4 = `${c.SUBJECT_LEVEL_1} > ${c.SUBJECT_LEVEL_2} > ${c.SUBJECT_LEVEL_3} > ${c.SUBJECT_DESCRIPTION}`;
        l4.set(k4, (l4.get(k4) || 0) + 1);
      }
    });

    const toArr = (m: Map<string, number>) => Array.from(m, ([name, value]) => ({ name, value }));
    return { data1: toArr(l1), data2: toArr(l2), data3: toArr(l3), data4: toArr(l4) };
  }, [filtered]);

  // Event handler for when the mouse enters a pie slice
  const handleMouseEnter = (data: any) => {
    setActiveSlice(data);
  };

  // Event handler for when the mouse leaves the chart area
  const handleMouseLeave = () => {
    setActiveSlice(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complaint Subject Breakdown</CardTitle>
        <CardDescription>Hierarchical view of complaint subjects (levels 1–4)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Select value={days} onValueChange={onDaysChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Chart Container: Increased height for better spacing */}
        <ResponsiveContainer width="100%" height={350}>
          <PieChart onMouseLeave={handleMouseLeave}>
            <Tooltip content={<NestedPieTooltip />} cursor={{ fill: 'transparent' }} />
            
            {/* Level 1 Pie */}
            <Pie
              data={pieData.data1} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={110} innerRadius={90}
              onMouseEnter={handleMouseEnter}
            >
              {pieData.data1.map((entry, index) => <Cell key={`cell-1-${index}`} fill={colors[index % colors.length]} />)}
            </Pie>
            
            {/* Level 2 Pie */}
            <Pie
              data={pieData.data2} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={85} innerRadius={65}
              onMouseEnter={handleMouseEnter}
            >
              {pieData.data2.map((entry, index) => <Cell key={`cell-2-${index}`} fill={colors[(index + pieData.data1.length) % colors.length]} />)}
            </Pie>

            {/* Level 3 Pie */}
            <Pie
              data={pieData.data3} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={60} innerRadius={40}
              onMouseEnter={handleMouseEnter}
            >
              {pieData.data3.map((entry, index) => <Cell key={`cell-3-${index}`} fill={colors[(index + pieData.data1.length + pieData.data2.length) % colors.length]} />)}
            </Pie>

            {/* Level 4 Pie */}
            <Pie
              data={pieData.data4} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={35} innerRadius={15}
              onMouseEnter={handleMouseEnter}
            >
              {pieData.data4.map((entry, index) => <Cell key={`cell-4-${index}`} fill={colors[(index + pieData.data1.length + pieData.data2.length + pieData.data3.length) % colors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Custom Label Area at the Bottom */}
        <div className="w-full text-center mt-4 h-12 flex items-center justify-center transition-all duration-300">
          {activeSlice ? (
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 border">
              <span
                className="w-4 h-4 rounded-full inline-block border border-gray-300"
                style={{ backgroundColor: activeSlice.fill }}
              />
              <span className="font-semibold text-gray-700 text-sm">
                {activeSlice.name.split(' > ').pop()}
              </span>
              <span className="text-sm text-gray-500">
                ({activeSlice.value} {activeSlice.value === 1 ? 'complaint' : 'complaints'})
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hover over a slice to see details</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

            

// ---- Extracted Trend Bar Chart Component ----
interface TrendBarProps {
  data: Complaint[];
  timeGroup: "day" | "week" | "month";
  onTimeGroupChange: (val: "day"|"week"|"month") => void;
  categoryKey: keyof Complaint;
  onCategoryChange: (key: keyof Complaint) => void;
  colors: string[];
}
export function TrendBarChart({ data, timeGroup, onTimeGroupChange, categoryKey, onCategoryChange, colors }: TrendBarProps) {
  const filtered = useMemo(() => data, [data]);
  const stacked = useMemo(() => {
    interface Entry { date: string; [key:string]: any }
    const map: Record<string, Entry> = {};
    const cats = new Set<string>();
    filtered.forEach(c => {
      const d = parseISO(c.RECEIVED_DATE);
      let key: string;
      if (timeGroup === 'day') key = format(d,'yyyy-MM-dd');
      else if (timeGroup === 'week') key = format(startOfWeek(d),'yyyy-MM-dd');
      else key = format(startOfMonth(d),'yyyy-MM');
      const cat = c[categoryKey] || 'Uncategorized';
      cats.add(JSON.stringify(cat));
      if (!map[key]) map[key] = { date: key };
      map[key][cat] = ((map[key][cat] as number)||0) + 1;
    });
    const arr = Object.values(map).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
    return { data:arr, categories:Array.from(cats) };
  }, [filtered, timeGroup, categoryKey]);

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Complaints Trend</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeGroup} onValueChange={onTimeGroupChange}>
            <SelectTrigger className="w-[100px]"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryKey} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="SUBJECT_LEVEL_1">Subject Level 1</SelectItem>
              <SelectItem value="SUBJECT_LEVEL_2">Subject Level 2</SelectItem>
              <SelectItem value="SUBJECT_LEVEL_3">Subject Level 3</SelectItem>
              <SelectItem value="PLANT_LOCATION">Plant Location</SelectItem>
              <SelectItem value="PRODUCT_TYPE">Product Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stacked.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {stacked.categories.map((cat, i) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={colors[i % colors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
const barColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF80A2'];

// ---- Main Dashboard Component ----
export default function ComplaintsDashboard() {
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [tableDays, setTableDays] = useState<string>("30");
  const [chartDays, setChartDays] = useState<string>("30");
  const [trendTimeGroup, setTrendTimeGroup] = useState<"day"|"week"|"month">("week");
  const [trendStackBy, setTrendStackBy] = useState<keyof Complaint>("SUBJECT_LEVEL_3");

  const colors = barColors;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const resp = await executeSnowflakeQuery("SELECT * FROM DENVER_BETA.DATA.COMPLAINTS ORDER BY RECEIVED_DATE DESC");
        setAllComplaints(resp?.data||[]);
      } catch {
        console.error("Failed to fetch complaints");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTable = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(tableDays,10));
    return allComplaints.filter(c=>parseISO(c.RECEIVED_DATE)>=cutoff);
  },[allComplaints,tableDays]);

  if(isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="p-4 space-y-8">
      {/* Table */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div><CardTitle>Recent Complaints</CardTitle><CardDescription>Complaints within period</CardDescription></div>
          <div className="flex items-center gap-2"><span className="text-sm">Period:</span>
            <Select value={tableDays} onValueChange={setTableDays}><SelectTrigger className="w-[120px]"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="7">Last 7 Days</SelectItem><SelectItem value="30">Last 30 Days</SelectItem><SelectItem value="90">Last 90 Days</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent><Table className="w-full"><TableHeader><TableRow>
          <TableHead>Details</TableHead><TableHead>Received</TableHead><TableHead>Manufactured</TableHead><TableHead>Product</TableHead><TableHead>Plant</TableHead><TableHead>Subject</TableHead><TableHead>Store</TableHead>
        </TableRow></TableHeader>
        <TableBody>{filteredTable.map(c=>(<Collapsible key={c.QPF_ID} asChild><><TableRow><TableCell><CollapsibleTrigger asChild><Button size="sm" variant="outline">More Info</Button></CollapsibleTrigger></TableCell>
          <TableCell>{format(parseISO(c.RECEIVED_DATE),'MMM d, yyyy')}</TableCell><TableCell>{c.MANUFACTURE_DATE?format(parseISO(c.MANUFACTURE_DATE),'MMM d, yyyy'):''}</TableCell><TableCell>{c.PRODUCT_DESCRIPTION}</TableCell><TableCell>{c.PLANT_LOCATION}</TableCell><TableCell>{c.SUBJECT_LEVEL_3}</TableCell><TableCell>{c.STORE_LOCATION}</TableCell></TableRow>
          <CollapsibleContent asChild><tr><TableCell colSpan={7}><ComplaintDetails complaint={c}/></TableCell></tr></CollapsibleContent></></Collapsible>))}</TableBody></Table></CardContent>
      </Card>

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NestedPieChart data={allComplaints} days={chartDays} onDaysChange={setChartDays} colors={colors} />
        <TrendBarChart data={allComplaints} timeGroup={trendTimeGroup} onTimeGroupChange={setTrendTimeGroup} categoryKey={trendStackBy} onCategoryChange={setTrendStackBy} colors={colors} />
      </div>
    </div>
  );
}


// Custom content renderer for Treemap to display labels
// const CustomizedContent = ({ depth, x, y, width, height, index, colors, name }: any) => {
//   return (
//     <g>
//       <rect
//         x={x}
//         y={y}
//         width={width}
//         height={height}
//         style={{
//           fill: depth < 2 ? colors[index % colors.length] : 'none',
//           stroke: '#fff',
//           strokeWidth: 2 / (depth + 1e-10),
//           strokeOpacity: 1 / (depth + 1e-10),
//         }}
//       />
//       {depth === 1 && width > 50 && height > 25 ? (
//         <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
//           {name}
//         </text>
//       ) : null}
//        {depth > 1 && width > 50 && height > 25 ? (
//         <text x={x + 4} y={y + 18} fill="rgba(0,0,0,0.7)" fontSize={12} fillOpacity={0.9}>
//           {name}
//         </text>
//       ) : null}
//     </g>
//   );
// };