"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function UsersTable({ users, currentUserId }: { users: any[], currentUserId: number }) {
  const [selected, setSelected] = useState<number[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const router = useRouter()

  const toggleSelect = (id: number, email: string) => {
    if (email === 'guest@system' || id === currentUserId) return
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const selectableUsers = users.filter(u => u.email !== 'guest@system' && u.id !== currentUserId)
    setSelected(selected.length === selectableUsers.length ? [] : selectableUsers.map(u => u.id))
  }

  async function handleBulkDelete() {
    const res = await fetch("/api/users/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    })

    if (res.ok) {
      toast.success(`Deleted ${selected.length} user(s)`)
      setSelected([])
      router.refresh()
    } else {
      toast.error("Failed to delete users")
    }
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Link href="/dashboard/users/new">
          <Button>Add User</Button>
        </Link>
        {selected.length > 0 && (
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            Delete Selected ({selected.length})
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selected.length === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => {
              const isGuest = user.email === 'guest@system'
              const isCurrentUser = user.id === currentUserId
              const isProtected = isGuest || isCurrentUser
              return (
                <tr key={user.id} className={`border-b ${isProtected ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/50'}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(user.id)}
                      onChange={() => toggleSelect(user.id, user.email)}
                      disabled={isProtected}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">{new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                  <td className="p-3">
                    {!isProtected && (
                      <Link href={`/dashboard/users/${user.id}`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No users yet.
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} user(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected users and all their links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
