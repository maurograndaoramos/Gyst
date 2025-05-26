import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes
const protectedRoutes = ["/dashboard", "/profile", "/admin"]
const authRoutes = ["/auth/signin", "/auth/signup"]

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // If user is authenticated and trying to access auth routes, redirect to home
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If user is not authenticated and trying to access protected routes, redirect to signin
  if (!session && isProtectedRoute) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(signInUrl)
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
