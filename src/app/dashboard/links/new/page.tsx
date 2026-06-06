"use client"

import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function Page() {
  const [domains, setDomains] = useState<any[]>([])
  const [selectedDomainId, setSelectedDomainId] = useState("")
  const [mode, setMode] = useState("simple")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetch("/api/domains").then(r => r.json()).then((data) => {
      setDomains(data)
      setSelectedDomainId(data[0]?.id?.toString() || "")
    })
  }, [])

  const selectedDomain = domains.find((d: any) => d.id.toString() === selectedDomainId)
  const hasTurnstile = !!selectedDomain?.turnstile_site_key?.trim()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const domainId = parseInt(formData.get("domain") as string)
    const turnstileEnabled = hasTurnstile && formData.get("turnstileEnabled") === "on"
    const data: any = {
      destinationUrl: formData.get("destination"),
      domainId,
      shortCode: formData.get("shortCode") || undefined,
      mode,
      statsEnabled: formData.get("stats") === "on",
      redirectDelay: parseInt(formData.get("redirectDelay")?.toString() || "0"),
      allowSkip: formData.get("allowSkip") === "on",
      turnstileEnabled,
    }

    if (mode === "password") {
      data.password = formData.get("password")
    } else if (mode === "custom_page") {
      data.customPageConfig = {
        title: formData.get("title"),
        description: formData.get("description"),
        buttonText: formData.get("buttonText"),
      }
    }

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      toast.success("Link created successfully")
      router.push("/dashboard/links")
    } else {
      const data = await res.json()
      const errorMessage = data.error || "Failed to create link"
      toast.error(errorMessage)
      setError(errorMessage)
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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Short Link</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="destination">Destination URL</Label>
                  <Input id="destination" name="destination" type="url" required />
                </div>
                <div>
                  <Label htmlFor="domain">Domain</Label>
                  <select
                    id="domain"
                    name="domain"
                    className="w-full border rounded p-2"
                    value={selectedDomainId}
                    onChange={(e) => setSelectedDomainId(e.target.value)}
                    required
                  >
                    {domains.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.domain}{d.base_path}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="shortCode">Short Code (leave empty for auto-generate)</Label>
                  <Input id="shortCode" name="shortCode" type="text" />
                </div>
                <div>
                  <Label htmlFor="mode">Redirect Mode</Label>
                  <select id="mode" name="mode" className="w-full border rounded p-2" value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="simple">Simple Redirect</option>
                    <option value="custom_page">Custom Page</option>
                    <option value="password">Password Protected</option>
                  </select>
                </div>
                {mode === "simple" && (
                  <>
                    <div>
                      <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
                      <Input id="redirectDelay" name="redirectDelay" type="number" min="0" defaultValue="0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="allowSkip" name="allowSkip" type="checkbox" defaultChecked />
                      <Label htmlFor="allowSkip">Allow skip redirect</Label>
                    </div>
                    {hasTurnstile && (
                      <div className="flex items-center gap-2">
                        <input id="turnstileEnabled" name="turnstileEnabled" type="checkbox" />
                        <Label htmlFor="turnstileEnabled">Enable Turnstile verification</Label>
                      </div>
                    )}
                  </>
                )}
                {mode === "password" && (
                  <>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" name="password" type="password" required />
                    </div>
                    <div>
                      <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
                      <Input id="redirectDelay" name="redirectDelay" type="number" min="0" defaultValue="0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="allowSkip" name="allowSkip" type="checkbox" defaultChecked />
                      <Label htmlFor="allowSkip">Allow skip redirect</Label>
                    </div>
                    {hasTurnstile && (
                      <div className="flex items-center gap-2">
                        <input id="turnstileEnabled" name="turnstileEnabled" type="checkbox" />
                        <Label htmlFor="turnstileEnabled">Enable Turnstile verification</Label>
                      </div>
                    )}
                  </>
                )}
                {mode === "custom_page" && (
                  <>
                    <div>
                      <Label htmlFor="title">Page Title</Label>
                      <Input id="title" name="title" type="text" />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" type="text" />
                    </div>
                    <div>
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input id="buttonText" name="buttonText" type="text" defaultValue="Continue" />
                    </div>
                    <div>
                      <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
                      <Input id="redirectDelay" name="redirectDelay" type="number" min="0" defaultValue="0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="allowSkip" name="allowSkip" type="checkbox" defaultChecked />
                      <Label htmlFor="allowSkip">Allow skip redirect</Label>
                    </div>
                    {hasTurnstile && (
                      <div className="flex items-center gap-2">
                        <input id="turnstileEnabled" name="turnstileEnabled" type="checkbox" />
                        <Label htmlFor="turnstileEnabled">Enable Turnstile verification</Label>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center gap-2">
                  <input id="stats" name="stats" type="checkbox" defaultChecked />
                  <Label htmlFor="stats">Enable stats tracking</Label>
                </div>
                {error && <div className="text-sm text-red-500">{error}</div>}
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Link"}
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
