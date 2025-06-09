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
    const organizationId = searchParams.get('organizationId')

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // TODO: Add authorization check to ensure user has access to this organization
    // For now, we'll proceed with fetching files

    // Get organization files
    const files = await searchService.getOrganizationFiles(organizationId)

    return NextResponse.json(files)
  } catch (error) {
    console.error('Files API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
