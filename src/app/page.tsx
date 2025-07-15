'use client'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import ChatSection from "@/components/chat-section"
import {useState} from "react"
import MetricCard from "@/components/graphs/metric-card"
import { useTheme } from "next-themes"
import GraphCard from "@/components/graphs/line-graph-card"
import {z} from "zod"

export default function Page() {
  const [isChatOpen  , setIsChatOpen] = useState(false)
  const { theme, setTheme } = useTheme();
  const sampleData = [
      { month: 'Jan', sales: 400 },
      { month: 'Feb', sales: 600 },
      { month: 'Mar', sales: 800 },
    ];

  return (
    <SidebarProvider>
      <AppSidebar isChatOpen = {isChatOpen} onToggleChat={()=>setIsChatOpen((v) => !v)} />
      <SidebarInset>
        <header className="flex h-[5vh] shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage>
                    Denver QPF
                  </BreadcrumbPage>
                </BreadcrumbItem>
                {/* <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem> */}
              </BreadcrumbList>
            </Breadcrumb>
            <button onClick={()=>setTheme(val => {return val=="dark"?"light":"dark"})}>change theme</button>
          </div>
        </header>
        <div className="flex h-[95vh] ">
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-scroll">
            {/*<TASK> : Grid should be self organizing  the children should not chang soze if the length of the parent component changes please tell me what changes to make to the make this possible, also grid should all card of same width and number should not exceed 4*/}
            <div className="flex gap-4 flex-wrap">
              <MetricCard badgeIcon="trending-up" title = "growth this month" metricValue="1234" badgeValue="12.5%" footerText={{line1 : "the trends is upward this time" , line2 : "this second line of the footer"}}/>
              <MetricCard badgeIcon="trending-up" title = "growth this month" metricValue="1234" badgeValue="12.5%" footerText={{line1 : "the trends is upward this time" , line2 : "this second line of the footer"}}/>
              <MetricCard badgeIcon="trending-up" title = "growth this month" metricValue="1234" badgeValue="12.5%" footerText={{line1 : "the trends is upward this time" , line2 : "this second line of the footer"}}/>
            </div>
            <div className="bg-muted/50 min-h-[100vh] flex rounded-xl md:min-h-min" >
              <div className = "w-[50%]">
                <GraphCard
                    title="Complaints Breakdown"
                    description="Total Complaints in Each Category"
                    data={{query : `SELECT SUBJECT_LEVEL_3 , count(*) as NUM_COMPLAINTS from COMPLAINTS GROUP BY SUBJECT_LEVEL_3;`}}
                    axisConfig={[
                      { axisType: 'x', props: { dataKey: 'SUBJECT_LEVEL_3', type: 'category' } },
                      { axisType: 'y', props: { dataKey: 'NUM_COMPLAINTS' } },
                    ]}
                    markConfig={[
                      { markType: 'bar', props: { dataKey: 'NUM_COMPLAINTS' , fill : "lavender" } },
                    ]}
                    referenceMarks={[
                      // { markType: 'line', props: { y: 700, stroke: '#ff7300', strokeDasharray: '5 5' } },
                    ]}
                    responsiveContainer={{ width: '100%', height: 300  , children : <></>}}
                    tooltip={{}}
                    cartesianGrid={{}}
                    formSchema={z.object({ threshold: z.number().min(0).max(100) })}
                  />
                  
              </div>
              <div className = "w-[50%]">
                <GraphCard
                    title="Monthly Sales"
                    description="Sales figures for Q1"
                    data={{table : sampleData}}
                    axisConfig={[
                      { axisType: 'x', props: { dataKey: 'month', type: 'category' } },
                      { axisType: 'y', props: { domain: [0, 'dataMax + 100'] } },
                    ]}
                    markConfig={[
                      { markType: 'line', props: { dataKey: 'sales', stroke: '#8884d8', strokeWidth: 2 } },
                    ]}
                    referenceMarks={[
                      { markType: 'line', props: { y: 700, stroke: '#ff7300', strokeDasharray: '5 5' } },
                    ]}
                    responsiveContainer={{ width: '100%', height: 300  , children : <></>}}
                    tooltip={{}}
                    cartesianGrid={{ strokeDasharray: '3 3' }}
                    formSchema={z.object({ threshold: z.number().min(0).max(100) })}
                  />
                  
              </div>
            </div>
               
          </div>
          {/* Div width is changing because this this being added, everything the working great  just the grid has */}
          {isChatOpen && (
            <div className="w-[50%] bg-secondary h-[100%] overflow-scroll animate-slide-in">
              <ChatSection />
            </div>
          )}
          
        </div>
        
      </SidebarInset>
    </SidebarProvider>
  )
}
