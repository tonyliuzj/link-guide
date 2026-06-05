import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile"

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

        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
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
