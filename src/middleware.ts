import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthenticated = !!token;

  // If user is authenticated:
  // - Redirect from /login to /collections
  // - Allow access to / and other pages (like /collections)
  if (isAuthenticated) {
    if (pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    return NextResponse.next();
  }

  // If user is not authenticated:
  // - If trying to access a protected route (e.g., /collections), redirect to /login
  // - If on root (/), redirect to /login
  // - Allow access to /login page itself
  if (!isAuthenticated) {
    if (pathname.startsWith('/collections')) { // Example of a protected route
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    // Allow access to /login and any other public paths (e.g. API routes for auth)
    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }
  }

  return NextResponse.next();
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any paths with a file extension (e.g., .png, .svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    '/', // Explicitly include the root path if not covered by the above
  ],
};