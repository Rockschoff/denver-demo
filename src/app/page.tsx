/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
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
import { useState } from "react"
import { useTheme } from "next-themes"
import PresageDashboard from "@/components/presage/presageDashboard"
import IgnitionDashboard from "@/components/ignition/IgnitionDasboard"
import ComplaintsDashboard from "@/components/complaints/complaintsDashboard"
import { useCurrentPageSelection } from "@/lib/zustandStores";
import AuditCenter from "@/components/auditCenter/auditCenter"
import GraphCreator from "@/components/graphCreator/graphCreator"
import HomePage from "@/components/home/HomePage"
import SuperUseControls from "@/components/supserUserControls/superUserControls"

export default function Page() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { selectedItem, selectedParent } = useCurrentPageSelection();
  // const { theme, setTheme } = useTheme();

  // This function determines which dashboard component to render
  // based on the currently selected item from the Zustand store.
  const renderSelectedDashboard = () => {
    switch (selectedItem) {
      case "Presage":
        return <PresageDashboard />;
      case "Ignition":
        return <IgnitionDashboard />;
      case "Complaints":
        return <ComplaintsDashboard />;
      case "Audit Center":
        return <AuditCenter />;
      case "Graph Creator":
        return <GraphCreator />;
      case "Home":
        return <HomePage />;
      case "Super User Controls":
        return <SuperUseControls />;
      default:
        // You can return a default view or null
        return (
            // <div className="flex items-center justify-center h-full">
            //     <p className="text-muted-foreground">Select an item from the sidebar to view a dashboard.</p>
            // </div>
            <HomePage/>
        );
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen((v) => !v)} />
      <SidebarInset>
        <header className="flex h-[5vh] shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            {/* Breadcrumb now dynamically updates based on selection */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Denver QPF</BreadcrumbLink>
                </BreadcrumbItem>
                {selectedParent && <BreadcrumbSeparator />}
                {selectedParent && (
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">{selectedParent}</BreadcrumbLink>
                  </BreadcrumbItem>
                )}
                {selectedItem && <BreadcrumbSeparator />}
                {selectedItem && (
                    <BreadcrumbItem>
                        <BreadcrumbPage>{selectedItem}</BreadcrumbPage>
                    </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex h-[95vh] ">
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
            {/* Call the render function here */}
            {renderSelectedDashboard()}
          </div>
          {/* The chat section will slide in from the right when toggled */}
          {isChatOpen && (
            <div className="w-[35vw] bg-secondary h-full overflow-y-auto animate-slide-in border-l">
              <ChatSection />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
