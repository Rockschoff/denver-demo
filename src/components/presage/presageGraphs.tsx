/* eslint-disable @typescript-eslint/no-explicit-any */
// PresageGraphs.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { getWeek, getQuarter, format } from 'date-fns';
import { executeSnowflakeQuery } from '@/lib/snowflakeClient';
import { Checkbox } from '@/components/ui/checkbox';
import { buildWhereClause } from '@/lib/utils'; // Assuming you placed the helper here

// Shadcn UI for Bar Chart time grouping
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Type Definitions
type FormValues = {
  workOrderTitles?: string[];
  testNames?: string[];
  analysisOptionNames?: string[];
  locations?: string[];
  productNames?: string[];
  dateRange?: { from?: Date; to?: Date };
};

interface PresageGraphsProps {
  filters: FormValues;
}

type GraphDataRow = {
  RESULT_STATUS: string;
  RESULT_VALUE: number | null; // Can be null if not a numeric type
  WORK_ORDER_TITLE: string;
  ANALYSIS_OPTION_NAME: string;
  ANALYSIS_VALUE_TYPE: 'NUMBER' | 'INTEGER' | 'STRING' | 'BOOLEAN';
  TEST_NAME: string;
  PRODUCT_NAME: string;
  LOCATION: string;
  DATE: string; // Assuming date comes as a string like 'YYYY-MM-DD'
};

type TimeGroupBy = 'Week' | 'Month' | 'Quarter';

// --- Graph Component Logic ---

export function PresageGraphs({ filters }: PresageGraphsProps) {
  const [graphData, setGraphData] = useState<Record<string, GraphDataRow[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeGroupBy, setTimeGroupBy] = useState<TimeGroupBy>('Month');

  useEffect(() => {
    const fetchData = async () => {
      // Validate that at least one key filter is present
      if (!filters.workOrderTitles?.length && !filters.testNames?.length && !filters.analysisOptionNames?.length) {
        setError("Please select a Work Order, Test Name, or Analysis Option to view graphs.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const whereClause = buildWhereClause(filters);
        const query = `
          SELECT RESULT_STATUS, RESULT_VALUE, WORK_ORDER_TITLE, ANALYSIS_OPTION_NAME, ANALYSIS_VALUE_TYPE, TEST_NAME, PRODUCT_NAME, LOCATION, DATE 
          FROM PRESAGE ${whereClause};
        `;
        
        const result = await executeSnowflakeQuery<GraphDataRow>(query);
        
        if (!result.data || result.data.length === 0) {
            setError("No data found for the selected filters.");
            setGraphData({});
            setIsLoading(false);
            return;
        }

        // Group data by TEST_NAME
        const groupedData = result.data.reduce((acc, row) => {
          const key = row.TEST_NAME;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(row);
          return acc;
        }, {} as Record<string, GraphDataRow[]>);

        setGraphData(groupedData);
      } catch (e: any) {
        console.error("Failed to fetch graph data:", e);
        setError(e.message || "An error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (isLoading) {
    return <div className="p-4">Loading graphs...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-12">
      {Object.keys(graphData).map((testName) => (
        <div key={testName} className="p-6 border rounded-lg">
          <h2 className="text-2xl font-bold mb-6">{testName}</h2>

          {/* --- Graph Group 1: Scatter Plot --- */}
          <div className="mb-12">
             <h3 className="text-lg font-semibold mb-4">Result Value vs. Date</h3>
             <NumericScatterChart data={graphData[testName]} />
          </div>

          {/* --- Graph Group 2: Bar Chart --- */}
          <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Entries with Result Status not ALLOWED</h3>
                <RadioGroup defaultValue="Month" onValueChange={(value: TimeGroupBy) => setTimeGroupBy(value)} className="flex items-center gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Week" id={`r1-${testName}`} /><Label htmlFor={`r1-${testName}`}>Week</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Month" id={`r2-${testName}`} /><Label htmlFor={`r2-${testName}`}>Month</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Quarter" id={`r3-${testName}`} /><Label htmlFor={`r3-${testName}`}>Quarter</Label></div>
                </RadioGroup>
            </div>
             <StatusBarchart data={graphData[testName]} groupBy={timeGroupBy} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Specific Chart Components ---

const NumericScatterChart = ({ data }: { data: GraphDataRow[] }) => {
    const [visibleOptions, setVisibleOptions] = useState<string[]>([]);

    const { numericData, analysisOptions } = useMemo(() => {
        const filtered = data.filter(d => 
            (d.ANALYSIS_VALUE_TYPE === 'NUMBER' || d.ANALYSIS_VALUE_TYPE === 'INTEGER') && d.RESULT_VALUE != null
        );
        const options = [...new Set(filtered.map(d => d.ANALYSIS_OPTION_NAME))];
        return { numericData: filtered, analysisOptions: options };
    }, [data]);
    
    useEffect(() => {
        setVisibleOptions(analysisOptions);
    }, [analysisOptions]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

    // Handler for the legend click to toggle visibility
    const handleLegendClick = (data: any) => {
        const { dataKey } = data;
        if (visibleOptions.includes(dataKey)) {
            setVisibleOptions(prev => prev.filter(opt => opt !== dataKey));
        } else {
            setVisibleOptions(prev => [...prev, dataKey]);
        }
    };
    
    // **NEW**: Handler for checkbox changes
    const handleCheckboxChange = (option: string, checked: boolean) => {
        if (checked) {
            setVisibleOptions(prev => [...prev, option]);
        } else {
            setVisibleOptions(prev => prev.filter(opt => opt !== option));
        }
    };

    if (numericData.length === 0) {
        return <p className="text-muted-foreground">No numeric data available for this chart.</p>;
    }

    return (
        <div>
            {/* **NEW**: UI controls for toggling visibility */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 p-2 rounded-md border">
                <p className="text-sm font-semibold mr-2">Toggle Series:</p>
                {analysisOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                            id={`check-${option}`}
                            checked={visibleOptions.includes(option)}
                            onCheckedChange={(checked: any) => handleCheckboxChange(option, !!checked)}
                        />
                        <Label htmlFor={`check-${option}`} className="text-sm font-normal cursor-pointer">
                            {option}
                        </Label>
                    </div>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <CartesianGrid />
                    <XAxis 
                        dataKey="DATE" 
                        name="Date" 
                        tickFormatter={(tick) => format(new Date(tick), 'MMM d, yyyy')} 
                        type="category" 
                        allowDuplicatedCategory={false}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name, props) => [`Value: ${value}`, `Analysis: ${name}`, `Date: ${props.payload.DATE}`]} />
                    <Legend onClick={handleLegendClick} />

                    {/* Render Y-Axes only for visible options */}
                    {analysisOptions.filter(opt => visibleOptions.includes(opt)).map((option, index) => (
                        <YAxis 
                            key={option} 
                            yAxisId={option} 
                            orientation={index % 2 === 0 ? 'left' : 'right'} 
                            stroke={colors[analysisOptions.indexOf(option) % colors.length]}
                            label={{ value: option, angle: -90, position: index % 2 === 0 ? 'insideLeft' : 'insideRight', offset: index % 2 === 0 ? 0 : 20, style: { textAnchor: 'middle' } }}
                        />
                    ))}

                    {/* Render Scatter series only for visible options */}
                    {analysisOptions.filter(opt => visibleOptions.includes(opt)).map((option) => {
                        const seriesData = numericData.filter(d => d.ANALYSIS_OPTION_NAME === option);
                        const colorIndex = analysisOptions.indexOf(option);
                        const solidColor = colors[colorIndex % colors.length];
                        const translucentColor = `${solidColor}4D`;

                        return (
                            <Scatter 
                                key={option} 
                                yAxisId={option}
                                data={seriesData} 
                                name={option} 
                                fill={solidColor}
                                dataKey={"RESULT_VALUE"}
                            >
                                {seriesData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.RESULT_STATUS === 'ALLOWED' ? translucentColor : solidColor} 
                                    />
                                ))}
                            </Scatter>
                        );
                    })}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};
const StatusBarchart = ({ data, groupBy }: { data: GraphDataRow[], groupBy: TimeGroupBy }) => {
    const nonAllowedData = useMemo(() => {
        const filtered = data.filter(d => d.RESULT_STATUS !== 'ALLOWED');
        if (filtered.length === 0) return [];
        
        const getGroupKey = (dateStr: string): string => {
            const date = new Date(dateStr);
            if (groupBy === 'Week') return `W${getWeek(date)}, ${format(date, 'yyyy')}`;
            if (groupBy === 'Month') return format(date, 'MMM yyyy');
            if (groupBy === 'Quarter') return `Q${getQuarter(date)}, ${format(date, 'yyyy')}`;
            return dateStr;
        };

        const counts = filtered.reduce((acc, row) => {
            const groupKey = getGroupKey(row.DATE);
            if (!acc[groupKey]) {
                acc[groupKey] = { name: groupKey };
            }
            const optionKey = row.ANALYSIS_OPTION_NAME;
            acc[groupKey][optionKey] = (acc[groupKey][optionKey] || 0) + 1;
            return acc;
        }, {} as Record<string, any>);
        
        return Object.values(counts);
    }, [data, groupBy]);
    
    const analysisOptions = [...new Set(data.filter(d => d.RESULT_STATUS !== 'ALLOWED').map(d => d.ANALYSIS_OPTION_NAME))];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

    if (nonAllowedData.length === 0) return <p className="text-muted-foreground">No entries with status other than ALLOWED found.</p>;

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={nonAllowedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {analysisOptions.map((option, index) => (
                     <Bar key={option} dataKey={option} fill={colors[index % colors.length]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};