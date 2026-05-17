/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * Task 5.5 — NextAuth catch-all route handler.
 * Exports both GET and POST handlers using the authOptions defined in lib/auth.ts.
 *
 * Requirements: 1.1, 1.2
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
