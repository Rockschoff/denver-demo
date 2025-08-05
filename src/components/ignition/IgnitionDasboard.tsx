/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


// IgnitionDashboadr
/*
Ignition Dashboard:

This component will be amde using the shad cn ui and the graphs will be made using the recarts library

All ELements should be arranges in a responseive grid wherever possible

this dshabord will have two section sections
1. DailyInsightsInsightes (Described here)
2. Form filter + Graphs section (Will be implmeneted later)

DailyInsightsSection will be made in the followiing way

Note : There 5 tables in snowflake that describe ignition,
1. CASE_PACKER_QA 2. TOP_LOAD 3. FILL_WEIGHTS 4. CAP_TORQUE 5. FORCE_TO_LOAD

DailyInsights section will have state that is called numLookBackDays this paramter will be used in the queries

First we will have a table that llooks like this
	DEN 1		DEN 2A		DEN 2B	                     #Process Number
	Average	#OOS	Average	#OOS	Average	#OOS         # Average and OOS under each process
Cap Torque						
Fill Weight						
Top Load						

For finding average and OOS under each system

top_load : SELECT
  SPLIT_PART(PROCESS, ' ', 1) AS ProcessGroup,
  AVG(TOPLOAD) AS Average,
  SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "#OOS"
FROM TOP_LOAD
WHERE DATE < now()-{LOOKBACK}
GROUP BY ProcessGroup;

fill weight : SELECT
  SPLIT_PART(PROCESS, ' ', 1) AS ProcessGroup,
  AVG(FILLWEIGHT) AS Average,
  SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "#OOS"
FROM FILL_WEIGHTS
WHERE DATE < now()-{LOOKBACK}
GROUP BY ProcessGroup;

cap torque : SELECT
  SPLIT_PART(PROCESS, ' ', 1) AS ProcessGroup,
  AVG(CAPTORQUE) AS Average,
  SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "#OOS"
FROM CAP_TORQUE
WHERE DATE < now()-{LOOKBACK}
GROUP BY ProcessGroup;

when you click on any of cells it opens up another table at the bottom with the query select * from {system} WHERE DATE < now()-{LOOKBACK} , this table should be filterable and below this table you will see 2 multi line time serires graph number of the #OOS each day and average value each day in each porcess with the query SELECT SPLIT_PART(PROCESS, ' ', 1) AS ProcessGroup, SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "#OOS", SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "#OOS", AVG({value}) AS Average, from {system} , Date WHERE DATE < now()-{LOOKBACK} ,
the two multi line time seirec graphs will be intercative and function to group by day , month , year,  and will also have the ability to set the start and end date for visulozations 



*/

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  Table as TanstackTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// This is a placeholder for your actual Snowflake client function.
// It's now assumed to return a promise that resolves to an object like { data: [...] }.
import { executeSnowflakeQuery } from "@/lib/snowflakeClient";


// --- TYPE DEFINITIONS ---

// The expected response shape from the Snowflake client
interface SnowflakeResponse<T> {
  data: T[];
}

// Configuration for each system/metric
interface SystemConfig {
  table: string;
  valueCol: string;
}

// Result from the initial summary query
interface SummaryQueryResult {
  ProcessGroup: string;
  Average: number;
  "#OOS": number;
}

// The main data structure for the summary table
interface SummaryData {
  [system: string]: {
    [processGroup: string]: {
      Average: number;
      "#OOS": number;
    };
  };
}

// State for the currently clicked cell in the summary table
interface SelectedCell {
  system: string;
  metric: 'Average' | '#OOS';
  process: string;
}

// Represents a generic row from a `SELECT *` query
type RawDataRow = Record<string, any>;

// Result from the time series query for the graphs
// interface TimeSeriesQueryResult {
//     day: string; // Should be a date string like '2023-10-27T00:00:00.000Z'
//     ProcessGroup: string;
//     oos_count: number;
//     average_value: number;
// }

// Data format required by Recharts for multi-line charts
interface TimeSeriesData {
  date: string; // Formatted date string e.g., "2023-10-27"
  [processGroup: string]: number | string; // e.g., "DEN 1": 12.34
}

// --- CONSTANTS ---

const SYSTEMS: Record<string, SystemConfig> = {
    "Cap Torque": { table: "CAP_TORQUE", valueCol: "CAPTORQUE" },
    "Fill Weight": { table: "FILL_WEIGHTS", valueCol: "FILLWEIGHT" },
    "Top Load": { table: "TOP_LOAD", valueCol: "TOPLOAD" },
};


// --- MAIN DASHBOARD COMPONENT ---

export default function IgnitionDashboard() {
  const [numLookBackDays, setNumLookBackDays] = useState<number>(30);
  const [summaryData, setSummaryData] = useState<SummaryData>({});
  const [processGroups, setProcessGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const queries = Object.entries(SYSTEMS).map(([systemName, config]) => {
          const query = `
            SELECT
              SPLIT_PART(PROCESS, ' ', 1) AS "ProcessGroup",
              AVG(${config.valueCol}) AS "Average",
              SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "#OOS"
            FROM ${config.table}
            WHERE DATE > DATEADD('day', -${numLookBackDays}, CURRENT_TIMESTAMP())
            GROUP BY "ProcessGroup";
          `;
          const promise = executeSnowflakeQuery(query) as Promise<SnowflakeResponse<SummaryQueryResult>>;
          return promise.then(response => ({ systemName, data: response.data }));
        });

        const results = await Promise.all(queries);
        const transformedData: SummaryData = {};
        const allProcessGroups = new Set<string>();

        results.forEach(({ systemName, data }) => {
          transformedData[systemName] = {};
          
          // --- FIX IS HERE ---
          // Check if `data` is an array (it now comes pre-unwrapped from the promise)
          if (Array.isArray(data)) {
            data.forEach((row) => {
              const processGroup = row.ProcessGroup;
              allProcessGroups.add(processGroup);
              transformedData[systemName][processGroup] = {
                "Average": parseFloat(row.Average.toFixed(2)),
                "#OOS": row["#OOS"],
              };
            });
          } else {
            console.warn(`Data for system "${systemName}" was not an array:`, data);
          }
        });
        
        setSummaryData(transformedData);
        setProcessGroups(Array.from(allProcessGroups).sort());

      } catch (err) {
        console.error("Error fetching summary data:", err);
        setError("Failed to load dashboard data. Please check the connection and queries.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, [numLookBackDays]);

  const handleCellClick = (system: string, process: string, metric: 'Average' | '#OOS') => {
    setSelectedCell({ system, process, metric });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Ignition</h1>
      
      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <CardTitle>Daily Insights</CardTitle>
              <CardDescription>
                Summary of key metrics over the last {numLookBackDays} days.
              </CardDescription>
            </div>
            <div className="w-48">
               <Select onValueChange={(value) => setNumLookBackDays(Number(value))} defaultValue={String(numLookBackDays)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Set lookback period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading data...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <SummaryTable 
              data={summaryData} 
              processGroups={processGroups}
              onCellClick={handleCellClick}
            />
          )}
        </CardContent>
      </Card>
      
      {selectedCell && (
        <DetailedView
          key={`${selectedCell.system}-${selectedCell.process}`}
          systemConfig={SYSTEMS[selectedCell.system]}
          systemName={selectedCell.system}
          lookbackDays={numLookBackDays}
        />
      )}
    </div>
  );
}


// --- SUB-COMPONENTS ---

/**
 * Summary Table Component
 */
interface SummaryTableProps {
  data: SummaryData;
  processGroups: string[];
  onCellClick: (system: string, process: string, metric: 'Average' | '#OOS') => void;
}

const SummaryTable: React.FC<SummaryTableProps> = ({ data, processGroups, onCellClick }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px] sticky left-0 bg-background">Metric</TableHead>
          {processGroups.map(group => (
            <TableHead key={group} colSpan={2} className="text-center">{group}</TableHead>
          ))}
        </TableRow>
        <TableRow>
          <TableHead className="sticky left-0 bg-background"></TableHead>
          {processGroups.map(group => (
            <React.Fragment key={group}>
              <TableHead className="text-center">Average</TableHead>
              <TableHead className="text-center">#OOS</TableHead>
            </React.Fragment>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(data).map(([system, processes]) => (
          <TableRow key={system}>
            <TableCell className="font-medium sticky left-0 bg-background">{system}</TableCell>
            {processGroups.map(group => (
              <React.Fragment key={`${system}-${group}`}>
                <TableCell 
                  className="text-center cursor-pointer hover:bg-muted"
                  onClick={() => onCellClick(system, group, 'Average')}
                >
                  {processes[group]?.Average ?? 'N/A'}
                </TableCell>
                <TableCell 
                  className="text-center cursor-pointer hover:bg-muted"
                  onClick={() => onCellClick(system, group, '#OOS')}
                >
                  {processes[group]?.['#OOS'] ?? 'N/A'}
                </TableCell>
              </React.Fragment>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

/**
 * Detailed View Component
 */

interface DetailedViewProps {
  systemConfig: SystemConfig;
  systemName: string;
  lookbackDays: number;
}

const DetailedView: React.FC<DetailedViewProps> = ({ systemConfig, systemName, lookbackDays }) => {
  // --- STATE FOR RAW TABLE DATA (UNCHANGED) ---
  const [rawData, setRawData] = useState<RawDataRow[]>([]);
  const [visibleRowCount, setVisibleRowCount] = useState<number>(100);

  // --- STATE FOR CHARTS & FILTERS ---
  const [timeSeriesData, setTimeSeriesData] = useState<{ oos: TimeSeriesData[], average: TimeSeriesData[] }>({ oos: [], average: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'Day' | 'Week' | 'Month'|'None'>('Day');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // --- MODIFIED STATE ---
  const [splitBy, setSplitBy] = useState<'ProcessGroup' | 'PART' | 'Process & Part'>('ProcessGroup');
  const [splitOptions, setSplitOptions] = useState<readonly string[]>([]);
  const [selectedSplits, setSelectedSplits] = useState<string[]>([]);

  // Derived state for the data that is actually passed to the table
  const visibleData = useMemo(() => rawData.slice(0, visibleRowCount), [rawData, visibleRowCount]);

//   useEffect(() => {
//     setSplitOptions([]);
//     setSelectedSplits([]);
//   }, [splitBy]);


  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(splitBy)
        // --- SQL QUERY (No changes needed here, just the alias fix from before) ---
        let dateFilter = `DATE > DATEADD('day', -${lookbackDays}, CURRENT_TIMESTAMP())`;
        if (dateRange?.from) {
          dateFilter = `DATE >= '${format(dateRange.from, "yyyy-MM-dd")}'`;
        }
        if (dateRange?.to) {
          dateFilter += ` AND DATE <= '${format(dateRange.to, "yyyy-MM-dd")}'`;
        }

        const timeSeriesQuery = `
          SELECT
            ${groupBy=="None"?`DATE`:`DATE_TRUNC('${groupBy.toUpperCase()}', DATE)`} AS "date_group",
            SPLIT_PART(PROCESS, ' ', 1) AS "ProcessGroup",
            PART,
            SUM(CASE WHEN OUTOFSPEC = TRUE THEN 1 ELSE 0 END) AS "oos_count",
            AVG(${systemConfig.valueCol}) AS "average_value"
          FROM ${systemConfig.table}
          WHERE ${dateFilter}
          GROUP BY "date_group", "ProcessGroup", PART
          ORDER BY "date_group" ASC;
        `;

        if (rawData.length === 0) {
            const rawDataQuery = `SELECT * FROM ${systemConfig.table} WHERE DATE > DATEADD('day', -${lookbackDays}, CURRENT_TIMESTAMP());`;
            const rawResult = await (executeSnowflakeQuery(rawDataQuery) as Promise<SnowflakeResponse<RawDataRow>>);
            setRawData(Array.isArray(rawResult?.data) ? rawResult.data : []);
        }

        const timeSeriesResult = await (executeSnowflakeQuery(timeSeriesQuery) as Promise<SnowflakeResponse<any>>);
        const timeSeriesResultArray = Array.isArray(timeSeriesResult?.data) ? timeSeriesResult.data : [];

        // --- UPDATE PIVOT LOGIC ---
        const pivotData = (data: any[], valueKey: 'oos_count' | 'average_value'): TimeSeriesData[] => {
            const allSplits = new Set<string>();
            const accumulator: Record<string, TimeSeriesData> = data.reduce((acc, curr) => {
              const date = groupBy === 'None'
                ? format(new Date(curr.date_group), "yyyy-MM-dd HH:mm:ss")
                : format(new Date(curr.date_group), "yyyy-MM-dd");

              // --- UPDATED SPLIT KEY LOGIC ---
              let splitKey: string;
              switch (splitBy) {
                case 'PART':
                  splitKey = curr.PART;
                  break;
                case 'Process & Part':
                  splitKey = `${curr.ProcessGroup}_${curr.PART}`;
                  break;
                case 'ProcessGroup':
                default:
                  splitKey = curr.ProcessGroup;
                  break;
              }
              

              allSplits.add(splitKey);
              
              if (!acc[date]) acc[date] = { date };
              acc[date][splitKey] = curr[valueKey];
              
              
              return acc;
            }, {} as Record<string, TimeSeriesData>);
            // This logic now works correctly because we reset splitOptions when splitBy changes.
            if (splitOptions.length === 0 && allSplits.size > 0) {
              const sortedOptions = Array.from(allSplits).sort();
              setSplitOptions(sortedOptions);
              setSelectedSplits(sortedOptions.slice(0, 5)); // Auto-select first 5
            }
            return Object.values(accumulator);
        };

        setTimeSeriesData({
          oos: pivotData(timeSeriesResultArray, 'oos_count'),
          average: pivotData(timeSeriesResultArray, 'average_value'),
        });
        console.log("timeSeriesData" , timeSeriesData )
        

      } catch (err) {
        console.error(`Error fetching details for ${systemName}:`, err);
        setError(`Failed to load details for ${systemName}.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [systemConfig, lookbackDays, groupBy, dateRange, splitBy]); // --- ADD splitBy TO DEPENDENCIES ---



  // Memoized filtering of chart data based on multi-select
//   const filteredChartData = useMemo(() => {
//     if (selectedSplits.length === 0) {
//       return { oos: [], average: [] };
//     }
//     const filterFunc = (data: TimeSeriesData[]) => data.map(row => {
//       const newRow: TimeSeriesData = { date: row.date };
//       selectedSplits.forEach(split => {
//         if (row[split] !== undefined) {
//           newRow[split] = row[split];
//         }
//       });
//       return newRow;
//     });
//     return {
//       oos: filterFunc(timeSeriesData.oos),
//       average: filterFunc(timeSeriesData.average),
//     };
//   }, [timeSeriesData, selectedSplits]);


  const columns = useMemo<ColumnDef<RawDataRow>[]>(() => {
    if (visibleData.length === 0) return [];
    return Object.keys(visibleData[0]).map(key => ({
      accessorKey: key,
      header: key,
    }));
  }, [visibleData]);

  if (isLoading && rawData.length === 0) return <Card><CardContent className="p-4">Loading details...</CardContent></Card>;
  if (error) return <Card><CardContent className="p-4 text-red-500">{error}</CardContent></Card>;


  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full border rounded-lg">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">Detailed Data: {systemName}</span>
                  <span className="text-sm text-muted-foreground font-normal">
                      Showing {Math.min(visibleRowCount, rawData.length)} of {rawData.length} rows. Click to expand.
                  </span>
              </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            <FilterableDataTable columns={columns} data={visibleData} systemName={systemName} />
            {rawData.length > visibleRowCount && (
              <div className="mt-4 text-center">
                <Button variant="secondary" onClick={() => setVisibleRowCount(c => Math.min(c + 100, rawData.length))}>
                  Show 100 More
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {/* --- NEW CHART FILTER COMPONENT --- */}
      <ChartFilters
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        dateRange={dateRange}
        setDateRange={setDateRange}
        splitBy={splitBy}
        setSplitBy={setSplitBy}
        splitOptions={splitOptions}
        selectedSplits={selectedSplits}
        setSelectedSplits={setSelectedSplits}
      />



      <div className="grid md:grid-cols-2 gap-6">
          <ChartCard 
              title={`Daily #OOS Count - ${systemName}`} 
              data={timeSeriesData.oos} 
              yAxisLabel="#OOS"
          />
          <ChartCard 
              title={`Daily Average Value - ${systemName}`} 
              data={timeSeriesData.average} 
              yAxisLabel="Average Value"
          />
          
      </div>
    </div>
  );
};
/**
 * Filterable Data Table for Detailed View
 */
/**
 * Filterable Data Table for Detailed View (Updated with CSV Download)
 */
interface FilterableDataTableProps {
    columns: ColumnDef<RawDataRow>[];
    data: RawDataRow[];
    systemName: string; // For generating the CSV filename
}

const FilterableDataTable: React.FC<FilterableDataTableProps> = ({ columns, data, systemName }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  
  const table: TanstackTable<RawDataRow> = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleDownloadCsv = () => {
    const headers = table.getVisibleFlatColumns().map(col => col.id);
    const rows = table.getRowModel().rows.map(row => {
      return row.getVisibleCells().map(cell => {
        const value = cell.getValue();
        // Basic escaping for CSV: wrap in quotes if it contains a comma, and escape existing quotes.
        const stringValue = String(value === null || value === undefined ? '' : value).replace(/"/g, '""');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `${systemName.replace(/\s+/g, '_')}_data_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between py-4 gap-4">
        <Input
          placeholder="Filter all columns..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
/**
 * Reusable Chart Component (Updated with Dynamic Y-Axis)
 */
interface ChartCardProps {
    title: string;
    data: TimeSeriesData[];
    yAxisLabel: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, data, yAxisLabel }) => {
    console.log(title , data)
    const { lineKeys, yDomain } = useMemo(() => {
        // Handle case with no data
        if (!data || data.length === 0) {
            // FIX: Return a default numeric domain instead of using 'auto'
            return { lineKeys: [], yDomain: [0, 100] };
        }

        // --- REVISED LOGIC TO FIND ALL KEYS ---
        const allKeys = new Set<string>();
        data.forEach(entry => {
            Object.keys(entry).forEach(key => {
                if (key !== 'date') {
                    allKeys.add(key);
                }
            });
        });
        const keys = Array.from(allKeys); // Now `keys` contains ALL possible series names
        // --- END OF REVISED LOGIC ---
        let minVal = Infinity;
        let maxVal = -Infinity;

        data.forEach(entry => {
            keys.forEach(key => {
                const val = entry[key];
                if (typeof val === 'number' && !isNaN(val)) {
                    if (val < minVal) minVal = val;
                    if (val > maxVal) maxVal = val;
                }
            });
        });

        // Handle case where no numeric data was found in the data set
        if (minVal === Infinity) {
            // FIX: Return a default numeric domain
            return { lineKeys: keys, yDomain: [0, 100] };
        }
        
        const range = maxVal - minVal;

        // Handle case where all data points are the same
        if (range === 0) {
            const padding = Math.abs(maxVal * 0.1) || 1;
            // FIX: Corrected property name from 'domain' to 'yDomain'
            return { lineKeys: keys, yDomain: [maxVal - padding, maxVal + padding] };
        }
        
        const padding = range * 0.1;
        
        const domain = [
            Math.floor(minVal - padding),
            Math.ceil(maxVal + padding)
        ];

        return { lineKeys: keys, yDomain: domain };
    }, [data]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis 
                            tick={{ fontSize: 12 }} 
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10 }}
                            // This now correctly receives a 'number[]' in all cases
                            domain={yDomain}
                            type="number"
                            allowDataOverflow={true}
                        />
                        <Tooltip />
                        <Legend />
                        {lineKeys.map((key, index) => (
                            <Line 
                                key={key} 
                                type="monotone" 
                                dataKey={key} 
                                stroke={colors[index % colors.length]}
                                connectNulls
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// --- NEW COMPONENT: ChartFilters ---

interface ChartFiltersProps {
  groupBy: 'Day' | 'Week' | 'Month'| 'None';
  setGroupBy: (value: 'Day' | 'Week' | 'Month' | 'None') => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  splitBy: 'ProcessGroup' | 'PART' | 'Process & Part'; // Add prop
  setSplitBy: (value: 'ProcessGroup' | 'PART' | 'Process & Part') => void; // Add prop
  splitOptions: readonly string[];
  selectedSplits: string[];
  setSelectedSplits: (splits: string[]) => void;
}


const ChartFilters: React.FC<ChartFiltersProps> = ({
  groupBy,
  setGroupBy,
  dateRange,
  setDateRange,
  splitBy,
  setSplitBy,
  splitOptions,
  selectedSplits,
  setSelectedSplits
}) => {
  const [open, setOpen] = useState(false);

  const handleSelectSplit = (split: string) => {
    setSelectedSplits(
      selectedSplits.includes(split)
        ? selectedSplits.filter((s: string) => s !== split)
        : [...selectedSplits, split]
    );
  };

  const splitByLabelMap = {
    ProcessGroup: 'Process Group',
    PART: 'Part',
    'Process & Part': 'Process & Part',
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Group By Selector */}
          <div>
            <label htmlFor="groupBy" className="text-sm font-medium">Group By</label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger id="groupBy">
                <SelectValue placeholder="Select aggregation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">No Aggregates</SelectItem>
                <SelectItem value="Day">Day</SelectItem>
                <SelectItem value="Week">Week</SelectItem>
                <SelectItem value="Month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div>
            <label htmlFor="date-range" className="text-sm font-medium">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          {/* --- NEW: SPLIT BY SELECTOR --- */}
          <div>
            <label htmlFor="splitBy" className="text-sm font-medium">Split Lines By</label>
            <Select value={splitBy} onValueChange={setSplitBy as (value: string) => void}>
              <SelectTrigger id="splitBy">
                <SelectValue placeholder="Select split" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ProcessGroup">Process Group</SelectItem>
                <SelectItem value="PART">Part</SelectItem>
                <SelectItem value="Process & Part">Process & Part</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Split By Multi-Select */}
          <div>
            <label className="text-sm font-medium">Filter ({splitByLabelMap[splitBy]})</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                  <span className="truncate">
                    {selectedSplits.length > 0 ? `${selectedSplits.length} selected` : "Select values..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search values..." />
                  <CommandList>
                    <CommandEmpty>No options found.</CommandEmpty>
                    <CommandGroup>
                      {splitOptions.map((option) => (
                        <CommandItem key={option} onSelect={() => handleSelectSplit(option)}>
                          <Check className={cn("mr-2 h-4 w-4", selectedSplits.includes(option) ? "opacity-100" : "opacity-0")} />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

        </div>
        <div className="pt-2 flex flex-wrap gap-1">
          {selectedSplits.map(split => (
            <Badge key={split} variant="secondary">{split}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
};

