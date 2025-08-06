"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  GalleryVerticalEnd,
  MessageCircle,
  SquareTerminal,
  Home
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavChats } from "@/components/sidebar/nav-chats"
import { NavUser } from "@/components/sidebar/nav-user"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"

// This is sample data.
const data = {
  user: {
    name: "Denver User",
    email: "demo@niagarawater.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Denver Plant",
      logo: GalleryVerticalEnd,
      plan: "Securely Connected",
    },
    {
      name: "Temple Plant",
      logo: AudioWaveform,
      plan: "Not Connect",
    },
    {
      name: "Dallas Plant",
      logo: Command,
      plan: "Not Connected",
    },
  ],
  navMain: [
    {title : "Home",url:"#",icon:Home,items:[]},
    {
      title: "Systems",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Presage",
          url: "#",
        },
        {
          title: "Ignition",
          url: "#",
        },
        {
          title: "Complaints",
          url: "#",
        },
        {
          title: "CAPA",
          url: "#",
        },
        {
          title: "Holds",
          url: "#",
        },
      ],
    },
    {
      title: "Tools",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Data Insights Chat",
          url: "#",
        },
        {
          title: "Graph Creator",
          url: "#",
        },
        {
          title: "Audit Center",
          url: "#",
        },
        {
          title: "Forecasts",
          url: "#",
        },
      ],
    },
    {
      title: "Help Center",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {title : "Super User Controls",url:"#",icon:Home,items:[]}
  ],
  chats: [
    {
      name: "Lab Testing Failures",
      url: "#",
      icon: MessageCircle,
    },
    {
      name: "About Open Holds",
      url: "#",
      icon: MessageCircle,
    },
    {
      name: "Introduction",
      url: "#",
      icon: MessageCircle,
    },
  ],
}

interface AppSidebarProps {
    isChatOpen: boolean
    onToggleChat: () => void
  }

export function AppSidebar({
    isChatOpen,
    onToggleChat,
    ...rest
  }: AppSidebarProps & Omit<React.ComponentProps<typeof Sidebar>, "open" | "onOpenChange">) {
  return (
    <Sidebar collapsible="icon" {...rest}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavChats chats={data.chats} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
        <Button variant="ghost" size="sm" onClick={onToggleChat}>
           {isChatOpen ? "Close Chat" : "Open Chat"}
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
