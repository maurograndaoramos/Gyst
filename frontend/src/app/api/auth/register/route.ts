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
    })

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Create organization with user as owner
    const organizationId = randomUUID()
    const organizationResult = await db
      .insert(organizations)
      .values({
        name: company,
        owner_id: user.id,
      })
      .returning()
    
    if (!Array.isArray(organizationResult) || organizationResult.length === 0) {
      // Rollback user creation if organization creation fails
      if (user.id) {
        await db
          .delete(users)
          .where(eq(users.id, user.id))
      }
      
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      )
    }
    
    const organization = organizationResult[0]



    // Update user with organization ID
    if (user.id) {
      await db
        .update(users)
        .set({ 
          organizationId: organization.id,
        })
        .where(eq(users.id, user.id))
    }

    return NextResponse.json(
      { 
        message: "User and organization created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: organization.id,
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
