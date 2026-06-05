"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function LinksTable({ links }: { links: any[] }) {
  const [selected, setSelected] = useState<number[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const router = useRouter()

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelected(selected.length === links.length ? [] : links.map(l => l.id))
  }

  async function handleBulkDelete() {
    const res = await fetch("/api/links/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    })

    if (res.ok) {
      toast.success(`Deleted ${selected.length} link(s)`)
      setSelected([])
      router.refresh()
    } else {
      toast.error("Failed to delete links")
    }
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Link href="/dashboard/links/new">
          <Button>Create New Link</Button>
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
                  checked={selected.length === links.length && links.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 text-left">Short URL</th>
              <th className="p-3 text-left">Destination</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left">Clicks</th>
              <th className="p-3 text-left">Redirect Mode</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link: any) => (
              <tr key={link.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(link.id)}
                    onChange={() => toggleSelect(link.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-3">
                  {link.domain}{link.base_path !== '/' ? link.base_path : ''}/{link.short_code}
                </td>
                <td className="p-3 truncate max-w-xs">{link.destination_url}</td>
                <td className="p-3">{link.owner_name}</td>
                <td className="p-3">{link.click_count || 0}</td>
                <td className="p-3">
                  {link.mode === 'simple' && 'Simple Redirect'}
                  {link.mode === 'custom_page' && 'Custom Page'}
                  {link.mode === 'password' && 'Password Protected'}
                  {link.mode === 'turnstile' && 'Turnstile Protected'}
                </td>
                <td className="p-3">
                  <Link href={`/dashboard/links/${link.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {links.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No links yet. Create your first link!
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} link(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected links.
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
