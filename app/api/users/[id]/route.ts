import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserById, updateUser, deleteUser, getUserByEmail, deleteLinksByUserId, countAdminUsers } from "@/lib/db"

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const user = getUserById(parseInt(id))

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Check if email already exists for another user
  if (body.email) {
    const existing = getUserByEmail(body.email)
    if (existing && existing.id !== parseInt(id)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
  }

  // Check if changing the last admin to a regular user
  if (body.role && body.role !== 'admin') {
    const userToUpdate = getUserById(parseInt(id))
    if (userToUpdate?.role === 'admin' && countAdminUsers() <= 1) {
      return NextResponse.json({ error: "Cannot change the last admin to a regular user" }, { status: 400 })
    }
  }

  updateUser(parseInt(id), {
    email: body.email,
    role: body.role,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  if (parseInt(id) === parseInt(session.user.id)) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const userToDelete = getUserById(parseInt(id))
  if (userToDelete?.role === 'admin' && countAdminUsers() <= 1) {
    return NextResponse.json({ error: "Cannot delete the last admin user" }, { status: 400 })
  }

  deleteLinksByUserId(parseInt(id))
  deleteUser(parseInt(id))

  return NextResponse.json({ success: true })
}
