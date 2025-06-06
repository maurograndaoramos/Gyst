import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { searchService } from '@/lib/services/search-service'

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || undefined
    const organizationId = searchParams.get('organizationId')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const highlight = searchParams.get('highlight') === 'true'

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // TODO: Add authorization check to ensure user has access to this organization
    // For now, we'll proceed with the search

    // Perform search
    const searchResponse = await searchService.searchDocuments({
      query,
      organizationId,
      tags,
      page,
      limit,
      highlight
    })

    return NextResponse.json(searchResponse)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
