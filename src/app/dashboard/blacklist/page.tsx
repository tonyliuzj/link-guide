import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { getAllBlacklist } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BlacklistTable } from "@/components/blacklistTable"

export const runtime = 'nodejs';

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== 'admin') redirect("/dashboard")

  const blacklist = getAllBlacklist()

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
        <SiteHeader title="Blacklist" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex justify-between items-center mb-6">
                  <Link href="/dashboard/blacklist/new">
                    <Button>Add Path</Button>
                  </Link>
                </div>
                <BlacklistTable initialData={blacklist} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
