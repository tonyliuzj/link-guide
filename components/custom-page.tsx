"use client"

import { useEffect, useState } from "react"
import { Footer } from "@/components/footer"

export function CustomPage({
  config,
  destinationUrl,
  turnstileSiteKey,
  turnstileEnabled = false
}: {
  config: { title?: string; description?: string; buttonText?: string }
  destinationUrl: string
  turnstileSiteKey?: string
  turnstileEnabled?: boolean
}) {
  const showTurnstile = turnstileSiteKey && turnstileEnabled
  const [turnstileVerified, setTurnstileVerified] = useState(false)

  useEffect(() => {
    if (showTurnstile) {
      (window as any).onTurnstileSuccess = () => {
        setTurnstileVerified(true)
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
    }
  }, [showTurnstile])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (showTurnstile && !turnstileVerified) {
      e.preventDefault()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 bg-muted">
        <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{config.title || 'Redirecting...'}</h1>
          <p className="text-muted-foreground mb-6">{config.description || 'You will be redirected shortly.'}</p>
          {showTurnstile && (
            <div className="flex justify-center mb-6">
              <div
                className="cf-turnstile"
                data-sitekey={turnstileSiteKey}
                data-callback="onTurnstileSuccess"
              />
            </div>
          )}
          <a
            href={destinationUrl}
            onClick={handleClick}
            className={`inline-block px-6 py-3 rounded-md ${
              showTurnstile && !turnstileVerified
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {config.buttonText || 'Continue'}
          </a>
        </div>
      </div>
      <Footer />
    </div>
  )
}
