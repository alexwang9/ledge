/**
 * One-time migration: registers our webhook endpoint (PLAID_WEBHOOK_URL) on
 * every existing PlaidItem via /item/webhook/update, so Plaid starts pushing
 * SYNC_UPDATES_AVAILABLE / ITEM webhooks for items linked before webhook
 * support shipped. Newly linked items get the webhook at link-token creation.
 *
 * Also backfills PlaidItem.plaidItemId where null — the webhook handler
 * matches incoming webhooks on that column, so null rows would silently drop
 * webhooks.
 *
 * Safe to re-run; updating the webhook to the same URL is a no-op on Plaid's
 * side. Items flagged needsRelink are NOT skipped: the webhook must be
 * registered so ITEM/LOGIN_REPAIRED can arrive after the user reconnects.
 *
 * Requires ENCRYPTION_KEY, PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, and
 * PLAID_WEBHOOK_URL in the environment.
 *
 * Run with: `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/register-webhooks.ts`
 */
import { PrismaClient } from '@prisma/client';
import { plaidClient } from '../src/lib/plaid';
import { decryptToken } from '../src/lib/crypto';
import { getPlaidErrorCode } from '../src/lib/plaid-sync';

const prisma = new PrismaClient();

async function main() {
  const webhookUrl = process.env.PLAID_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('PLAID_WEBHOOK_URL is not set');
  }

  const items = await prisma.plaidItem.findMany({
    select: { id: true, accessToken: true, plaidItemId: true, institutionName: true },
  });

  let updated = 0;
  let backfilled = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = decryptToken(item.accessToken);
      const resp = await plaidClient.itemWebhookUpdate({
        access_token: accessToken,
        webhook: webhookUrl,
      });
      updated++;

      const plaidItemId = resp.data.item?.item_id;
      if (!item.plaidItemId && plaidItemId) {
        await prisma.plaidItem.update({
          where: { id: item.id },
          data: { plaidItemId },
        });
        backfilled++;
      }
    } catch (err) {
      failed++;
      const code = getPlaidErrorCode(err);
      console.error(
        `Failed for ${item.institutionName} (${item.id}): ${code ?? (err instanceof Error ? err.message : 'unknown error')}`
      );
    }
  }

  console.log(
    `Webhook registered on ${updated} item(s), backfilled plaidItemId on ${backfilled}, ${failed} failed.`
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
