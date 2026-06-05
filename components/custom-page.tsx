"use client"

import { useEffect, useState } from "react"
import { Footer } from "@/components/footer"
import { getSiteApiUrl } from "@/lib/api-url"

export function CustomPage({
  config,
  destinationUrl,
  linkId,
  siteDomain,
  turnstileSiteKey,
  turnstileEnabled = false
}: {
  config: { title?: string; description?: string; buttonText?: string }
  destinationUrl?: string
  linkId?: number
  siteDomain?: string
  turnstileSiteKey?: string
  turnstileEnabled?: boolean
}) {
  const showTurnstile = Boolean(turnstileSiteKey && turnstileEnabled && linkId)
  const [redirectUrl, setRedirectUrl] = useState(showTurnstile ? "" : (destinationUrl || ""))
  const [error, setError] = useState("")

  useEffect(() => {
    if (showTurnstile) {
      window.onTurnstileSuccess = async (token: string) => {
        setError("")
        const formData = new FormData()
        formData.set("cf-turnstile-response", token)

        try {
          const res = await fetch(getSiteApiUrl(`/api/verify/turnstile/${linkId}`, siteDomain), {
            method: "POST",
            body: formData,
          })

          if (!res.ok) {
            const text = await res.text()
            setError(text || "Verification failed")
            return
          }

          const data = await res.json()
          if (!data.success || !data.redirectUrl) {
            setError("Verification failed")
            return
          }

          setRedirectUrl(data.redirectUrl)
        } catch {
          setError("Verification failed")
        }
      }

      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      document.body.appendChild(script)

      return () => {
        delete window.onTurnstileSuccess
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [linkId, showTurnstile, siteDomain])

  function handleClick() {
    if (redirectUrl) {
      window.location.href = redirectUrl
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
          {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
          {showTurnstile ? (
            <button
              type="button"
              onClick={handleClick}
              disabled={!redirectUrl}
              className={`inline-block px-6 py-3 rounded-md ${
                !redirectUrl
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {config.buttonText || 'Continue'}
            </button>
          ) : (
            <a
              href={destinationUrl}
              className="inline-block px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {config.buttonText || 'Continue'}
            </a>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
