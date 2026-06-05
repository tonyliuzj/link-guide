"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>Get help with LinkGuide</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create short links from the Links page</li>
              <li>Manage domains in the Domains section (admin only)</li>
              <li>View link statistics by clicking on a link</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Redirect Modes</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Simple:</strong> Direct redirect</li>
              <li><strong>Custom Page:</strong> Styled intermediate page</li>
              <li><strong>Turnstile:</strong> Bot protection</li>
              <li><strong>Password:</strong> Password-protected links</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Need More Help?</h3>
            <p className="text-sm text-muted-foreground">
              Visit our documentation or contact support for assistance.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
