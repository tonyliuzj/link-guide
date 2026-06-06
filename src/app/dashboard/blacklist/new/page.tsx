"use client"

import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export default function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const res = await fetch("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: formData.get("path"),
        reason: formData.get("reason"),
      }),
    })

    if (res.ok) {
      toast.success("Path added to blacklist successfully")
      router.push("/dashboard/blacklist")
    } else {
      const data = await res.json()
      toast.error(data.error || "Failed to add path")
      setError(data.error || "Failed to add path")
      setLoading(false)
    }
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
        <SiteHeader title="Add Blacklisted Path" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center gap-4 mb-6">
                  <Link href="/dashboard/blacklist">
                    <Button variant="ghost" size="sm">← Back</Button>
                  </Link>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Blacklist Path</CardTitle>
                    <CardDescription>Prevent a path from being used as a short code</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="path">Path</Label>
                        <Input
                          id="path"
                          name="path"
                          type="text"
                          placeholder="admin"
                          pattern="[a-zA-Z0-9-_]+"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason (optional)</Label>
                        <Input
                          id="reason"
                          name="reason"
                          type="text"
                          placeholder="Reserved path"
                        />
                      </div>
                      {error && <div className="text-sm text-red-500">{error}</div>}
                      <Button type="submit" disabled={loading}>
                        {loading ? "Adding..." : "Add Path"}
                      </Button>
                    </form>
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
