import type { User } from "next-auth"
import { compare, hash } from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export interface CustomUser extends User {
  role?: string
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<CustomUser | null> {
  try {
    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user.length || !user[0].password) {
      return null
    }

    const foundUser = user[0]

    // Verify password against stored hash - check for null before comparing
    if (!foundUser.password) {
      return null
    }

    const isValid = await compare(password, foundUser.password)

    if (!isValid) {
      return null
    }

    return {
      id: foundUser.id,
      email: foundUser.email!,
      name: foundUser.name,
      image: foundUser.image,
      role: "user", // You can add role logic here
    }
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
      })
      .returning()

    if (!newUser.length) {
      return null
    }

    const user = newUser[0]
    return {
      id: user.id,
      email: user.email!,
      name: user.name,
      role: "user",
    }
  } catch (error) {
    console.error("User creation error:", error)
    return null
  }
}
