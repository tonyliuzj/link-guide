"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string>("")
  const [link, setLink] = useState<any>(null)
  const [domain, setDomain] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<string>("simple")
  const [statsEnabled, setStatsEnabled] = useState(true)
  const [turnstileEnabled, setTurnstileEnabled] = useState(false)
  const [redirectDelay, setRedirectDelay] = useState<number | ''>(0)
  const [allowSkip, setAllowSkip] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetch(`/api/links/${p.id}`)
        .then(res => res.json())
        .then(data => {
          setLink(data)
          setMode(data.mode)
          setStatsEnabled(data.stats_enabled === 1)
          setTurnstileEnabled(data.turnstile_enabled === 1)
          setRedirectDelay(data.redirect_delay || 0)
          setAllowSkip(data.allow_skip === 1)

          // Fetch domain info
          return fetch(`/api/domains/${data.domain_id}`)
        })
        .then(res => res.json())
        .then(domainData => {
          setDomain(domainData)
        })
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const body: any = {
      destinationUrl: formData.get("destinationUrl"),
      mode,
      statsEnabled,
      turnstileEnabled,
      redirectDelay: redirectDelay === '' ? 0 : redirectDelay,
      allowSkip,
    }

    if (mode === "password") {
      const password = formData.get("password")?.toString()
      if (password) {
        const bcrypt = await import("bcryptjs")
        body.passwordHash = await bcrypt.hash(password, 10)
      }
    }

    if (mode === "custom_page") {
      body.customPageConfig = JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        buttonText: formData.get("buttonText"),
      })
    }

    const res = await fetch(`/api/links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      toast.success("Link updated successfully")
      router.push("/dashboard/links")
    } else {
      toast.error("Failed to update link")
      setLoading(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/links/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Link deleted successfully")
      router.push("/dashboard/links")
    } else {
      toast.error("Failed to delete link")
    }
    setDeleteDialogOpen(false)
  }

  if (!link) return (
    <SidebarProvider style={{"--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)"} as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Edit Link" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Skeleton className="h-9 w-20 mb-6" />
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
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

  const customConfig = link.custom_page_config ? JSON.parse(link.custom_page_config) : {}

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
        <SiteHeader title="Edit Link" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center gap-4 mb-6">
                  <Link href="/dashboard/links">
                    <Button variant="ghost" size="sm">← Back</Button>
                  </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Link Details</CardTitle>
                    <CardDescription>Short Code: {link.short_code}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="destinationUrl">Destination URL</Label>
                      <Input id="destinationUrl" name="destinationUrl" type="url" defaultValue={link.destination_url} required />
                    </div>
                    <div>
                      <Label htmlFor="mode">Redirect Mode</Label>
                      <Select value={mode} onValueChange={(value) => value && setMode(value)}>
                        <SelectTrigger id="mode">
                          <SelectValue>
                            {mode === 'simple' && 'Simple Redirect'}
                            {mode === 'custom_page' && 'Custom Page'}
                            {mode === 'password' && 'Password Protected'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple Redirect</SelectItem>
                          <SelectItem value="custom_page">Custom Page</SelectItem>
                          <SelectItem value="password">Password Protected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="statsEnabled">Stats Enabled</Label>
                      <Switch id="statsEnabled" checked={statsEnabled} onCheckedChange={setStatsEnabled} />
                    </div>
                  </CardContent>
                </Card>

                {mode === "simple" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Redirect Settings</CardTitle>
                      <CardDescription>Configure redirect delay and verification</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
                        <Input
                          id="redirectDelay"
                          name="redirectDelay"
                          type="number"
                          min="0"
                          value={redirectDelay}
                          onChange={(e) => setRedirectDelay(e.target.value === '' ? '' : parseInt(e.target.value))}
                        />
                      </div>
                      {domain?.turnstile_site_key && (
                        <div className="flex items-center justify-between">
                          <Label htmlFor="turnstileEnabled">Enable Turnstile Verification</Label>
                          <Switch id="turnstileEnabled" checked={turnstileEnabled} onCheckedChange={setTurnstileEnabled} />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allowSkip">Allow Skip</Label>
                        <Switch id="allowSkip" checked={allowSkip} onCheckedChange={setAllowSkip} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mode === "password" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Password Protection</CardTitle>
                      <CardDescription>Leave blank to keep existing password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="turnstileEnabled">Enable Turnstile Verification</Label>
                        <Switch id="turnstileEnabled" checked={turnstileEnabled} onCheckedChange={setTurnstileEnabled} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mode === "custom_page" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Custom Page</CardTitle>
                      <CardDescription>Configure the custom landing page</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" defaultValue={customConfig.title || ''} />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" defaultValue={customConfig.description || ''} />
                      </div>
                      <div>
                        <Label htmlFor="buttonText">Button Text</Label>
                        <Input id="buttonText" name="buttonText" defaultValue={customConfig.buttonText || ''} />
                      </div>
                      {domain?.turnstile_site_key && (
                        <div className="flex items-center justify-between">
                          <Label htmlFor="turnstileEnabled">Enable Turnstile Verification</Label>
                          <Switch id="turnstileEnabled" checked={turnstileEnabled} onCheckedChange={setTurnstileEnabled} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
                  <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Link</Button>
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
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this link? This action cannot be undone.
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
