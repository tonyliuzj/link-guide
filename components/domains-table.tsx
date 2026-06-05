"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function DomainsTable({ domains }: { domains: any[] }) {
  const [selected, setSelected] = useState<number[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const router = useRouter()

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelected(selected.length === domains.length ? [] : domains.map(d => d.id))
  }

  async function handleBulkDelete() {
    const res = await fetch("/api/domains/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    })

    if (res.ok) {
      toast.success(`Deleted ${selected.length} domain(s)`)
      setSelected([])
      router.refresh()
    } else {
      toast.error("Failed to delete domains")
    }
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Link href="/dashboard/domains/new">
          <Button>Add Domain</Button>
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
                  checked={selected.length === domains.length && domains.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 text-left">Domain</th>
              <th className="p-3 text-left">Base Path</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Guest Create</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain: any) => (
              <tr key={domain.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(domain.id)}
                    onChange={() => toggleSelect(domain.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-3">{domain.domain}</td>
                <td className="p-3">{domain.base_path}</td>
                <td className="p-3">{domain.is_active ? 'Active' : 'Inactive'}</td>
                <td className="p-3">{domain.allow_guest_create ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  <Link href={`/dashboard/domains/${domain.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {domains.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No domains yet. Add your first domain!
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} domain(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected domains and all their links.
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
