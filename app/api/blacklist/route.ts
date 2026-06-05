import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createBlacklist, getAllBlacklist, isBlacklisted } from "@/lib/db"

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const blacklist = getAllBlacklist()
  return NextResponse.json(blacklist)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const path = body.path?.trim()

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  if (isBlacklisted(path)) {
    return NextResponse.json({ error: "Path already blacklisted" }, { status: 400 })
  }

  createBlacklist(path, body.reason)

  return NextResponse.json({ success: true })
}
