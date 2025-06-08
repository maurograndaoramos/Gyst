import type { User } from "next-auth"
import { compare, hash } from "bcryptjs"
import { db } from "@/lib/db"
import { users, organizations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { UserRole } from "@/types/next-auth"

export interface CustomUser extends User {
  role: UserRole
  organizationId?: string
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<CustomUser | null> {
  try {
    // Find user by email and join with organizations
    const user = await db
      .select({
        user: users,
        organizationId: organizations.id,
        organizationName: organizations.name,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.email, email))
      .limit(1);

    if (!user.length || !user[0].user.password) {
      return null;
    }

    const foundUser = user[0].user;

    // Verify password against stored hash
    if (!foundUser.password) {
      return null;
    }

    const isValid = await compare(password, foundUser.password);

    if (!isValid) {
      return null;
    }

    // Create default organization if user doesn't have one
    let orgId = user[0].organizationId;
    if (!orgId) {
      const defaultOrg = await db.insert(organizations)
        .values({
          name: `${foundUser.name || 'User'}'s Organization`,
          owner_id: foundUser.id,
        })
        .returning();

      if (defaultOrg.length > 0) {
        orgId = defaultOrg[0].id;
        // Update user with new organization
        await db.update(users)
          .set({ organizationId: orgId })
          .where(eq(users.id, foundUser.id));
      }
    }

    return {
      id: foundUser.id,
      email: foundUser.email!,
      name: foundUser.name,
      image: foundUser.image,
      role: "user" as UserRole,
      organizationId: orgId || "",
    };
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12)
}

export async function createUser(userData: {
  email: string
  name?: string
  password: string
  organizationId?: string
}): Promise<CustomUser | null> {
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1)

    if (existingUser.length > 0) {
      throw new Error("User already exists")
    }

    // Hash password before storing
    const hashedPassword = await hashPassword(userData.password)
    
    const newUser = await db
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        organizationId: userData.organizationId || null,
      })
      .returning()

    if (!Array.isArray(newUser) || !newUser.length) {
      return null
    }

    const user = newUser[0]
    return {
      id: user.id,
      email: user.email!,
      name: user.name,
      role: "user" as UserRole,
      organizationId: user.organizationId || "",
    }
  } catch (error) {
    console.error("User creation error:", error)
    return null
  }
}
