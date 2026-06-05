"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { normalizeDomain } from "@/lib/domain-utils"

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [allowGuestCreate, setAllowGuestCreate] = useState(false)
  const [baseResponse, setBaseResponse] = useState("default")
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSiteSettings(data))
  }, [])

  function handleDomainBlur(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = normalizeDomain(event.currentTarget.value)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const domainValue = normalizeDomain(formData.get("domain")?.toString() || '')

    const data = {
      domain: domainValue,
      basePath: formData.get("basePath"),
      isActive,
      allowGuestCreate,
      turnstileSiteKey: formData.get("turnstileSiteKey"),
      turnstileSecretKey: formData.get("turnstileSecretKey"),
      baseResponse,
      baseRedirectUrl: formData.get("baseRedirectUrl"),
    }

    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      toast.success("Domain added successfully")
      router.push("/dashboard/domains")
    } else {
      const data = await res.json()
      toast.error(data.error || "Failed to add domain")
      setError(data.error || "Failed to add domain")
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
        <SiteHeader title="Add Domain" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Domain Information</CardTitle>
                    <CardDescription>Add domain and base path</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="domain">Domain</Label>
                      <Input id="domain" name="domain" type="text" placeholder="example.com" onBlur={handleDomainBlur} required />
                    </div>
                    <div>
                      <Label htmlFor="basePath">Base Path</Label>
                      <Input id="basePath" name="basePath" type="text" placeholder="/" defaultValue="/" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Domain Settings</CardTitle>
                    <CardDescription>Configure domain preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isActive">Active</Label>
                        <div className="text-sm text-muted-foreground">Enable or disable this domain</div>
                      </div>
                      <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowGuestCreate">Allow Guest Create</Label>
                        <div className="text-sm text-muted-foreground">Allow guests to create links on this domain</div>
                      </div>
                      <Switch id="allowGuestCreate" checked={allowGuestCreate} onCheckedChange={setAllowGuestCreate} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cloudflare Turnstile</CardTitle>
                    <CardDescription>Configure Turnstile for bot protection</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="turnstileSiteKey">Site Key</Label>
                      <Input id="turnstileSiteKey" name="turnstileSiteKey" type="text" placeholder="0x4AAA..." />
                    </div>
                    <div>
                      <Label htmlFor="turnstileSecretKey">Secret Key</Label>
                      <Input id="turnstileSecretKey" name="turnstileSecretKey" type="password" placeholder="0x4BBB..." />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Base Domain Response</CardTitle>
                    <CardDescription>Configure how the base domain responds when no short code is provided</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="baseResponse">Response Type</Label>
                      <select
                        id="baseResponse"
                        name="baseResponse"
                        className="w-full px-3 py-2 border rounded-md"
                        value={baseResponse}
                        onChange={(e) => setBaseResponse(e.target.value)}
                      >
                        <option value="default">Default</option>
                        <option value="404">404 Not Found</option>
                        <option value="444">444 Connection Closed</option>
                        <option value="redirect">Redirect to URL</option>
                        <option value="custom">Custom Page</option>
                      </select>
                    </div>
                    {baseResponse === 'redirect' && (
                      <div>
                        <Label htmlFor="baseRedirectUrl">Redirect URL</Label>
                        <Input
                          id="baseRedirectUrl"
                          name="baseRedirectUrl"
                          type="url"
                          placeholder="https://example.com"
                          required
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {error && <div className="text-sm text-red-500">{error}</div>}
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Domain"}
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
