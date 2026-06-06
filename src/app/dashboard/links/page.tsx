import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { LinksTable } from "@/components/linksTable"
import { auth } from "@/lib/auth"
import { getLinksByUserId, getAllLinks } from "@/lib/db"
import { redirect } from "next/navigation"

export const runtime = 'nodejs';

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const links = session.user.role === 'admin'
    ? getAllLinks()
    : getLinksByUserId(parseInt(session.user.id))

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
        <SiteHeader title="Links" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <LinksTable links={links} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
