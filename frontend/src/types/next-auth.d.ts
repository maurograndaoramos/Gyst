// Type declarations for NextAuth with organization support
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

export type UserRole = 'admin' | 'user'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId: string
      role: UserRole
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    organizationId?: string | null
    role?: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string
    organizationId: string
    role: UserRole
  }
}
