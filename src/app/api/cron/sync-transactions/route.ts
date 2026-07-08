import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import prisma from '@/lib/prisma';
import { syncItemsWithIsolation } from '@/lib/plaid-sync';

export const dynamic = 'force-dynamic';
// Sequential syncs across all users can exceed the default function timeout.
// 60s is the Vercel Hobby-plan ceiling; raise if the project moves to Pro.
export const maxDuration = 60;

// Hash both sides to fixed length so timingSafeEqual never throws on length
// mismatch (which would itself leak length information).
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Periodic fallback sync, invoked by Vercel Cron (see vercel.json). Webhooks
 * are the primary trigger; this catches items whose webhooks were missed or
 * failed. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically
 * when the CRON_SECRET env var is set on the project.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed: without a secret we can't authenticate the caller.
    console.error('Cron sync rejected: CRON_SECRET is not configured');
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (!safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Items awaiting reconnection can't sync until the user relinks; skip
    // them rather than hammering Plaid with known-failing requests.
    const [items, skipped] = await Promise.all([
      prisma.plaidItem.findMany({ where: { needsRelink: false } }),
      prisma.plaidItem.count({ where: { needsRelink: true } }),
    ]);

    const summary = await syncItemsWithIsolation(items);

    return NextResponse.json({
      success: summary.itemErrors.length === 0,
      itemsProcessed: items.length,
      itemsSkippedNeedsRelink: skipped,
      ...summary,
    });
  } catch (error) {
    console.error('Cron sync failed:', error);
    return NextResponse.json({ error: 'Cron sync failed' }, { status: 500 });
  }
}
