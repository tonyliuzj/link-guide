"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { normalizeDomain } from "@/lib/domain-utils"

export function SetupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  function handleDomainBlur(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = normalizeDomain(event.currentTarget.value)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirm-password") as string
    const domain = normalizeDomain(formData.get("domain") as string)
    const basePath = formData.get("base-path") as string

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, domain, basePath }),
    })

    if (res.ok) {
      router.push("/login")
    } else {
      const data = await res.json()
      setError(data.error || "Setup failed")
      setLoading(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Welcome to LinkGuide</CardTitle>
        <CardDescription>
          Create your admin account and configure your first domain
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>Must be at least 8 characters long.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <Input id="confirm-password" name="confirm-password" type="password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="domain">Domain</FieldLabel>
              <Input id="domain" name="domain" type="text" placeholder="example.com" onBlur={handleDomainBlur} required />
              <FieldDescription>Your primary domain for short links.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="base-path">Base Path</FieldLabel>
              <Input id="base-path" name="base-path" type="text" placeholder="/" defaultValue="/" />
              <FieldDescription>URL path prefix (e.g., / or /url).</FieldDescription>
            </Field>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
