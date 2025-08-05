import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils"; // Assumes you have a `cn` utility for classnames

// Define the type for the selection state for better type safety
type SelectedCheck = "SQF" | "FDA" | null;

// --- MOCK DATA ---
const atpMonitoringData = [
  {
    id: "ATP-001",
    location: "Zone 1 - Slicer Blade #3",
    test: "ATP Swab",
    frequency: "Pre-Op, Daily",
    latestResult: "Pass (3 RLU)",
  },
  {
    id: "ATP-002",
    location: "Zone 2 - Conveyor Belt Control Panel",
    test: "ATP Swab",
    frequency: "Weekly",
    latestResult: "Pass (12 RLU)",
  },
  {
    id: "ATP-003",
    location: "Zone 1 - Mixing Vat Interior",
    test: "ATP Swab",
    frequency: "Post-CIP, Per Batch",
    latestResult: "Pass (5 RLU)",
  },
  {
    id: "ATP-004",
    location: "Zone 3 - Forklift Steering Wheel",
    test: "ATP Swab",
    frequency: "Monthly",
    latestResult: "Pass (25 RLU)",
  },
];

const capaReportData = [
    {
        id: "CAPA-RPT-2025-Q2",
        title: "Q2 2025 Corrective Action Trend Analysis",
        link: "/reports/capa-2025-q2.pdf",
        summary: "Analysis of recurring deviations in packaging line 2."
    },
    {
        id: "CAPA-RPT-2025-Q1",
        title: "Q1 2025 Corrective Action Trend Analysis",
        link: "/reports/capa-2025-q1.pdf",
        summary: "Review of foreign material incidents and subsequent CAPAs."
    }
]


export default function AuditCenter() {
  const [selectedCheck, setSelectedCheck] = useState<SelectedCheck>(null);

  const renderSfqEvidence = () => (
    <div className="mt-8 animate-in fade-in-50 duration-500">
      {/* --- Section 1: ATP Testing Evidence --- */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold tracking-tight">Evidence: Cleaning Verification & Monitoring</h2>
        <blockquote className="mt-2 pl-4 italic border-l-2">
           **SQF Edition 9, 11.2.5 Monitoring:** The methods, responsibility and criteria for monitoring the effectiveness of the cleaning and sanitation program shall be documented and implemented. The monitoring program shall include... microbiological swabbing and/or ATP testing of food contact surfaces and adjacent surfaces at a **frequency determined by risk assessment**.
        </blockquote>

        <p className="mt-4 text-sm text-muted-foreground">
            Evidence below demonstrates adherence through a risk-based ATP testing schedule.
        </p>

        <Card className="mt-4">
            <CardHeader>
                <CardTitle>ATP Testing Schedule & Locations</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[250px]">Location</TableHead>
                        <TableHead>Test Type</TableHead>
                        <TableHead>Frequency (Risk-Based)</TableHead>
                        <TableHead className="text-right">Latest Result</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {atpMonitoringData.map((test) => (
                        <TableRow key={test.id}>
                            <TableCell className="font-medium">{test.location}</TableCell>
                            <TableCell>{test.test}</TableCell>
                            <TableCell>{test.frequency}</TableCell>
                            <TableCell className="text-right">{test.latestResult}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* --- Section 2: CAPA Analysis Evidence --- */}
       <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold tracking-tight">Evidence: Corrective Action Analysis</h2>
        <blockquote className="mt-2 pl-4 italic border-l-2">
           **SQF Edition 9, 2.5.3 Corrective and Preventative Action:** Records of all investigation and resolution of non-conformances... shall be maintained. The site shall **analyze data from corrective actions** to identify trends and shall implement preventative action to address the trends and prevent recurrence.
        </blockquote>

        <p className="mt-4 text-sm text-muted-foreground">
            Evidence below includes links to periodic trend analysis reports generated for CAPA review.
        </p>

        <div className="mt-4 space-y-4">
            {capaReportData.map((report) => (
                <Card key={report.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                       <div>
                         <h3 className="font-semibold">{report.title}</h3>
                         <p className="text-sm text-muted-foreground">{report.summary}</p>
                       </div>
                       <Button asChild variant="outline">
                         <a href={report.link} target="_blank" rel="noopener noreferrer">View Report</a>
                       </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );

  const renderFdaEvidence = () => (
      <div className="mt-8 animate-in fade-in-50 duration-500">
          <Card>
              <CardHeader>
                  <CardTitle>FDA Checks & Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>Content for FDA checks would be displayed here.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                      This could include evidence related to FSMA (Food Safety Modernization Act), HARPC (Hazard Analysis and Risk-Based Preventive Controls), or specific 21 CFR part 117 requirements.
                  </p>
              </CardContent>
          </Card>
      </div>
  );

  return (
    <div className="w-full h-full p-6">
      <h1 className="text-2xl font-bold tracking-tight">Example Audit Checks</h1>
      <p className="text-muted-foreground">Select an audit type to view relevant requirements and evidence.</p>

      <div className="flex gap-4 mt-6">
        {/* Card 1: SQF Requirements Check */}
        <Card
          onClick={() => setSelectedCheck("SQF")}
          className={cn(
            "w-1/2 cursor-pointer hover:border-primary transition-colors",
            selectedCheck === "SQF" && "border-primary ring-2 ring-primary"
          )}
        >
          <CardHeader>
            <CardTitle>SQF Requirements Check</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Verify compliance with the Safe Quality Food (SQF) code, including monitoring procedures and corrective action protocols.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: FDA Checks */}
        <Card
          onClick={() => setSelectedCheck("FDA")}
          className={cn(
            "w-1/2 cursor-pointer hover:border-primary transition-colors",
            selectedCheck === "FDA" && "border-primary ring-2 ring-primary"
          )}
        >
          <CardHeader>
            <CardTitle>FDA Compliance Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
                Review adherence to Food and Drug Administration (FDA) regulations, such as FSMA and preventive controls.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conditionally Rendered Content */}
      {selectedCheck === "SQF" && renderSfqEvidence()}
      {selectedCheck === "FDA" && renderFdaEvidence()}
    </div>
  );
}