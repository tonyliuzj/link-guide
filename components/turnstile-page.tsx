"use client"

import { useEffect } from "react"
import { Footer } from "@/components/footer"

export function TurnstilePage({
  siteKey,
  destinationUrl,
  allowSkip = true
}: {
  siteKey: string
  destinationUrl: string
  allowSkip?: boolean
}) {
  useEffect(() => {
    // Define global callback for Turnstile
    (window as any).onTurnstileSuccess = () => {
      window.location.href = destinationUrl
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      delete (window as any).onTurnstileSuccess
      document.body.removeChild(script)
    }
  }, [destinationUrl])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 bg-muted">
        <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Verification Required</h1>
        <p className="text-muted-foreground mb-6">Please complete the verification to continue.</p>
        <div className="flex justify-center mb-6">
          <div
            className="cf-turnstile"
            data-sitekey={siteKey}
            data-callback="onTurnstileSuccess"
          />
        </div>
        {allowSkip && (
          <a
            href={destinationUrl}
            className="inline-block px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            Skip Verification
          </a>
        )}
      </div>
      </div>
      <Footer />
    </div>
  )
}
