"use client"

import { cn } from "@/lib/utils"
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
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TurnstileWidget } from "@/components/turnstileWidget"

export function LoginForm({
  turnstileSiteKey,
  turnstileRequired = false,
  showForgotPassword = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  turnstileSiteKey?: string
  turnstileRequired?: boolean
  showForgotPassword?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [unverifiedEmail, setUnverifiedEmail] = useState("")
  const [resent, setResent] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)
  const router = useRouter()

  async function handleResend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail }),
    })
    setResent(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    if (turnstileRequired && (!turnstileSiteKey || !turnstileToken)) {
      setError("Verification is required")
      setLoading(false)
      return
    }

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      "cf-turnstile-response": turnstileToken,
      redirect: false,
    })

    if (result?.error) {
      setUnverifiedEmail(result.code === "email_not_verified" ? String(formData.get("email")) : "")
      setError(result.code === "email_not_verified" ? "Please verify your email address before logging in." : "Invalid email or password")
      setTurnstileToken("")
      setTurnstileKey((key) => key + 1)
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
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
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {showForgotPassword && (
                    <Link href="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">
                      Forgot your password?
                    </Link>
                  )}
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              {turnstileRequired && turnstileSiteKey && (
                <TurnstileWidget
                  key={turnstileKey}
                  siteKey={turnstileSiteKey}
                  onToken={setTurnstileToken}
                />
              )}
              {error && <div className="text-sm text-red-500">{error}</div>}
              {unverifiedEmail && (
                resent ? (
                  <div className="text-sm text-muted-foreground">If that account is unverified, a new verification email is on its way.</div>
                ) : (
                  <Button type="button" variant="outline" onClick={handleResend}>Resend verification email</Button>
                )
              )}
              <Field>
                <Button type="submit" disabled={loading || (turnstileRequired && !turnstileToken)}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
