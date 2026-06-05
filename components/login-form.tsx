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
import { TurnstileWidget } from "@/components/turnstile-widget"

export function LoginForm({
  turnstileSiteKey,
  turnstileRequired = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
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
      setError("Invalid email or password")
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
                <FieldLabel htmlFor="password">Password</FieldLabel>
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
