import { middlewareAuth } from "@/lib/auth/middleware-auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes
const protectedRoutes = ["/dashboard", "/profile", "/admin"]
const authRoutes = ["/login", "/register"]
const publicRoutes = ["/", "/landing"]
const organizationSetupRoute = "/auth/setup-organization"

// Function to check if a path matches the organization dashboard pattern
const isOrgDashboardRoute = (pathname: string): boolean => {
  return /^\/[^\/]+\/dashboard/.test(pathname)
}

// Function to check if a path is public (should not be protected)
const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.includes(pathname) || pathname.startsWith("/landing")
}

export async function middleware(request: NextRequest) {
  const session = await middlewareAuth()
  const { pathname } = request.nextUrl

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Check if it's a public route (should be accessible without authentication)
  const isPublic = isPublicRoute(pathname)
  
  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) || isOrgDashboardRoute(pathname)

  // Allow public routes without authentication
  if (isPublic) {
    return NextResponse.next()
  }

  // If user is authenticated and trying to access auth routes, redirect to home
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!session && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated, check if they need organization setup
  if (session && session.user) {
    // Allow access to organization setup page
    if (pathname === organizationSetupRoute) {
      return NextResponse.next()
    }

    // Check if user has no organization and is trying to access protected routes
    if (isProtectedRoute && (!session.user.organizationId || session.user.organizationId === '')) {
      console.log('Middleware: Redirecting user without organization to setup page:', {
        userId: session.user.id,
        currentPath: pathname,
        organizationId: session.user.organizationId
      })
      return NextResponse.redirect(new URL(organizationSetupRoute, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
