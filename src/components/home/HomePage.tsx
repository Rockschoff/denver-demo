/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"; // This is a client component due to state and effects

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic'; // Import next/dynamic
import { executeSnowflakeQuery } from "@/lib/snowflakeClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { HeatmapChart } from '@/components/graphs/HeatmapChart'; // Adjust path if needed

// --- Queries (as provided in the prompt) ---
const tables = ["CAP_TORQUE", "FILL_WEIGHTS", "FIRST_ARTICLE_CHECK", "FORCE_TO_LOAD", "TOP_LOAD"];
const queries = tables.map(table => `
SELECT
    '${table.replace(/_/g, ' ')}' as "CHECK_TYPE",
    (
  COALESCE(CAST(PART  AS VARCHAR), 'Unlabeled')
  || ' ('
  || COALESCE(CAST(LINE AS VARCHAR), 'Unlabeled')
  || ')'
) AS "PART_LINE",
    COUNT(*) as "VALUE"
FROM ${table}
WHERE OUTOFSPEC = TRUE AND "DATE" >= '{startDate}' AND "DATE" <= '{endDate}'
GROUP BY "CHECK_TYPE", "PART_LINE"
`);

const heatMapQueries = [
    {
        systemName : "PRESAGE",
        query : `
SELECT
    COALESCE(TEST_NAME, 'Unlabeled') AS "TEST_NAME",
    COALESCE(LOCATION, 'Unlabeled') AS "LOCATION",
    COUNT(*) AS "VALUE"
FROM PRESAGE
WHERE "DATE" >= '{startDate}' AND "DATE" <= '{endDate}'
AND RESULT_STATUS != 'ALLOWED'
GROUP BY "TEST_NAME", "LOCATION";
`,
        xField: 'LOCATION',
        yField: 'TEST_NAME',
    },
    {
        systemName : "HOLDS",
        query : `
SELECT
    COALESCE(LINE, 'Unlabeled') AS "LINE",
    COALESCE(REASONFORACTION, 'Unlabeled') AS "REASONFORACTION",
    SUM(CASES) AS "VALUE"
FROM HOLDS
WHERE CREATED >= '{startDate}' AND CREATED <= '{endDate}'
GROUP BY "LINE", "REASONFORACTION";
`,
        xField: 'REASONFORACTION',
        yField: 'LINE',
    },
    {
        systemName : "CAPA",
        query : `
SELECT
    COALESCE(CAPALINES, 'Unlabeled') AS "CAPALINES",
    COALESCE(CATEGORY, 'Unlabeled') AS "CATEGORY",
    COUNT(*) AS "VALUE"
FROM CAPA
WHERE DATE_OF_INCIDENT >= '{yearAgo}' AND DATE_OF_INCIDENT <= '{endDate}'
GROUP BY "CAPALINES", "CATEGORY";
`,
        xField: 'CATEGORY',
        yField: 'CAPALINES',
    },
    {
        systemName : "IGNITION",
        query : queries.join(' UNION ALL '),
        xField: 'PART_LINE',
        yField: 'CHECK_TYPE',
    },
    {
        systemName : "COMPLAINTS",
        query : `
SELECT
    COALESCE(SUBJECT_LEVEL_3, 'Unlabeled') AS "SUBJECT_LEVEL_3",
    (COALESCE(PRODUCT_TYPE, 'Unlabeled') || ' (' || COALESCE(PRODUCT_DESCRIPTION, 'Unlabeled') || ')') AS "PRODUCT_INFO",
    COUNT(*) AS "VALUE"
FROM COMPLAINTS
WHERE RECEIVED_DATE >= '{yearAgo}' AND RECEIVED_DATE <= '{endDate}'
GROUP BY "SUBJECT_LEVEL_3", "PRODUCT_INFO";
`,
        xField: 'PRODUCT_INFO',
        yField: 'SUBJECT_LEVEL_3',
    }
];

// --- DYNAMIC IMPORT FOR THE CHART COMPONENT ---
// This tells Next.js to only load and render this component on the client-side.
const HeatmapChart = dynamic(
    () => import('@/components/graphs/HeatmapChart').then(mod => mod.HeatmapChart), 
    {
        ssr: false, // This is the crucial part
        loading: () => <div className="flex items-center justify-center h-full"><p>Loading chart...</p></div>,
    }
);

// Helper to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

interface ChartData {
    [key: string]: any[];
}

const trafficLightData = [
  { systemName: "Presage", score: 0, unit: "Failures", color: "green" },
  { systemName: "Ignition", score: 0, unit: "OOS", color: "green" },
  { systemName: "Complaints", score: 8, unit: "in last 30 days", color: "orange" },
  { systemName: "Open Holds", score: 2, unit: "open holds", color: "orange" },
  { systemName: "CAPA", score: 0, unit: "Overdue", color: "green" },
];

export default function HomePage() {
    const [numLookbackDays, setNumLookbackDays] = useState(7);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { startDate, endDate, yearAgo } = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - numLookbackDays);
        const ago = new Date();
        ago.setFullYear(ago.getFullYear() - 1);
        
        return {
            startDate: formatDate(start),
            endDate: formatDate(end),
            yearAgo: formatDate(ago)
        };
    }, [numLookbackDays]);

    const toObjects = (res: any) => {
        if (Array.isArray(res)) return res; // already objects
        if (res?.rows && res?.columns) {
            const cols = res.columns.map((c: any) => (c.name ?? c).toUpperCase());
            return res.rows.map((r: any[]) =>
            Object.fromEntries(cols.map((k: string, i: number) => [k, r[i]]))
            );
        }
        return [];
        };

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const dataPromises = heatMapQueries.map(async (q) => {
                    // Replace date placeholders
                    const finalQuery = q.query
                        .replace(/{startDate}/g, startDate)
                        .replace(/{endDate}/g, endDate)
                        .replace(/{yearAgo}/g, yearAgo);

                    const raw = await executeSnowflakeQuery(finalQuery);
                    const rows = toObjects(raw?.data ?? raw);
                    console.log(rows)
                    return { systemName: q.systemName, data: rows };
                });

                const results = await Promise.all(dataPromises);

                // Transform the array of results into a keyed object
                const dataMap = results.reduce((acc: ChartData, current) => {
                    acc[current.systemName] = current.data;
                    return acc;
                }, {});

                setChartData(dataMap);
            } catch (err: any) {
                console.error("Failed to fetch Snowflake data:", err);
                setError(`An error occurred while fetching data: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [startDate, endDate, yearAgo]); // Rerun effect when dates change

    return (
        <div className="w-full h-full p-4 md:p-6 space-y-6">
            {/* Traffic-light overview */}
            <div className="flex flex-wrap gap-8 justify-center">
            {trafficLightData.map(d => (
                <div key={d.systemName} className="flex flex-col items-center space-y-1 border p-2 rounded-lg w-[150px]">
                {/* system name */}
                <div className="text-sm font-semibold">{d.systemName}</div>

                {/* circle with score */}
                <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: d.color }}
                >
                    <span className="text-lg text-white font-bold">{d.score}</span>
                </div>

                {/* unit */}
                <div className="text-sm text-muted-foreground">{d.unit}</div>
                </div>
            ))}
            </div>
            <div className="flex items-center space-x-4">
                <Label htmlFor="lookback-days" className="font-bold text-lg">Lookback Days</Label>
                <Input
                    id="lookback-days"
                    type="number"
                    value={numLookbackDays}
                    onChange={(e) => setNumLookbackDays(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-28"
                />
            </div>

            {isLoading && (
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-muted-foreground">Loading Charts...</p>
                </div>
            )}
            
            {error && (
                 <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && chartData && (
                <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    {heatMapQueries.map(({ systemName, xField, yField }) => (
                        <Card key={systemName} className="flex flex-col h-auto">
                            <CardHeader>
                                <CardTitle>{systemName}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className='h-full'>
                                <HeatmapChart
                                    title={`${systemName} Failures`}
                                    data={chartData[systemName]}
                                    xField={xField}
                                    yField={yField}
                                    colorField="VALUE"
                                />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}