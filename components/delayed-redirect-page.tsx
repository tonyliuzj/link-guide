"use client"

import { useEffect, useState } from "react"
import { Footer } from "@/components/footer"

export function DelayedRedirectPage({
  destinationUrl,
  delay,
  allowSkip = true
}: {
  destinationUrl: string
  delay: number
  allowSkip?: boolean
}) {
  const [countdown, setCountdown] = useState(delay)

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = destinationUrl
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, destinationUrl])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 bg-muted">
        <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-muted-foreground mb-6">You will be redirected in {countdown} second{countdown !== 1 ? 's' : ''}.</p>
        {allowSkip && (
          <a
            href={destinationUrl}
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
