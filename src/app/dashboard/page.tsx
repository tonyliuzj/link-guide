import { AppSidebar } from "@/components/appSidebar"
import { ChartAreaInteractive } from "@/components/chartAreaInteractive"
import { StatsBreakdownCards } from "@/components/statsBreakdownCards"
import { TopLinksTable } from "@/components/topLinksTable"
import { SectionCards } from "@/components/sectionCards"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { getAllLinks, getLinksByUserId, getAllStatsGroupedByDate, getStatsGroupedByDateForUser, getStatsBreakdown } from "@/lib/db"
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

  const breakdown = getStatsBreakdown(session.user.role === 'admin' ? undefined : parseInt(session.user.id))

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
              <StatsBreakdownCards data={breakdown} />
              <TopLinksTable links={links} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
