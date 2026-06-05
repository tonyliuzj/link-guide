import { SetupForm } from "@/components/setup-form"

export const runtime = 'nodejs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Setup Your Application</h1>
          <p className="text-muted-foreground mt-2">Complete the initial setup to get started</p>
        </div>
        <SetupForm />
      </div>
    </div>
  )
}
