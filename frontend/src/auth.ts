import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { authenticateUser, type CustomUser } from "@/lib/auth/credentials"
import type { UserRole } from "@/types/next-auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  
  secret: process.env.AUTH_SECRET,
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    
    Credentials({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "user@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await authenticateUser(
          credentials.email as string,
          credentials.password as string
        )

        return user
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/auth/error",
    signOut: "/auth/signout",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign in, add user data to token
      if (user && user.id) {
        token.userId = user.id
        token.role = (user as CustomUser).role || 'user'
        token.organizationId = (user as CustomUser).organizationId || ''
        
        console.log('JWT initial sign in:', {
          userId: token.userId,
          organizationId: token.organizationId
        });
      }

      // Handle session update trigger or refresh missing organizationId
      if (trigger === 'update' && session) {
        token.role = session.role || token.role
        token.organizationId = session.organizationId || token.organizationId
        
        console.log('JWT session update:', {
          userId: token.userId,
          organizationId: token.organizationId
        });
      }

      // CRITICAL: If organizationId is missing, try to refresh from database
      if (token.userId && (!token.organizationId || token.organizationId === '')) {
        try {
          const { db } = await import("@/lib/db")
          const { users, organizations } = await import("@/lib/db/schema")
          const { eq } = await import("drizzle-orm")
          
          const userWithOrg = await db
            .select({
              user: users,
              organizationId: organizations.id,
            })
            .from(users)
            .leftJoin(organizations, eq(users.organizationId, organizations.id))
            .where(eq(users.id, token.userId as string))
            .limit(1);

          if (userWithOrg.length > 0 && userWithOrg[0].organizationId) {
            token.organizationId = userWithOrg[0].organizationId;
            console.log('JWT refreshed organizationId from DB:', token.organizationId);
          } else {
            console.warn('JWT: No organizationId found for user', token.userId);
          }
        } catch (error) {
          console.error('JWT: Failed to refresh organizationId:', error);
        }
      }

      return token
    },

    async session({ session, token }) {
      // Add user data from token to session
      if (session.user && token.userId) {
        session.user.id = String(token.userId)
        session.user.role = (token.role as UserRole) || 'user'
        session.user.organizationId = (token.organizationId as string) ?? ''
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  events: {
    async signIn({ user, account }) {
      console.log("User signed in:", { user: user.email, provider: account?.provider })
    },
    
    async signOut() {
      console.log("User signed out")
    },

    async linkAccount({ user }) {
      // Log when a new account is linked
      console.log("Account linked for user:", user.email)
    },

    // Removed session event logging to prevent excessive logs
  },

  debug: process.env.NODE_ENV === "development",
  
  trustHost: true,
})
