"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check } from "lucide-react"

export function GuestLinkForm({
  domains,
  turnstileSiteKey,
  turnstileRequired = false
}: {
  domains: any[]
  turnstileSiteKey?: string
  turnstileRequired?: boolean
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState("simple")
  const [turnstileKey, setTurnstileKey] = useState(0)

  useEffect(() => {
    if (turnstileSiteKey && turnstileRequired) {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [turnstileSiteKey, turnstileRequired])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setCreatedLink(null)

    const formData = new FormData(e.currentTarget)
    formData.set("mode", mode)

    try {
      const res = await fetch("/api/guest/create", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to create link")
        setIsSubmitting(false)
        return
      }

      setCreatedLink(data.shortUrl)
    } catch (error) {
      toast.error("Failed to create link")
    } finally {
      setIsSubmitting(false)
    }
  }

  function copyToClipboard() {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function createAnother() {
    setCreatedLink(null)
    setCopied(false)
    setTurnstileKey(prev => prev + 1)
  }

  if (createdLink) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-green-700">Link Created Successfully!</CardTitle>
          <CardDescription>Your short link is ready to use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={createdLink} readOnly className="font-mono" />
            <Button onClick={copyToClipboard} variant="outline" size="icon">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={createAnother} className="w-full">Create Another Link</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="domain">Select Domain</Label>
        <select
          id="domain"
          name="domain"
          className="w-full px-3 py-2 border rounded-md"
          required
        >
          {domains.map((domain: any) => (
            <option key={domain.id} value={domain.id}>
              {domain.domain}{domain.base_path !== '/' ? domain.base_path : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Destination URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://example.com/your/long/url"
          className="text-base"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortCode">Custom Short Code (optional)</Label>
        <Input
          id="shortCode"
          name="shortCode"
          type="text"
          placeholder="my-custom-link"
          pattern="[a-zA-Z0-9-_]+"
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">Leave blank for random code</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mode">Redirect Mode</Label>
        <Select value={mode} onValueChange={(value) => value && setMode(value)}>
          <SelectTrigger>
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

      {mode === "simple" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
            <Input
              id="redirectDelay"
              name="redirectDelay"
              type="number"
              min="0"
              defaultValue="0"
              placeholder="0"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowSkip"
              name="allowSkip"
              defaultChecked
              className="h-4 w-4"
            />
            <Label htmlFor="allowSkip" className="cursor-pointer">Allow skip redirect</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="turnstileEnabled"
              name="turnstileEnabled"
              className="h-4 w-4"
            />
            <Label htmlFor="turnstileEnabled" className="cursor-pointer">Enable Turnstile verification</Label>
          </div>
        </>
      )}

      {mode === "password" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
            <Input
              id="redirectDelay"
              name="redirectDelay"
              type="number"
              min="0"
              defaultValue="0"
              placeholder="0"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="turnstileEnabled"
              name="turnstileEnabled"
              className="h-4 w-4"
            />
            <Label htmlFor="turnstileEnabled" className="cursor-pointer">Enable Turnstile verification</Label>
          </div>
        </>
      )}

      {mode === "custom_page" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="Redirecting..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="You will be redirected shortly."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              name="buttonText"
              type="text"
              placeholder="Continue"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="turnstileEnabled"
              name="turnstileEnabled"
              className="h-4 w-4"
            />
            <Label htmlFor="turnstileEnabled" className="cursor-pointer">Enable Turnstile verification</Label>
          </div>
        </>
      )}

      {turnstileSiteKey && turnstileRequired && (
        <div key={turnstileKey} className="flex justify-center">
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
          />
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Short Link"}
      </Button>
    </form>
  )
}
