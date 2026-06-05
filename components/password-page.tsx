"use client"

import { useEffect, useState } from "react"
import { Footer } from "@/components/footer"

export function PasswordPage({
  linkId,
  turnstileSiteKey,
  turnstileEnabled = false,
  siteDomain
}: {
  linkId: number
  turnstileSiteKey?: string
  turnstileEnabled?: boolean
  siteDomain: string
}) {
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [turnstileCompleted, setTurnstileCompleted] = useState(false)
  const showTurnstile = turnstileSiteKey && turnstileEnabled

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    try {
      const apiUrl = siteDomain
        ? `https://${siteDomain}/api/verify/password/${linkId}`
        : `/api/verify/password/${linkId}`

      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.redirectUrl) {
          window.location.href = data.redirectUrl
          return
        }
      }

      const text = await res.text()
      setError(text || "Invalid password")
      setIsSubmitting(false)
    } catch (err) {
      setError("Failed to verify password")
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (showTurnstile) {
      (window as any).onTurnstileSuccess = () => {
        setTurnstileCompleted(true)
      }

      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      document.body.appendChild(script)

      return () => {
        delete (window as any).onTurnstileSuccess
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [showTurnstile])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 bg-muted">
        <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">Password Protected</h1>
        <p className="text-muted-foreground mb-6">This link requires a password to access.</p>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            className="w-full px-4 py-2 border rounded-md mb-4"
            required
          />
          {showTurnstile && (
            <div className="flex justify-center mb-4">
              <div
                className="cf-turnstile"
                data-sitekey={turnstileSiteKey}
                data-callback="onTurnstileSuccess"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={(showTurnstile ? !turnstileCompleted : false) || isSubmitting}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Verifying..." : "Submit"}
          </button>
        </form>
      </div>
      </div>
      <Footer />
    </div>
  )
}
