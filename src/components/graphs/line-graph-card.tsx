/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Set Default Colors and other config for Graphs
// TODO: Set logic for the rendering axis ticks
// TODO: Set Logic for rendering the tooltip
// TODO: Set logic for entering paramterized queries
// TODO: Make it possible to also make Heatmaps and Sankey Diagrams
// TODO: Create Logic For change and entering query paramters
// TODO: Create Logic For the automatically creating filters based on the data type.
// TODO: Create logic for saving user changes
import React, { useState, useEffect, useRef } from "react";
import type {
  LineProps,
  BarProps,
  AreaProps,
  ScatterProps,
  XAxisProps,
  YAxisProps,
  CartesianAxisProps,
  CartesianGridProps,
  ReferenceAreaProps,
  ReferenceLineProps,
  ReferenceDotProps,
  ResponsiveContainerProps,
  TooltipProps,
} from "recharts";
import {
  XAxis,
  YAxis,
  CartesianAxis,
  CartesianGrid,
  Line,
  Bar,
  Area,
  Scatter,
  ComposedChart,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
} from "recharts";
import { z } from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface AxisConfig {
  axisType: "x" | "y";
  props: XAxisProps | YAxisProps;
}

export interface MarkConfig {
  markType: "line" | "bar" | "area" | "scatter";
  props: LineProps | BarProps | AreaProps | ScatterProps;
}

export interface ReferenceMarkConfig {
  markType: "line" | "dot" | "area";
  props: ReferenceAreaProps | ReferenceLineProps | ReferenceDotProps;
}

export interface GraphCardProps {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  otherHeaderElements?: React.ReactNode;
  data: { table?: any[]; query?: string | any };
  axisConfig: AxisConfig[];
  markConfig: MarkConfig[];
  referenceMarks?: ReferenceMarkConfig[];
  responsiveContainer: ResponsiveContainerProps;
  tooltip?: TooltipProps<any, any>;
  cartesianAxis?: CartesianAxisProps;
  cartesianGrid?: CartesianGridProps;
  /** Zod schema for generating the form in the footer */
  formSchema?: z.ZodObject<any, any>;
}

export default function GraphCard(props: GraphCardProps) {
  const {
    title,
    description,
    otherHeaderElements,
    data,
    axisConfig,
    markConfig,
    referenceMarks,
    responsiveContainer,
    tooltip,
    cartesianAxis,
    cartesianGrid,
    formSchema,
  } = props;

  // Local state for fetched data
  const [tableData, setTableData] = useState<any[] | undefined>(data.table);
  const [loading, setLoading] = useState(false);
  // Simple in-memory cache
  const cacheRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    async function fetchData() {
      if (!data.table && data.query) {
        const queryKey = typeof data.query === 'string' ? data.query : JSON.stringify(data.query);
        // Check cache
        if (cacheRef.current[queryKey]) {
          setTableData(cacheRef.current[queryKey]);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/query-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: data.query }),
          });
          const json = await res.json();
          const rows = json.data;
          // Cache and set
          cacheRef.current[queryKey] = rows;
          setTableData(rows);
        //   console.log("Got the the Data : " , rows)
        } catch (err) {
          console.error('Error fetching data:', err);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchData();
  }, [data.query, data.table]);

  return (
    <Card>
      <CardHeader>
        <div className="flex w-full justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {otherHeaderElements && <div>{otherHeaderElements}</div>}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full animate-pulse" />
        ) : (
          <ResponsiveContainer {...responsiveContainer}>
            <ComposedChart data={tableData}>
              {axisConfig.map((cfg, i) =>
                cfg.axisType === 'x' ? (
                  <XAxis key={i} {...(cfg.props as XAxisProps)} />
                ) : (
                  <YAxis key={i} {...(cfg.props as YAxisProps)} />
                )
              )}

              {cartesianAxis && <CartesianAxis {...cartesianAxis} />}
              {cartesianGrid && <CartesianGrid {...cartesianGrid} />}

              {markConfig.map((cfg, i) => {
                switch (cfg.markType) {
                  case 'line':
                    return <Line key={i} {...(cfg.props as LineProps)} />;
                  case 'bar':
                    return <Bar key={i} {...(cfg.props as BarProps)} />;
                  case 'area':
                    return <Area key={i} {...(cfg.props as AreaProps)} />;
                  case 'scatter':
                    return <Scatter key={i} {...(cfg.props as ScatterProps)} />;
                  default:
                    return null;
                }
              })}

              {referenceMarks?.map((cfg, i) => {
                const { ref: _r, ...restProps } = cfg.props as any;
                switch (cfg.markType) {
                  case 'line':
                    return <ReferenceLine key={i} {...(restProps as ReferenceLineProps)} />;
                  case 'area':
                    return <ReferenceArea key={i} {...(restProps as ReferenceAreaProps)} />;
                  case 'dot':
                    return <ReferenceDot key={i} {...(restProps as ReferenceDotProps)} />;
                  default:
                    return null;
                }
              })}

              {tooltip && <Tooltip {...tooltip} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>

      {formSchema && (
        <CardFooter>
          <button
            onClick={() => setTableData((prev) => prev)}
            className="mb-2 text-sm font-medium"
          >
            {/* Toggle logic for settings form can go here */}
          </button>
          {/* Settings form UI based on formSchema would be generated here */}
        </CardFooter>
      )}
    </Card>
  );
}
