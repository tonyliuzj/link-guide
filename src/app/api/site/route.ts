import { NextResponse } from "next/server"
import { getSiteSettings } from "@/lib/db"

export const runtime = 'nodejs';

// Public branding only. The full settings (with Turnstile secrets) stay behind /api/settings for admins.
export async function GET() {
  return NextResponse.json({ site_title: getSiteSettings()?.site_title || 'LinkGuide' })
}
