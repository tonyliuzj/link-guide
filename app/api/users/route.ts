import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createUser, getUserByEmail } from "@/lib/db"
import { hash } from "bcryptjs"

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { email, password, role } = body

  if (!email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Check if email already exists
  const existingUser = getUserByEmail(email)
  if (existingUser) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 })
  }

  const passwordHash = await hash(password, 10)
  createUser(email, passwordHash, role)

  return NextResponse.json({ success: true })
}
