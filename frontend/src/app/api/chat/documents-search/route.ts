import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { documents, tags, documentTags } from '@/lib/db/schema'
import { and, eq, like, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const organizationId = searchParams.get('organizationId')

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    if (!query || query.length < 1) {
      return NextResponse.json({ documents: [], tags: [] })
    }

    const searchTerm = `%${query.toLowerCase()}%`

    // Search documents
    const documentResults = await db
      .select({
        id: documents.id,
        title: documents.title,
        originalFilename: documents.originalFilename,
        filePath: documents.filePath,
        type: sql<'document'>`'document'`
      })
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, organizationId),
          sql`(lower(${documents.title}) LIKE ${searchTerm} OR lower(${documents.originalFilename}) LIKE ${searchTerm})`
        )
      )
      .limit(10)

    // Search tags
    const tagResults = await db
      .select({
        id: tags.id,
        name: tags.name,
        type: sql<'tag'>`'tag'`,
        documentCount: sql<number>`count(distinct ${documentTags.documentId})`
      })
      .from(tags)
      .leftJoin(documentTags, eq(tags.id, documentTags.tagId))
      .leftJoin(documents, and(
        eq(documentTags.documentId, documents.id),
        eq(documents.organizationId, organizationId)
      ))
      .where(sql`lower(${tags.name}) LIKE ${searchTerm}`)
      .groupBy(tags.id, tags.name)
      .having(sql`count(distinct ${documentTags.documentId}) > 0`)
      .limit(10)

    // Format results
    const formattedDocuments = documentResults.map(doc => ({
      id: doc.id,
      name: doc.originalFilename || doc.title,
      title: doc.title,
      filePath: doc.filePath,
      type: 'document' as const
    }))

    const formattedTags = tagResults.map(tag => ({
      id: tag.id,
      name: tag.name,
      documentCount: tag.documentCount,
      type: 'tag' as const
    }))

    return NextResponse.json({
      documents: formattedDocuments,
      tags: formattedTags
    })

  } catch (error) {
    console.error('Document search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
