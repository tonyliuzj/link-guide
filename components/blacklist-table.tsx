"use client"

import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function BlacklistTable({ initialData }: { initialData: any[] }) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelected(selected.length === initialData.length ? [] : initialData.map(i => i.id))
  }

  async function handleDelete() {
    if (deleteId === null) return

    const res = await fetch(`/api/blacklist/${deleteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Path removed from blacklist")
      router.refresh()
    } else {
      toast.error("Failed to remove path")
    }
    setDeleteDialogOpen(false)
    setDeleteId(null)
  }

  async function handleBulkDelete() {
    const res = await fetch("/api/blacklist/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    })

    if (res.ok) {
      toast.success(`Deleted ${selected.length} path(s)`)
      setSelected([])
      router.refresh()
    } else {
      toast.error("Failed to delete paths")
    }
    setBulkDeleteDialogOpen(false)
  }

  return (
    <>
      {selected.length > 0 && (
        <div className="mb-4">
          <Button variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)}>
            Delete Selected ({selected.length})
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selected.length === initialData.length && initialData.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 text-left">Path</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialData.map((item: any) => (
              <tr key={item.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-3 font-mono">{item.path}</td>
                <td className="p-3">{item.reason || '-'}</td>
                <td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setDeleteId(item.id)
                    setDeleteDialogOpen(true)
                  }}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {initialData.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No blacklisted paths
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blacklisted Path</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this path from the blacklist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} path(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the selected paths from the blacklist.
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
