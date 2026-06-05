import { NextRequest, NextResponse } from "next/server"
import { getDomainById, createLink, linkExists, isBlacklisted, getSiteSettings } from "@/lib/db"
import { hash } from "bcryptjs"
import { buildShortUrl } from "@/lib/domain-utils"

export const runtime = 'nodejs';

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8)
}

async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token })
    })
    const data = await response.json()
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const domainId = parseInt(formData.get("domain")?.toString() || "0")
  const domain = getDomainById(domainId)

  if (!domain || !domain.allow_guest_create) {
    return NextResponse.json({ error: "Guest link creation not allowed for this domain" }, { status: 403 })
  }

  // Check if turnstile verification is required
  const siteSettings = getSiteSettings()
  if (siteSettings?.turnstile_landing_create === 1 && siteSettings?.turnstile_secret_key) {
    const turnstileToken = formData.get("cf-turnstile-response")?.toString()
    if (!turnstileToken) {
      return NextResponse.json({ error: "Verification required" }, { status: 400 })
    }
    const isValid = await verifyTurnstile(turnstileToken, siteSettings.turnstile_secret_key)
    if (!isValid) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }
  }

  const url = formData.get("url")?.toString()
  const customShortCode = formData.get("shortCode")?.toString()
  const mode = formData.get("mode")?.toString() || "simple"
  const password = formData.get("password")?.toString()
  const redirectDelay = parseInt(formData.get("redirectDelay")?.toString() || "0")
  const allowSkip = formData.get("allowSkip") === "on"
  const turnstileEnabled = formData.get("turnstileEnabled") === "on"
  let shortCode = customShortCode || generateShortCode()

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  if (mode === "password" && !password) {
    return NextResponse.json({ error: "Password is required for password-protected links" }, { status: 400 })
  }

  if (isBlacklisted(shortCode)) {
    return NextResponse.json({ error: "This path is not allowed" }, { status: 400 })
  }

  if (customShortCode && linkExists(customShortCode, domain.id)) {
    return NextResponse.json({ error: "Link already taken" }, { status: 400 })
  }

  while (linkExists(shortCode, domain.id)) {
    shortCode = generateShortCode()
  }

  const linkData: any = {
    shortCode,
    destinationUrl: url,
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

  return NextResponse.json({ success: true, shortUrl })
}
