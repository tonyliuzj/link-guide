"use client"

import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alertDialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { normalizeDomain } from "@/lib/domainUtils"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string>("")
  const [domain, setDomain] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [baseResponse, setBaseResponse] = useState<string>("default")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<any>(null)

  function handleDomainBlur(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = normalizeDomain(event.currentTarget.value)
  }

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetch(`/api/domains/${p.id}`)
        .then(res => res.json())
        .then(data => {
          setDomain(data)
          setBaseResponse(data.base_response || '404')
        })
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => setSiteSettings(data))
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const domainValue = normalizeDomain(formData.get("domain")?.toString() || '')

    const res = await fetch(`/api/domains/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: domainValue,
        basePath: formData.get("basePath"),
        isActive: formData.get("isActive") === "on",
        allowGuestCreate: formData.get("allowGuestCreate") === "on",
        turnstileSiteKey: formData.get("turnstileSiteKey"),
        turnstileSecretKey: formData.get("turnstileSecretKey"),
        baseResponse,
        baseRedirectUrl: formData.get("baseRedirectUrl"),
      }),
    })

    if (res.ok) {
      toast.success("Domain updated successfully")
      router.push("/dashboard/domains")
    } else {
      toast.error("Failed to update domain")
      setLoading(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/domains/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Domain deleted successfully")
      router.push("/dashboard/domains")
    } else {
      toast.error("Failed to delete domain")
    }
    setDeleteDialogOpen(false)
  }

  if (!domain) return (
    <SidebarProvider style={{"--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)"} as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Edit Domain" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Skeleton className="h-9 w-20 mb-6" />
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
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
        <SiteHeader title="Edit Domain" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center gap-4 mb-6">
                  <Link href="/dashboard/domains">
                    <Button variant="ghost" size="sm">← Back</Button>
                  </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Domain Information</CardTitle>
                    <CardDescription>Update domain and base path</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="domain">Domain</Label>
                      <Input id="domain" name="domain" type="text" defaultValue={domain.domain} placeholder="example.com" onBlur={handleDomainBlur} />
                    </div>
                    <div>
                      <Label htmlFor="basePath">Base Path</Label>
                      <Input id="basePath" name="basePath" type="text" defaultValue={domain.base_path} placeholder="/" />
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
                      <Switch id="isActive" name="isActive" defaultChecked={domain.is_active === 1} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowGuestCreate">Allow Guest Create</Label>
                        <div className="text-sm text-muted-foreground">Allow guests to create links on this domain</div>
                      </div>
                      <Switch id="allowGuestCreate" name="allowGuestCreate" defaultChecked={domain.allow_guest_create === 1} />
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
                      <Input id="turnstileSiteKey" name="turnstileSiteKey" type="text" defaultValue={domain.turnstile_site_key || ''} placeholder="0x4AAA..." />
                    </div>
                    <div>
                      <Label htmlFor="turnstileSecretKey">Secret Key</Label>
                      <Input id="turnstileSecretKey" name="turnstileSecretKey" type="password" defaultValue={domain.turnstile_secret_key || ''} placeholder="0x4BBB..." />
                    </div>
                  </CardContent>
                </Card>

                <Card className={siteSettings?.site_domain === domain.domain ? "opacity-60" : ""}>
                  <CardHeader>
                    <CardTitle>Base Domain Response</CardTitle>
                    <CardDescription>
                      {siteSettings?.site_domain === domain.domain
                        ? "This is the site domain - base response cannot be configured"
                        : "Configure how the base domain responds when no short code is provided"}
                    </CardDescription>
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
                        disabled={siteSettings?.site_domain === domain.domain}
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
                          defaultValue={domain.base_redirect_url || ''}
                          placeholder="https://example.com"
                          required
                          disabled={siteSettings?.site_domain === domain.domain}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
                  <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Domain</Button>
                </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this domain? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
