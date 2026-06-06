import { NextRequest } from "next/server"
import { getDomainById, getLinkById } from "@/lib/db"
import { normalizeRedirectUrl } from "@/lib/redirectUrl"
import { isLinkExpired } from "@/lib/linkRules"
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile"
import { publicApiJson, publicApiOptions, publicApiText } from "@/lib/publicApi"

export const runtime = 'nodejs';

export async function OPTIONS() {
  return publicApiOptions()
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const linkId = parseInt(id)

  if (!Number.isInteger(linkId)) {
    return publicApiJson({ error: "Link not found" }, { status: 404 })
  }

  const link = getLinkById(linkId)
  if (!link || link.turnstile_enabled !== 1 || link.mode === "password" || isLinkExpired(link.expires_at)) {
    return publicApiJson({ error: "Link not found" }, { status: 404 })
  }

  const domain = getDomainById(link.domain_id)
  if (!domain || domain.is_active !== 1) {
    return publicApiJson({ error: "Link not found" }, { status: 404 })
  }

  if (!domain.turnstile_secret_key) {
    return publicApiText("Verification is not configured", { status: 400 })
  }

  const formData = await req.formData()
  const turnstileToken = formData.get("cf-turnstile-response")?.toString()
  const isValid = await verifyTurnstileToken(
    turnstileToken,
    domain.turnstile_secret_key,
    getRequestIp(req.headers)
  )

  if (!isValid) {
    return publicApiText("Verification failed", { status: 400 })
  }

  const redirectUrl = normalizeRedirectUrl(link.destination_url)
  if (!redirectUrl) {
    return publicApiText("Invalid redirect URL", { status: 400 })
  }

  return publicApiJson({ success: true, redirectUrl })
}
