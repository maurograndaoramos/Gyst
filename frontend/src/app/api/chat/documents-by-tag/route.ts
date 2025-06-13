import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { documents, documentTags } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')
    const organizationId = searchParams.get('organizationId')

    // Validate required parameters
    if (!tagId || !organizationId) {
      return NextResponse.json({ error: 'Tag ID and Organization ID are required' }, { status: 400 })
    }

    // Get documents with the specified tag
    const documentsWithTag = await db
      .select({
        id: documents.id,
        title: documents.title,
        originalFilename: documents.originalFilename,
        filePath: documents.filePath
      })
      .from(documents)
      .innerJoin(documentTags, eq(documents.id, documentTags.documentId))
      .where(
        and(
          eq(documents.organizationId, organizationId),
          eq(documentTags.tagId, tagId)
        )
      )
      .limit(50) // Reasonable limit for tag-based document retrieval

    return NextResponse.json(documentsWithTag)

  } catch (error) {
    console.error('Documents by tag API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
