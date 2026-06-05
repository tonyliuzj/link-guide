import { NextRequest, NextResponse } from "next/server"
import { getLinkById, getDomainById } from "@/lib/db"
import { compare } from "bcryptjs"

export const runtime = 'nodejs';

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const link = getLinkById(parseInt(id))

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  const formData = await req.formData()

  // Verify turnstile if enabled
  if (link.turnstile_enabled === 1) {
    const domain = getDomainById(link.domain_id)
    if (domain?.turnstile_secret_key) {
      const turnstileToken = formData.get("cf-turnstile-response")?.toString()
      if (!turnstileToken) {
        return new NextResponse("Verification required", { status: 400 })
      }
      const isValid = await verifyTurnstile(turnstileToken, domain.turnstile_secret_key)
      if (!isValid) {
        return new NextResponse("Verification failed", { status: 400 })
      }
    }
  }

  const password = formData.get("password")?.toString() || ""
  const isValid = await compare(password, link.password_hash)

  if (isValid) {
    return NextResponse.json({ success: true, redirectUrl: link.destination_url })
  }

  return new NextResponse("Invalid password", { status: 401 })
}
