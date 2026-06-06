import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DomainsTable } from "@/components/domainsTable"
import { auth } from "@/lib/auth"
import { getAllDomains } from "@/lib/db"
import { redirect } from "next/navigation"

export const runtime = 'nodejs';

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== 'admin') redirect("/dashboard")

  const domains = getAllDomains()

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
        <SiteHeader title="Domains" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <DomainsTable domains={domains} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
