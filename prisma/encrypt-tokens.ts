/**
 * One-time migration: encrypts any plaintext PlaidItem.accessToken rows using
 * AES-256-GCM (src/lib/crypto.ts). Safe to re-run; already-encrypted rows are
 * skipped, and the guarded updateMany is a no-op if a row changed concurrently.
 *
 * Requires ENCRYPTION_KEY in the environment.
 *
 * Run with: `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/encrypt-tokens.ts`
 */
import { PrismaClient } from '@prisma/client';
import { encryptToken, isEncrypted } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.plaidItem.findMany({
    select: { id: true, accessToken: true },
  });

  let encrypted = 0;
  let skipped = 0;

  for (const item of items) {
    if (isEncrypted(item.accessToken)) {
      skipped++;
      continue;
    }
    const { count } = await prisma.plaidItem.updateMany({
      where: { id: item.id, accessToken: item.accessToken },
      data: { accessToken: encryptToken(item.accessToken) },
    });
    if (count === 1) encrypted++;
  }

  console.log(`Encrypted ${encrypted} token(s), ${skipped} already encrypted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
