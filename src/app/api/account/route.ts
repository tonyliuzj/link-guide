import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateUser, updatePassword, getUserById, getUserByEmail } from "@/lib/db"
import { hash, compare } from "bcryptjs"
import { rateLimit } from "@/lib/rateLimit"
import { isValidEmail, isValidPassword } from "@/lib/validation"

export const runtime = 'nodejs';

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const userId = parseInt(session.user.id)

  // Update email if provided
  if (body.email) {
    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
    }
    const existing = getUserByEmail(body.email)
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
    updateUser(userId, { email: body.email })
  }

  // Update password if provided
  if (body.currentPassword && body.newPassword) {
    if (!isValidPassword(body.newPassword)) {
      return NextResponse.json({ error: "Password must be 8 to 128 characters" }, { status: 400 })
    }
    if (!rateLimit(`account-password:${userId}`, 5, 15 * 60 * 1000).ok) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
    }
    const user = getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const isValid = await compare(body.currentPassword, user.password_hash)

    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const passwordHash = await hash(body.newPassword, 10)
    updatePassword(userId, passwordHash)
  }

  return NextResponse.json({ success: true })
}
