import { NextRequest, NextResponse } from "next/server"
import { createUser } from "@/lib/auth/credentials"
import { db } from "@/lib/db"
import { organizations, users } from "@/lib/db/schema"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, company, role } = await request.json()

    if (!email || !password || !company) {
      return NextResponse.json(
        { error: "Email, password, and company are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Create user first without organization
    const user = await createUser({ 
      email, 
      password, 
      name,
      role: role || 'user', // Set role, defaulting to 'user' if not specified
    })

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Create organization with user as owner
    const organizationId = randomUUID()
    const [organization] = await db
      .insert(organizations)
      .values({
        id: organizationId,
        name: company,
        owner_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning()

    if (!organization) {
      // Rollback user creation if organization creation fails
      await db
        .delete(users)
        .where(eq(users.id, user.id))
      
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      )
    }

    // Update user with organization ID
    await db
      .update(users)
      .set({ 
        organizationId: organization.id,
        role: role || 'user', // Ensure role is set
      })
      .where(eq(users.id, user.id))

    return NextResponse.json(
      { 
        message: "User and organization created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: organization.id,
          role: role || 'user',
        }
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Registration error:", error)
    
    if (error instanceof Error && error.message === "User already exists") {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
