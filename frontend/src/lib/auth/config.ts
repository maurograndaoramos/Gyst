// NextAuth v5 Configuration
// Supports Google, GitHub OAuth providers and credentials authentication
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import type { Provider } from "next-auth/providers"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

const providers: Provider[] = [
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID!,
    clientSecret: process.env.AUTH_GITHUB_SECRET!,
  }),
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    authorization: {
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code"
      }
    }
  }),
  Credentials({
    id: "credentials",
    name: "Email and Password",
    credentials: {
      email: { 
        label: "Email", 
        type: "email",
        placeholder: "user@example.com"
      },
      password: { 
        label: "Password", 
        type: "password",
        placeholder: "Your password"
      },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      try {
        // Find user in database
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .get()

        if (!user || !user.password) {
          return null
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        // Return user object (without password)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          organizationId: user.organizationId,
        }
      } catch (error) {
        console.error("Authentication error:", error)
        return null
      }
    },
  }),
]

export const authOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (account && user) {
        token.userId = user.id
        token.accessToken = account.access_token
        
        // Store organization ID in token if not already present
        if (user.organizationId) {
          token.organizationId = user.organizationId
        } else {
          // For OAuth users, assign default organization or create one
          const dbUser = await db
            .select({ organizationId: users.organizationId })
            .from(users)
            .where(eq(users.id, user.id))
            .get()
            
          token.organizationId = dbUser?.organizationId || "default"
          
          // Update user with default organization if none exists
          if (!dbUser?.organizationId) {
            await db
              .update(users)
              .set({ organizationId: "default" })
              .where(eq(users.id, user.id))
          }
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.userId as string
        session.user.organizationId = token.organizationId as string
        
        // Get fresh organization data from database
        const user = await db
          .select({ organizationId: users.organizationId })
          .from(users)
          .where(eq(users.id, token.userId as string))
          .get()
          
        if (user) {
          session.user.organizationId = user.organizationId || "default"
        }
      }
      return session
    },
    async signIn({ user, account }: any) {
      if (account?.provider !== "credentials") {
        return true
      }
      return !!user
    },
  },
  debug: process.env.NODE_ENV === "development",
}

// Export the configured NextAuth instance
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
