"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { normalizeDomain } from "@/lib/domain-utils"

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [turnstileLandingCreate, setTurnstileLandingCreate] = useState(false)
  const [turnstileLogin, setTurnstileLogin] = useState(false)
  const [turnstileSignup, setTurnstileSignup] = useState(false)

  function handleDomainBlur(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = normalizeDomain(event.currentTarget.value)
  }

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      router.push("/login")
      return
    }
    if (session.user.role !== "admin") {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setSettings(data)
        setTurnstileLandingCreate(data.turnstile_landing_create === 1)
        setTurnstileLogin(data.turnstile_login === 1)
        setTurnstileSignup(data.turnstile_signup === 1)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteTitle: formData.get("siteTitle"),
        siteDomain: normalizeDomain(formData.get("siteDomain")?.toString() || ""),
        turnstileSiteKey: formData.get("turnstileSiteKey"),
        turnstileSecretKey: formData.get("turnstileSecretKey"),
        turnstileLandingCreate,
        turnstileLogin,
        turnstileSignup,
      }),
    })

    if (res.ok) {
      toast.success("Settings saved successfully")
    } else {
      toast.error("Failed to save settings")
    }

    setLoading(false)
  }

  if (!settings) return (
    <SidebarProvider style={{"--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)"} as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Site Settings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )

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
        <SiteHeader title="Site Settings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Configure global application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="siteTitle">Site Title</Label>
                  <Input id="siteTitle" name="siteTitle" defaultValue={settings.site_title || 'LinkGuide'} />
                </div>
                <div>
                  <Label htmlFor="siteDomain">Site Domain</Label>
                  <Input
                    id="siteDomain"
                    name="siteDomain"
                    defaultValue={settings.site_domain || ''}
                    placeholder="example.com"
                    onBlur={handleDomainBlur}
                    required
                  />
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure Cloudflare Turnstile for bot protection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="turnstileSiteKey">Turnstile Site Key</Label>
                  <Input id="turnstileSiteKey" name="turnstileSiteKey" type="text" defaultValue={settings.turnstile_site_key || ''} placeholder="0x4AAA..." />
                </div>
                <div>
                  <Label htmlFor="turnstileSecretKey">Turnstile Secret Key</Label>
                  <Input id="turnstileSecretKey" name="turnstileSecretKey" type="password" defaultValue={settings.turnstile_secret_key || ''} placeholder="0x4BBB..." />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="turnstileLandingCreate">Landing Page Creation</Label>
                    <div className="text-sm text-muted-foreground">Require verification when creating links</div>
                  </div>
                  <Switch id="turnstileLandingCreate" checked={turnstileLandingCreate} onCheckedChange={setTurnstileLandingCreate} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="turnstileLogin">Login</Label>
                    <div className="text-sm text-muted-foreground">Require verification on login</div>
                  </div>
                  <Switch id="turnstileLogin" checked={turnstileLogin} onCheckedChange={setTurnstileLogin} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="turnstileSignup">Signup</Label>
                    <div className="text-sm text-muted-foreground">Require verification on signup</div>
                  </div>
                  <Switch id="turnstileSignup" checked={turnstileSignup} onCheckedChange={setTurnstileSignup} />
                </div>
            </CardContent>
          </Card>

                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
