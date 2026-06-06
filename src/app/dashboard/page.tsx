import { AppSidebar } from "@/components/appSidebar"
import { ChartAreaInteractive } from "@/components/chartAreaInteractive"
import { DataTable } from "@/components/dataTable"
import { SectionCards } from "@/components/sectionCards"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { getAllLinks, getLinksByUserId, getAllStatsGroupedByDate, getStatsGroupedByDateForUser } from "@/lib/db"
import { redirect } from "next/navigation"

export const runtime = 'nodejs';

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const links = session.user.role === 'admin'
    ? getAllLinks()
    : getLinksByUserId(parseInt(session.user.id))

  const statsData = session.user.role === 'admin'
    ? getAllStatsGroupedByDate()
    : getStatsGroupedByDateForUser(parseInt(session.user.id))

  const tableData = links.map((link) => ({
    id: link.id,
    header: link.short_code,
    type: link.mode.replace("_", " "),
    status: link.expires_at && new Date(link.expires_at) < new Date() ? "Expired" : "Done",
    target: String(link.click_count ?? 0),
    limit: link.destination_url,
    reviewer: link.owner_name || "Guest",
  }))

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards data={links} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={statsData} />
              </div>
              <DataTable data={tableData} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
