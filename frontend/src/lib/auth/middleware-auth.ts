import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { UserRole } from "@/types/next-auth"

// Simplified auth configuration for middleware (Edge Runtime)
// This version doesn't include database operations that are incompatible with Edge Runtime
export const { auth: middlewareAuth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string
        token.role = 'user' as UserRole // Default role for Edge Runtime
        token.organizationId = ''
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId
        session.user.role = token.role || 'user'
        session.user.organizationId = token.organizationId || ''
      }
      return session
    },
  },

  trustHost: true,
})
