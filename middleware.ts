import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Match all routes except static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
