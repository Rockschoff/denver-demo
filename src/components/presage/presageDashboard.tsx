
/*

Do it like this:

Run snowflake query only once : SELECT DISTINCT WORK_ORDER_TITLE, TEST_NAME , ANALYSIS_OPTION_NAME, LOCATION , PRODUCT_NAME FROM PRESAGE;
this should give unique pair of 5 all these columns

for workorder filter , options will be all the unique value is work order title column and so on

Allowing for dynmic filter options

if the user select a value in workOrdertitle select box : "WorkOrder A"
the filter table that you roginally got to get all the unique value and all the other columns so that those column only show what is availale under workorder A
like this is all the options in 5 select box should be updated

select boxes should be multi select and searchable

use shadcn ui components, like combo box abd bother things


*/
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { executeSnowflakeQuery } from '@/lib/snowflakeClient';
import { cn } from '@/lib/utils';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { PresageGraphs } from './presageGraphs';
import PresageRecentSummaryGraphs from "./presageRecentSummaryGraphs"
// import PresageGraphs from './presageGraphs'; // Assuming it's in a separate file

// --- TYPE DEFINITIONS ---
type FilterDataRow = {
  WORK_ORDER_TITLE: string;
  TEST_NAME: string;
  ANALYSIS_OPTION_NAME: string;
  LOCATION: string;
  PRODUCT_NAME: string;
};

const formSchema = z.object({
  workOrderTitles: z.array(z.string()).optional(),
  testNames: z.array(z.string()).optional(),
  analysisOptionNames: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  productNames: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// --- REUSABLE MULTI-SELECT COMBOBOX COMPONENT ---
interface MultiSelectComboBoxProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
}

function MultiSelectComboBox({ options, selected, onChange, placeholder }: MultiSelectComboBoxProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto">
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
              selected.map((item) => (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mr-1 mb-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(item);
                  }}
                >
                  {item}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => handleSelect(option)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selected.includes(option) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


// --- MAIN DASHBOARD COMPONENT ---
export default function PresageDashboard() {
  const [allCombinations, setAllCombinations] = useState<FilterDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // **STEP 1: Create state to hold the SUBMITTED filters**
  const [appliedFilters, setAppliedFilters] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workOrderTitles: [],
      testNames: [],
      analysisOptionNames: [],
      locations: [],
      productNames: [],
    },
  });

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const query = `
          SELECT DISTINCT WORK_ORDER_TITLE, TEST_NAME, ANALYSIS_OPTION_NAME, LOCATION, PRODUCT_NAME 
          FROM PRESAGE;
        `;
        const result = await executeSnowflakeQuery<FilterDataRow>(query);
        setAllCombinations(result.data);
      } catch (error) {
        console.error("Failed to fetch filter data from Snowflake:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const selectedFilters = form.watch();

  const availableOptions = useMemo(() => {
    let filteredCombinations = allCombinations;

    const applyFilter = (key: keyof FilterDataRow, selectedValues: string[] | undefined) => {
      if (selectedValues && selectedValues.length > 0) {
        filteredCombinations = filteredCombinations.filter(row => selectedValues.includes(row[key]));
      }
    };
    
    applyFilter('WORK_ORDER_TITLE', selectedFilters.workOrderTitles);
    applyFilter('TEST_NAME', selectedFilters.testNames);
    applyFilter('ANALYSIS_OPTION_NAME', selectedFilters.analysisOptionNames);
    applyFilter('LOCATION', selectedFilters.locations);
    applyFilter('PRODUCT_NAME', selectedFilters.productNames);
    
    const getUniqueOptions = (key: keyof FilterDataRow) => {
      return [...new Set(filteredCombinations.map(row => row[key]))].sort();
    };

    return {
      workOrderTitles: getUniqueOptions('WORK_ORDER_TITLE'),
      testNames: getUniqueOptions('TEST_NAME'),
      analysisOptionNames: getUniqueOptions('ANALYSIS_OPTION_NAME'),
      locations: getUniqueOptions('LOCATION'),
      productNames: getUniqueOptions('PRODUCT_NAME'),
    };
  }, [selectedFilters, allCombinations]);

  // **STEP 2: Update the state on form submission**
  const onSubmit = (values: FormValues) => {
    console.log('Applying filters to fetch graph data:', values);
    setAppliedFilters(values);
  };

  if (isLoading) {
    return <div className="p-8">Loading filter options...</div>;
  }
  
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Presage Dashboard Filters</h1>
      <PresageRecentSummaryGraphs></PresageRecentSummaryGraphs>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6 border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="workOrderTitles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Order Title</FormLabel>
                  <MultiSelectComboBox
                    options={availableOptions.workOrderTitles}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select Work Orders..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="testNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Name</FormLabel>
                  <MultiSelectComboBox
                    options={availableOptions.testNames}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select Test Names..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="analysisOptionNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Analysis Option</FormLabel>
                  <MultiSelectComboBox
                    options={availableOptions.analysisOptionNames}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select Analysis Options..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <MultiSelectComboBox
                    options={availableOptions.locations}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select Locations..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <MultiSelectComboBox
                    options={availableOptions.productNames}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select Products..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Date Range</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <>
                              {format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(field.value.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={field.value as DateRange}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit">Apply Filters & View Graphs</Button>
        </form>
      </Form>
      
      {/* **STEP 3: Conditionally render PresageGraphs and pass the applied filters** */}
      <div className="mt-8">
        {appliedFilters ? (
            
          <PresageGraphs filters={appliedFilters} />
        ) : (
          <div className="text-center text-muted-foreground p-10 border-2 border-dashed rounded-lg">
            Apply filters to view graphs
          </div>
        )}
      </div>
    </div>
  );
}


// // --- GRAPHS COMPONENT ---
// interface PresageGraphsProps {
//     filters: FormValues;
// }

// export function PresageGraphs({ filters }: PresageGraphsProps) {
//   useEffect(() => {
//     // This effect runs whenever the filters are applied
//     console.log("Filters received by PresageGraphs component:", filters);
    
//     // TODO: Build your `WHERE` clause from the `filters` object
//     // and call `executeSnowflakeQuery` to get the data for your graphs.

//   }, [filters]);

//   /*
//     Here are instructions about how to make graphs and what graphs to make

//     ALL GRAPHS WILL BE AMDE USING the RECHARTS LIBRARY
    
//     validate that atleast on think from WorkOrderTitle, test name and analysis option should be present

//     Construct the where clause use it to run the following snowflake query
//     SELECT RESULT_STATUS , RESULT_VALUE, WORK_ORDER_TITLE, ANALYSIS_OPTION_NAME , ANALYSIS_VALUE_TYPE, TEST_NAME, PRODUCT_NAME, LOCATION, DATE from PRESAGE {WHERE CLAUSE}


//     These Graphs will be made for each unique set fo the Test_Name in the data  and multi line graph , bar graph , pir charts will be split based on ANALYSIS_OPTION_NAME

//     Graph Group 1 : For each test name Where ANALYSIS_VALUE_TYPE IS IN (NUMBER , INTEGER) make a multi group scatter graph Graph of Result Value vs Date split "analysis Option name" in this graph you should be able to hide or selection particular sctter groups based on analysis option name and graph should have tooltip NOTE each analysis_Options_Name has different scale (and Y-axis)
//     Graph Group 2 : For each test Name Cluster bar graph split by Analysis_Option_name , showing the number enteries where RESULT_STATUS != ALLOWED  . It should be configurable in the graph that wherehter xAxis is grouped by Week, Month , or qaurter


//     Then we will make the following graphs using recharts

    

  
//   */

//   return (
//     <div>
//         <h2 className="text-xl font-semibold mb-4">Analysis Graphs</h2>
//         <div className="p-4 border rounded-lg min-h-[300px] bg-muted">
//             <p className="text-sm text-muted-foreground mb-4">Showing graphs for the applied filters:</p>
//             <pre className="text-xs bg-background p-4 rounded">
//                 {JSON.stringify(filters, null, 2)}
//             </pre>
//         </div>
//     </div>
//   );
// }