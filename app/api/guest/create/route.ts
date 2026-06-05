import { NextRequest } from "next/server"
import { getDomainById, createLink, linkExists, isBlacklisted, getSiteSettings } from "@/lib/db"
import { hash } from "bcryptjs"
import { buildShortUrl } from "@/lib/domain-utils"
import { publicApiJson, publicApiOptions } from "@/lib/public-api"
import { normalizeRedirectUrl } from "@/lib/redirect-url"
import { normalizeLinkMode, normalizeRedirectDelay, normalizeShortCode } from "@/lib/link-rules"
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile"

export const runtime = 'nodejs';

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8)
}

export async function OPTIONS() {
  return publicApiOptions()
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const domainId = parseInt(formData.get("domain")?.toString() || "0")
  const domain = getDomainById(domainId)

  if (!domain || !domain.allow_guest_create) {
    return publicApiJson({ error: "Guest link creation not allowed for this domain" }, { status: 403 })
  }

  // Check if turnstile verification is required
  const siteSettings = getSiteSettings()
  if (siteSettings?.turnstile_landing_create === 1) {
    if (!siteSettings.turnstile_secret_key) {
      return publicApiJson({ error: "Verification is not configured" }, { status: 400 })
    }

    const turnstileToken = formData.get("cf-turnstile-response")?.toString()
    const isValid = await verifyTurnstileToken(turnstileToken, siteSettings.turnstile_secret_key, getRequestIp(req.headers))
    if (!isValid) {
      return publicApiJson({ error: "Verification failed" }, { status: 400 })
    }
  }

  const url = formData.get("url")?.toString()
  const customShortCode = formData.get("shortCode")?.toString()
  const mode = normalizeLinkMode(formData.get("mode")?.toString() || "simple")
  const password = formData.get("password")?.toString()
  const redirectDelay = normalizeRedirectDelay(formData.get("redirectDelay")?.toString() || "0")
  const allowSkip = formData.get("allowSkip") === "on"
  const turnstileEnabled = formData.get("turnstileEnabled") === "on"

  if (!mode) {
    return publicApiJson({ error: "Invalid redirect mode" }, { status: 400 })
  }

  if (redirectDelay === null) {
    return publicApiJson({ error: "Redirect delay must be a whole number between 0 and 86400 seconds" }, { status: 400 })
  }

  const normalizedCustomShortCode = customShortCode ? normalizeShortCode(customShortCode) : null
  if (customShortCode && !normalizedCustomShortCode) {
    return publicApiJson({ error: "Short code can only contain letters, numbers, hyphens, and underscores" }, { status: 400 })
  }

  let shortCode = normalizedCustomShortCode || generateShortCode()

  if (!url) {
    return publicApiJson({ error: "URL is required" }, { status: 400 })
  }

  const destinationUrl = normalizeRedirectUrl(url)
  if (!destinationUrl) {
    return publicApiJson({ error: "URL must be an absolute http or https URL" }, { status: 400 })
  }

  if (mode === "password" && !password) {
    return publicApiJson({ error: "Password is required for password-protected links" }, { status: 400 })
  }

  if (turnstileEnabled && (!domain.turnstile_site_key || !domain.turnstile_secret_key)) {
    return publicApiJson({ error: "Turnstile is not configured for this domain" }, { status: 400 })
  }

  if (isBlacklisted(shortCode)) {
    return publicApiJson({ error: "This path is not allowed" }, { status: 400 })
  }

  if (normalizedCustomShortCode && linkExists(normalizedCustomShortCode, domain.id)) {
    return publicApiJson({ error: "Link already taken" }, { status: 400 })
  }

  while (linkExists(shortCode, domain.id) || isBlacklisted(shortCode)) {
    shortCode = generateShortCode()
  }

  const linkData: any = {
    shortCode,
    destinationUrl,
    domainId: domain.id,
    userId: 0,
    mode,
    statsEnabled: true,
    redirectDelay,
    allowSkip,
    turnstileEnabled,
  }

  if (mode === "password" && password) {
    linkData.passwordHash = await hash(password, 10)
  }

  createLink(linkData)

  const shortUrl = buildShortUrl(domain.domain, domain.base_path, shortCode)

  return publicApiJson({ success: true, shortUrl })
}
