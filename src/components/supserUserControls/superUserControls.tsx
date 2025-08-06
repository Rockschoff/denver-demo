/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form as FormWrapper,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const systems = ['PRESAGE', 'IGNITION', 'COMPLAINTS', 'CAPA', 'HOLDS'];
const ignitionOptions = ['Top Load', 'Fill Weights', 'Force To Load', 'Cap Torque', 'Bottle Pressure'];

type FormValues = Record<string, any>;

export default function SuperUseControls() {
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, FormValues>>({});

  // Initialize react-hook-form
  const form = useForm<FormValues>({
    defaultValues: formValues[selectedSystem] || {},
    mode: 'onChange',
  });

  // When user picks a system, set default values
  useEffect(() => {
    if (selectedSystem) {
      const defaults = formValues[selectedSystem] ?? getDefaultValues(selectedSystem);
      setFormValues(prev => ({ ...prev, [selectedSystem]: defaults }));
      form.reset(defaults);
    }
  }, [selectedSystem]);

  function getDefaultValues(system: string): FormValues {
    switch (system) {
      case 'PRESAGE':
        return { testName: '', threshold: 0, lookbackDays: 7 };
      case 'IGNITION':
        return { subsystem: '', threshold: 0, alertEnabled: false };
      case 'COMPLAINTS':
        return { categoryLevel1: '', categoryLevel2: '', lookbackDays: 30 };
      case 'CAPA':
        return { enableNotifications: false, escalationDays: 3 };
      case 'HOLDS':
        return { holdReason: '', holdDuration: 1 };
      default:
        return {};
    }
  }

  function onSubmit(data: FormValues) {
    setFormValues(prev => ({ ...prev, [selectedSystem]: data }));
    console.log('Saved', selectedSystem, data);
    // TODO: call API or persist
  }

  function renderForm() {
    if (!selectedSystem) return null;

    return (
      <Card className="mt-6 p-4">
        <CardHeader className="text-lg font-semibold mb-4">
          Configure {selectedSystem}
        </CardHeader>
        <CardContent>
          <FormWrapper {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {selectedSystem === 'PRESAGE' && (
                <>
                  <FormField
                    control={form.control}
                    name="testName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter test name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lookbackDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lookback Days</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedSystem === 'IGNITION' && (
                <>
                  <FormField
                    control={form.control}
                    name="subsystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subsystem</FormLabel>
                        <FormControl>
                          <Select {...field}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select subsystem" />
                            </SelectTrigger>
                            <SelectContent>
                              {ignitionOptions.map(opt => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alertEnabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enable Alerts</FormLabel>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Repeat FormField blocks similarly for COMPLAINTS, CAPA, HOLDS... */}

              <Button type="submit" className="mt-4">
                Save Configuration
              </Button>
            </form>
          </FormWrapper>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-2 gap-6">
        {systems.map(system => (
          <Card
            key={system}
            className={`cursor-pointer hover:border-blue-500 ${
              selectedSystem === system ? 'border-blue-500' : ''
            }`}
            onClick={() => setSelectedSystem(system)}
          >
            <CardHeader className="text-xl font-bold">{system}</CardHeader>
            <CardContent>
              Click here to configure {system} settings
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="w-full">{renderForm()}</div>
    </div>
  );
}
