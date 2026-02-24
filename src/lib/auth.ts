import { NextResponse } from 'next/server';
import { auth } from '@/../../auth';

export async function requireAuth(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { userId: session.user.id };
}

export { auth };
