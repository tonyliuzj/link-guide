import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserById } from "@/lib/db"
import { isMailConfigured, sendMail } from "@/lib/mail"
import { rateLimit } from "@/lib/rateLimit"

export const runtime = 'nodejs';

// Sends a test message to the signed-in admin so a broken SMTP setup is noticed before users hit it.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isMailConfigured()) {
    return NextResponse.json({ error: "SMTP is not configured. Set SMTP_HOST and SMTP_FROM in the environment." }, { status: 400 })
  }

  if (!rateLimit(`test-email:${session.user.id}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many test emails. Please try again in a few minutes." }, { status: 429 })
  }

  const user = getUserById(parseInt(session.user.id))
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  try {
    await sendMail(user.email, "LinkGuide test email", "SMTP is working. Password reset and verification emails will be delivered.")
    return NextResponse.json({ success: true, sentTo: user.email })
  } catch (error) {
    console.error("Test email failed:", error)
    const message = error instanceof Error ? error.message : "unknown error"
    // A plain connection to an implicit-TLS port (or vice versa) never receives a greeting.
    const hint = /greeting never received|wrong version number/i.test(message)
      ? " Check SMTP_SECURE: use true for implicit TLS (usually port 465) and false for STARTTLS (usually port 587)."
      : ""
    return NextResponse.json({ error: `Sending failed: ${message}.${hint}` }, { status: 502 })
  }
}
