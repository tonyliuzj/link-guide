import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Starts a file download without navigating the page away.
export function downloadFile(url: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = ""
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
