import { redirect, notFound } from 'next/navigation';
import { isSetupCompleted, getAllDomains, getDomainByHostname, getSiteSettings } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GuestLinkForm } from "@/components/guest-link-form"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { headers } from "next/headers"
import { getRequestHostname, normalizeDomain } from '@/lib/domain-utils';
import { normalizeRedirectUrl } from '@/lib/redirect-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!isSetupCompleted()) {
    redirect('/setup');
  }

  // Check domain-specific base response
  const headersList = await headers();
  const hostname = getRequestHostname(headersList);
  const domain = getDomainByHostname(hostname);
  const siteSettings = getSiteSettings();
  const isSiteDomain = !!siteSettings?.site_domain
    && normalizeDomain(siteSettings.site_domain) === normalizeDomain(domain?.domain);

  const baseResponse = domain?.base_response || '404';

  if (domain && !isSiteDomain && baseResponse !== 'default') {
    if (baseResponse === '444') {
      notFound();
    }
    if (baseResponse === 'redirect' && domain.base_redirect_url) {
      const redirectUrl = normalizeRedirectUrl(domain.base_redirect_url);
      if (!redirectUrl) {
        notFound();
      }
      redirect(redirectUrl);
    }
    if (baseResponse === 'custom') {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-muted">
          <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Welcome</h1>
            <p className="text-muted-foreground mb-6">This is a link shortening domain.</p>
          </div>
        </div>
      );
    }

    notFound();
  }

  const session = await auth();
  const allDomains = getAllDomains() as any[];
  const guestDomains = allDomains.filter((d: any) => d.allow_guest_create === 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-6xl font-bold tracking-tight">LinkGuide</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform long, complex URLs into short, memorable links. Simple, fast, and powerful.
          </p>

          {session && (
            <Link href="/dashboard">
              <Button size="lg" className="mt-4">Go to Dashboard</Button>
            </Link>
          )}
        </div>

        {/* Link Creation Section */}
        <div className="max-w-2xl mx-auto mt-16">
          {guestDomains.length > 0 ? (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Create Your Short Link</CardTitle>
                <CardDescription>No account needed - start shortening URLs instantly</CardDescription>
              </CardHeader>
              <CardContent>
                <GuestLinkForm
                  domains={guestDomains}
                  turnstileSiteKey={siteSettings?.turnstile_site_key}
                  turnstileRequired={siteSettings?.turnstile_landing_create === 1}
                  siteDomain={siteSettings?.site_domain || ''}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-muted">
              <CardContent className="py-12 text-center">
                <p className="text-lg text-muted-foreground">
                  No public domains available for guest link creation.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please sign in to create short links.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Auth Links */}
        {!session && (
          <div className="text-center mt-12 space-y-4">
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="lg">Create Account</Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Sign up for advanced features and link management
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
