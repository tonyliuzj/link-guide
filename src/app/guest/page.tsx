import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const runtime = 'nodejs';

export default async function GuestDashboard() {
  const session = await auth()

  // If user is logged in, redirect to main dashboard
  if (session?.user?.id) {
    redirect("/dashboard")
  }

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
        <SiteHeader title="Guest Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome, Guest!</CardTitle>
                    <CardDescription>Create and manage short links</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You are currently using LinkGuide as a guest. To access full features including link management, analytics, and custom domains, please sign in or create an account.
                    </p>
                    <div className="flex gap-2">
                      <Link href="/login">
                        <Button>Sign In</Button>
                      </Link>
                      <Link href="/signup">
                        <Button variant="outline">Sign Up</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
