"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TurnstileWidget } from "@/components/turnstile-widget"

export function SignupForm({
  turnstileSiteKey,
  turnstileRequired = false,
  ...props
}: React.ComponentProps<typeof Card> & {
  turnstileSiteKey?: string
  turnstileRequired?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirm-password") as string

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (turnstileRequired && (!turnstileSiteKey || !turnstileToken)) {
      setError("Verification is required")
      setLoading(false)
      return
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password,
        turnstileToken,
      }),
    })

    if (res.ok) {
      router.push("/login")
    } else {
      const data = await res.json()
      setError(data.error || "Signup failed")
      setTurnstileToken("")
      setTurnstileKey((key) => key + 1)
      setLoading(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input id="confirm-password" name="confirm-password" type="password" required />
            </Field>
            {turnstileRequired && turnstileSiteKey && (
              <TurnstileWidget
                key={turnstileKey}
                siteKey={turnstileSiteKey}
                onToken={setTurnstileToken}
              />
            )}
            {error && <div className="text-sm text-red-500">{error}</div>}
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={loading || (turnstileRequired && !turnstileToken)}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
