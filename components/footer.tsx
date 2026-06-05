import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <Link
        href="https://github.com/tonyliuzj/link-guide"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Powered by Link Guide
      </Link>
    </footer>
  )
}
