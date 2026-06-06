"use client"

import { AppSidebar } from "@/components/appSidebar"
import { SiteHeader } from "@/components/siteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alertDialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string>("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<string>("user")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    params.then(p => {
      setId(p.id)
      fetch(`/api/users/${p.id}`)
        .then(res => res.json())
        .then(data => {
          setUser(data)
          setRole(data.role)
        })
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        role,
      }),
    })

    if (res.ok) {
      toast.success("User updated successfully")
      router.push("/dashboard/users")
    } else {
      toast.error("Failed to update user")
      setLoading(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("User deleted successfully")
      router.push("/dashboard/users")
    } else {
      toast.error("Failed to delete user")
    }
    setDeleteDialogOpen(false)
  }

  if (!user) return (
    <SidebarProvider style={{"--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)"} as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Edit User" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Skeleton className="h-9 w-20 mb-6" />
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Edit User" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center gap-4 mb-6">
                  <Link href="/dashboard/users">
                    <Button variant="ghost" size="sm">← Back</Button>
                  </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>Update user information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" defaultValue={user.email} />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={role} onValueChange={(value) => value && setRole(value)}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
                      <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete User</Button>
                    </div>
                  </CardContent>
                </Card>
                </form>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
