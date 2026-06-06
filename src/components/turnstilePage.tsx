"use client"

import { useEffect, useState } from "react"
import { Footer } from "@/components/footer"
import { getSiteApiUrl } from "@/lib/apiUrl"

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void
  }
}

export function TurnstilePage({
  siteKey,
  linkId,
  siteDomain,
  redirectDelay = 0,
  allowSkipDelay = true
}: {
  siteKey: string
  linkId: number
  siteDomain?: string
  redirectDelay?: number
  allowSkipDelay?: boolean
}) {
  const [verified, setVerified] = useState(false)
  const [countdown, setCountdown] = useState(redirectDelay)
  const [redirectUrl, setRedirectUrl] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
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
        if (redirectDelay > 0) {
          setCountdown(redirectDelay)
          setVerified(true)
        } else {
          window.location.href = data.redirectUrl
        }
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
      document.body.removeChild(script)
    }
  }, [linkId, redirectDelay, siteDomain])

  useEffect(() => {
    if (!verified || countdown <= 0) {
      if (verified && countdown <= 0 && redirectUrl) {
        window.location.href = redirectUrl
      }
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [verified, countdown, redirectUrl])

  if (verified && redirectDelay > 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 bg-muted">
          <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
            <p className="text-muted-foreground mb-6">You will be redirected in {countdown} second{countdown !== 1 ? 's' : ''}.</p>
            {allowSkipDelay && redirectUrl && (
              <a
                href={redirectUrl}
                className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Continue Now
              </a>
            )}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 bg-muted">
        <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Verification Required</h1>
        <p className="text-muted-foreground mb-6">Please complete the verification to continue.</p>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
        <div className="flex justify-center mb-6">
          <div
            className="cf-turnstile"
            data-sitekey={siteKey}
            data-callback="onTurnstileSuccess"
          />
        </div>
      </div>
      </div>
      <Footer />
    </div>
  )
}
