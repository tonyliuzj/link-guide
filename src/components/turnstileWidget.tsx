"use client"

import { useEffect, useRef } from "react"

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback?: (token: string) => void
      "expired-callback"?: () => void
      "error-callback"?: () => void
    }
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script"
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string
  onToken: (token: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function renderWidget() {
      if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement("script")
        script.id = TURNSTILE_SCRIPT_ID
        script.src = TURNSTILE_SCRIPT_SRC
        script.async = true
        script.defer = true
        document.body.appendChild(script)
      }
      script.addEventListener("load", renderWidget)
    }

    return () => {
      cancelled = true
      const widgetId = widgetIdRef.current
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
      widgetIdRef.current = null
    }
  }, [onToken, siteKey])

  return <div ref={containerRef} className="flex justify-center" />
}
