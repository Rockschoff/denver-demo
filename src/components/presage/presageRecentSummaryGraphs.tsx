/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { executeSnowflakeQuery } from '@/lib/snowflakeClient';
import {DeleteIcon} from "lucide-react"

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowDown, ArrowUp } from 'lucide-react';

// --- Type Definitions ---
type GraphDataRow = {
  RESULT_STATUS: string;
  RESULT_VALUE: number | null;
  WORK_ORDER_TITLE: string;
  ANALYSIS_OPTION_NAME: string;
  ANALYSIS_VALUE_TYPE: 'NUMBER' | 'INTEGER' | 'STRING' | 'BOOLEAN';
  TEST_NAME: string;
  PRODUCT_NAME: string;
  LOCATION: string;
  DATE: string;
};

type FailureSummary = {
  testName: string;
  failureCount: number;
  details: GraphDataRow[];
};

// --- Main Component ---
export default function PresageRecentSummaryGraphs({isEditMode}:{isEditMode : boolean}) {
  const [numLookBackDays, setNumLookBackDays] = useState<number>(7);
  const [allFailures, setAllFailures] = useState<GraphDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false); // **NEW**: State to control the view
  

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fromDate = format(subDays(new Date(), numLookBackDays), 'yyyy-MM-dd');
        const query = `
          SELECT RESULT_STATUS, RESULT_VALUE, WORK_ORDER_TITLE, ANALYSIS_OPTION_NAME, ANALYSIS_VALUE_TYPE, TEST_NAME, PRODUCT_NAME, LOCATION, "DATE" 
          FROM PRESAGE 
          WHERE "DATE" >= '${fromDate}' AND RESULT_STATUS != 'ALLOWED';
        `;

        const result = await executeSnowflakeQuery<GraphDataRow>(query);
        setAllFailures(result.data || []);
      } catch (e: any) {
        console.error("Failed to fetch summary data:", e);
        setError(e.message || "An error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [numLookBackDays]);
  
  // **MODIFIED**: Create one sorted list of all failing tests
  const sortedFailingTests = useMemo<FailureSummary[]>(() => {
    if (!allFailures.length) return [];

    const failureCounts = allFailures.reduce((acc, row) => {
      if (!acc[row.TEST_NAME]) {
        acc[row.TEST_NAME] = { testName: row.TEST_NAME, failureCount: 0, details: [] };
      }
      acc[row.TEST_NAME].failureCount++;
      acc[row.TEST_NAME].details.push(row);
      return acc;
    }, {} as Record<string, FailureSummary>);

    return Object.values(failureCounts)
      .sort((a, b) => b.failureCount - a.failureCount);
  }, [allFailures]);

  // **NEW**: Conditionally slice the list based on the showAll state
  const testsToDisplay = useMemo(() => {
    return showAll ? sortedFailingTests : sortedFailingTests.slice(0, 5);
  }, [showAll, sortedFailingTests]);


  if (isLoading) {
    return <div className="p-8 text-center">Loading recent failure summary...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Recent Failure Summary</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Lookback Period:</label>
          <Select value={String(numLookBackDays)} onValueChange={(val: any) => setNumLookBackDays(Number(val))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 Day</SelectItem>
              <SelectItem value="3">Last 3 Days</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {allFailures.length === 0 ? (
        <Card>

          <CardHeader>
            {isEditMode && <DeleteIcon className='border  border-2 rounded-lg text-red-500'></DeleteIcon>}
            <CardTitle>All Clear! ✅</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No failing tests found in the last {numLookBackDays} days.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- **MERGED FAILING TESTS SECTION** --- */}
          <Card>
            <CardHeader>
              {isEditMode && <DeleteIcon className='border  border-2 rounded-lg text-red-500'></DeleteIcon>}
              <CardTitle>
                {showAll ? 'All Failing Tests' : 'Top 5 Failing Tests'} (Last {numLookBackDays} Days)
              </CardTitle>
              <CardDescription>
                {showAll ? `Showing all ${sortedFailingTests.length} failing tests.` : `Click a test to see details or expand to see all failures.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {testsToDisplay.map((test) => (
                  <AccordionItem value={test.testName} key={test.testName}>
                    <AccordionTrigger className="text-lg hover:no-underline">
                      <div className="flex justify-between w-full pr-4">
                        <span>{test.testName}</span>
                        <span className="text-red-500 font-semibold">{test.failureCount} Failures</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <FailureDetailsTable details={test.details} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
            {sortedFailingTests.length > 5 && (
              <CardFooter className="flex justify-center">
                <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                  {showAll ? (
                    <>
                      <ArrowUp className="mr-2 h-4 w-4" /> Show Top 5
                    </>
                  ) : (
                    <>
                      <ArrowDown className="mr-2 h-4 w-4" /> Show All {sortedFailingTests.length} Tests
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
          
          <Card>
            <CardHeader>
              {isEditMode && <DeleteIcon className='border  border-2 rounded-lg text-red-500'></DeleteIcon>}
              <CardTitle>Failure Heatmap by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <FailureHeatmap data={allFailures} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// --- Helper Components (No changes needed below this line) ---

function FailureDetailsTable({ details }: { details: GraphDataRow[] }) {
  const [filter, setFilter] = useState('');
  const filteredDetails = useMemo(() => {
    if (!filter) return details;
    return details.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [details, filter]);

  return (
    <div className="space-y-4 p-2">
      <Input
        placeholder="Filter failures..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted z-10">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Work Order</TableHead>
              <TableHead>Analysis Option</TableHead>
              <TableHead>Result Status</TableHead>
              <TableHead>Result Value</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDetails.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{format(new Date(row.DATE), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{row.WORK_ORDER_TITLE}</TableCell>
                <TableCell>{row.ANALYSIS_OPTION_NAME}</TableCell>
                <TableCell className="font-medium text-red-600">{row.RESULT_STATUS}</TableCell>
                <TableCell>{row.RESULT_VALUE}</TableCell>
                <TableCell>{row.LOCATION}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FailureHeatmap({ data }: { data: GraphDataRow[] }) {
    const heatmapData = useMemo(() => {
        const counts = data.reduce((acc, row) => {
            const key = `${row.TEST_NAME}|${row.LOCATION}`;
            if (!acc[key]) {
                acc[key] = {
                    testName: row.TEST_NAME,
                    location: row.LOCATION,
                    failures: 0,
                };
            }
            acc[key].failures++;
            return acc;
        }, {} as Record<string, { testName: string; location: string; failures: number }>);
        return Object.values(counts);
    }, [data]);

    const locations = [...new Set(heatmapData.map(d => d.location))].sort();

    const chartData = useMemo(() => {
        const testNames = [...new Set(heatmapData.map(d => d.testName))].sort();
        return testNames.map(testName => {
            const row: any = { testName };
            locations.forEach(location => {
                const item = heatmapData.find(d => d.testName === testName && d.location === location);
                row[location] = item ? item.failures : 0;
            });
            return row;
        });
    }, [heatmapData, locations]);
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

    if (chartData.length === 0) {
        return <p className='text-muted-foreground'>No data for heatmap.</p>
    }

    return (
        <ResponsiveContainer width="100%" height={150 + chartData.length * 30}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="testName" type="category" width={150} />
                <Tooltip />
                <Legend />
                {locations.map((location, index) => (
                    <Bar key={location} dataKey={location} stackId="a" fill={colors[index % colors.length]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}