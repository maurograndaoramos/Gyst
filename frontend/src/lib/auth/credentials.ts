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
      // Perform organization creation and user update in a single transaction
      try {
        const defaultOrg = await db.insert(organizations)
          .values({
            name: `${foundUser.name || 'User'}'s Organization`,
            owner_id: foundUser.id,
          })
          .returning();

        if (defaultOrg.length > 0) {
          orgId = defaultOrg[0].id;
          
          // CRITICAL: Update user with new organization ID synchronously
          await db.update(users)
            .set({ organizationId: orgId })
            .where(eq(users.id, foundUser.id));
          
          console.log(`Created organization ${orgId} for user ${foundUser.id}`);
        } else {
          console.error("Failed to create organization for user", foundUser.id);
          throw new Error("Failed to create organization");
        }
      } catch (orgError) {
        console.error("Organization creation error:", orgError);
        // Don't fail the login, but ensure we handle this case
        orgId = "";
      }
    }

    return {
      id: foundUser.id,
      email: foundUser.email!,
      name: foundUser.name,
      image: foundUser.image,
      role: foundUser.role || "admin" as UserRole, // Use stored role or default to admin
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
        role: "admin", // Set all new users as admin by default
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
      role: user.role || "admin" as UserRole, // Use stored role or default to admin
      organizationId: user.organizationId || "",
    }
  } catch (error) {
    console.error("User creation error:", error)
    return null
  }
}
