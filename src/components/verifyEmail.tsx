"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [error, setError] = useState("")
  const router = useRouter()

  // Verification needs a click: email scanners that prefetch links must not consume the token.
  async function handleVerify() {
    setState("loading")
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })

    if (res.ok) {
      setState("done")
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Verification failed")
      setState("error")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          {state === "done" ? "Your email is verified. You can now log in." : "Confirm your email address to activate your account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-sm text-red-500">{error}</div>}
        {state === "done" ? (
          <Button className="w-full" onClick={() => router.push("/login")}>Go to login</Button>
        ) : (
          <Button className="w-full" onClick={handleVerify} disabled={state === "loading"}>
            {state === "loading" ? "Verifying..." : "Verify email"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
