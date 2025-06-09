import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { organizationName } = body

    if (!organizationName || typeof organizationName !== 'string') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    const trimmedName = organizationName.trim()

    // Validate organization name
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Organization name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Organization name must be less than 50 characters' },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9\s\-\_\.]+$/.test(trimmedName)) {
      return NextResponse.json(
        { error: 'Organization name contains invalid characters' },
        { status: 400 }
      )
    }

    // Check if user already has an organization
    const existingUser = await db
      .select({
        id: users.id,
        organizationId: users.organizationId
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!existingUser.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (existingUser[0].organizationId) {
      return NextResponse.json(
        { error: 'User already has an organization' },
        { status: 400 }
      )
    }

    // Check if organization name is already taken
    const existingOrg = await db
      .select({
        id: organizations.id
      })
      .from(organizations)
      .where(eq(organizations.name, trimmedName))
      .limit(1)

    if (existingOrg.length > 0) {
      return NextResponse.json(
        { error: 'Organization name is already taken' },
        { status: 409 }
      )
    }

    // Create the organization
    const newOrganization = await db
      .insert(organizations)
      .values({
        id: randomUUID(),
        name: trimmedName,
        owner_id: session.user.id,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning()

    if (!newOrganization.length) {
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    const organizationId = newOrganization[0].id

    // Update the user with the new organization ID
    await db
      .update(users)
      .set({
        organizationId: organizationId,
        updated_at: new Date(),
      })
      .where(eq(users.id, session.user.id))

    console.log(`Successfully created organization "${trimmedName}" (${organizationId}) for user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      organizationId: organizationId,
      organizationName: trimmedName,
      message: 'Organization created successfully'
    })

  } catch (error) {
    console.error('Organization setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
