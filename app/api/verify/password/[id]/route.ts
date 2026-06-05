import { NextRequest } from "next/server"
import { getLinkById, getDomainById } from "@/lib/db"
import { compare } from "bcryptjs"
import { publicApiJson, publicApiOptions, publicApiText } from "@/lib/public-api"
import { normalizeRedirectUrl } from "@/lib/redirect-url"
import { isLinkExpired } from "@/lib/link-rules"
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile"

export const runtime = 'nodejs';

export async function OPTIONS() {
  return publicApiOptions()
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const link = getLinkById(parseInt(id))

  if (!link || link.mode !== "password" || !link.password_hash || isLinkExpired(link.expires_at)) {
    return publicApiJson({ error: "Link not found" }, { status: 404 })
  }

  const formData = await req.formData()

  // Verify turnstile if enabled
  if (link.turnstile_enabled === 1) {
    const domain = getDomainById(link.domain_id)
    if (!domain?.turnstile_secret_key) {
      return publicApiText("Verification is not configured", { status: 400 })
    }

    const turnstileToken = formData.get("cf-turnstile-response")?.toString()
    const isValid = await verifyTurnstileToken(turnstileToken, domain.turnstile_secret_key, getRequestIp(req.headers))
    if (!isValid) {
      return publicApiText("Verification failed", { status: 400 })
    }
  }

  const password = formData.get("password")?.toString() || ""
  const isValid = await compare(password, link.password_hash)

  if (isValid) {
    const redirectUrl = normalizeRedirectUrl(link.destination_url)
    if (!redirectUrl) {
      return publicApiText("Invalid redirect URL", { status: 400 })
    }

    return publicApiJson({ success: true, redirectUrl })
  }

  return publicApiText("Invalid password", { status: 401 })
}
