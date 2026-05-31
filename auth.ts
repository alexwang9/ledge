import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/lib/auth.config';
import prisma from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        // Require email verification
        if (!user.emailVerified) {
          return null;
        }

        // Require recent MFA verification, atomically consume the token to prevent reuse
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const { count } = await prisma.user.updateMany({
          where: {
            id: user.id,
            mfaVerifiedAt: { gte: fiveMinutesAgo },
          },
          data: { mfaVerifiedAt: null },
        });

        if (count === 0) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
});
