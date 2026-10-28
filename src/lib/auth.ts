import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { CredentialsSignin } from "next-auth"
import { compare } from "bcryptjs"
import { normalizeDomain } from "@/lib/domainUtils"
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile"
import { rateLimit, resetRateLimit } from "@/lib/rateLimit"

function getProtocolForDomain(domain: string) {
  return domain.startsWith("localhost") || domain.startsWith("127.0.0.1") || domain.startsWith("[::1]")
    ? "http"
    : "https"
}

async function getConfiguredSiteOrigin() {
  try {
    const { getSiteSettings } = await import("@/lib/db")
    const domain = normalizeDomain(getSiteSettings()?.site_domain || "")

    if (!domain) return null

    return `${getProtocolForDomain(domain)}://${domain}`
  } catch {
    return null
  }
}

// Surfaced to the login form (as `code`) only after the correct password was supplied.
class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST !== "false",
  secret: process.env.SESSION_PASSWORD,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        "cf-turnstile-response": { label: "Turnstile", type: "hidden" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const ipKey = `login:ip:${getRequestIp(request.headers) || "unknown"}`
        const emailKey = `login:email:${(credentials.email as string).toLowerCase()}`
        const loginWindowMs = 15 * 60 * 1000
        if (!rateLimit(ipKey, 30, loginWindowMs).ok || !rateLimit(emailKey, 10, loginWindowMs).ok) {
          return null
        }

        const { getSiteSettings, getUserByEmail } = await import('@/lib/db')
        const siteSettings = getSiteSettings()

        if (siteSettings?.turnstile_login === 1) {
          const isVerified = await verifyTurnstileToken(
            credentials["cf-turnstile-response"] as string | undefined,
            siteSettings.turnstile_secret_key,
            getRequestIp(request.headers)
          )

          if (!isVerified) {
            return null
          }
        }

        const user = getUserByEmail(credentials.email as string)
        if (!user) {
          return null
        }

        const isValid = await compare(credentials.password as string, user.password_hash)
        if (!isValid) {
          return null
        }

        if (user.email_verified !== 1) {
          throw new EmailNotVerifiedError()
        }

        resetRateLimit(emailKey)

        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const siteOrigin = await getConfiguredSiteOrigin()
      const fallbackOrigin = siteOrigin || baseUrl

      if (url.startsWith("/")) {
        return `${fallbackOrigin}${url}`
      }

      try {
        const parsedUrl = new URL(url)

        if (parsedUrl.origin === baseUrl || parsedUrl.origin === siteOrigin) {
          return siteOrigin ? `${siteOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` : url
        }
      } catch {
        // Invalid URLs fall through to the safe fallback origin.
      }

      return fallbackOrigin
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        return token
      }

      // Re-check the user on every request: deleted users and sessions issued before a password reset
      // are dropped, and role changes (e.g. an admin demoted to user) take effect immediately.
      if (!token.sub) return null
      const { getUserSessionInfo } = await import("@/lib/db")
      const info = getUserSessionInfo(Number(token.sub))
      if (!info) return null
      if (typeof token.iat === "number" && info.session_valid_after >= token.iat) {
        return null
      }
      token.role = info.role
      token.email = info.email
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
