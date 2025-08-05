import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cx(...args: ClassValue[]) {
  return twMerge(clsx(...args))
}

// Tremor focusInput [v0.0.2]

export const focusInput = [
  // base
  "focus:ring-2",
  // ring color
  "focus:ring-blue-200 dark:focus:ring-blue-700/30",
  // border color
  "focus:border-blue-500 dark:focus:border-blue-700",
]

// Tremor Raw focusRing [v0.0.1]

export const focusRing = [
  // base
  "outline outline-offset-2 outline-0 focus-visible:outline-2",
  // outline color
  "outline-blue-500 dark:outline-blue-500",
]

// Tremor Raw hasErrorInput [v0.0.1]

export const hasErrorInput = [
  // base
  "ring-2",
  // border color
  "border-red-500 dark:border-red-700",
  // ring color
  "ring-red-200 dark:ring-red-700/30",
]

import { format } from 'date-fns';

// A simplified type matching the form values
type FormValues = {
  workOrderTitles?: string[];
  testNames?: string[];
  analysisOptionNames?: string[];
  locations?: string[];
  productNames?: string[];
  dateRange?: { from?: Date; to?: Date };
};

/**
 * Builds a SQL WHERE clause from filter values.
 * NOTE: This uses string interpolation. For production apps, ensure your backend
 * API layer sanitizes inputs or uses parameterized queries to prevent SQL injection.
 */
export function buildWhereClause(filters: FormValues): string {
  const conditions: string[] = [];
  const { workOrderTitles, testNames, analysisOptionNames, locations, productNames, dateRange } = filters;

  const addCondition = (field: string, values: string[] | undefined) => {
    if (values && values.length > 0) {
      const quotedValues = values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
      conditions.push(`${field} IN (${quotedValues})`);
    }
  };

  addCondition('WORK_ORDER_TITLE', workOrderTitles);
  addCondition('TEST_NAME', testNames);
  addCondition('ANALYSIS_OPTION_NAME', analysisOptionNames);
  addCondition('LOCATION', locations);
  addCondition('PRODUCT_NAME', productNames);

  if (dateRange?.from && dateRange?.to) {
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');
    conditions.push(`DATE BETWEEN '${fromDate}' AND '${toDate}'`);
  }

  if (conditions.length === 0) return '';
  return `WHERE ${conditions.join(' AND ')}`;
}