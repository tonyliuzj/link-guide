"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

import { NavMain } from "@/components/navMain"
import { NavUser } from "@/components/navUser"
import { HelpDialog } from "@/components/helpDialog"
import { SearchDialog } from "@/components/searchDialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ListIcon, DatabaseIcon, LinkIcon, Settings2Icon, CircleHelpIcon, UsersIcon, ShieldBanIcon } from "lucide-react"
import Link from "next/link"

const allNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
    adminOnly: false,
  },
  {
    title: "Links",
    url: "/dashboard/links",
    icon: <ListIcon />,
    adminOnly: false,
  },
  {
    title: "Domains",
    url: "/dashboard/domains",
    icon: <DatabaseIcon />,
    adminOnly: true,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: <UsersIcon />,
    adminOnly: true,
  },
  {
    title: "Blacklist",
    url: "/dashboard/blacklist",
    icon: <ShieldBanIcon />,
    adminOnly: true,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const [helpOpen, setHelpOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [siteTitle, setSiteTitle] = useState("LinkGuide")

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.site_title) {
          setSiteTitle(data.site_title)
        }
      })
      .catch(() => {
        // Keep default title on error
      })
  }, [])

  const isAdmin = session?.user?.role === 'admin'
  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin)
  const navUser = session?.user
    ? {
        name: session.user.name ?? undefined,
        email: session.user.email ?? undefined,
        avatar: session.user.image ?? undefined,
      }
    : undefined

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="data-[slot=sidebar-menu-button]:p-1.5!"
                render={(props) => <Link href="/dashboard" {...props} />}
              >
                <LinkIcon className="size-5!" />
                <span className="text-base font-semibold">{siteTitle}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navItems} />
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={(props) => <Link href="/dashboard/settings" {...props} />}
                      tooltip="Site Settings"
                    >
                      <Settings2Icon />
                      <span>Site Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setHelpOpen(true)}
                    tooltip="Help"
                  >
                    <CircleHelpIcon />
                    <span>Help</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={navUser} />
        </SidebarFooter>
      </Sidebar>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
