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
    const query = searchParams.get('q')
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '5')

    // Validate required parameters
    if (!query || !organizationId) {
      return NextResponse.json({ error: 'Query and Organization ID are required' }, { status: 400 })
    }

    // TODO: Add authorization check to ensure user has access to this organization
    // For now, we'll proceed with fetching suggestions

    // Get search suggestions
    const suggestions = await searchService.getSearchSuggestions(query, organizationId, limit)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Search suggestions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
