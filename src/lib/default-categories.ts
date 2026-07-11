import prisma from '@/lib/prisma';

const DEFAULT_CATEGORIES_EMAIL = 'system@default.local';

/**
 * Copies the system default category set to a user. Used at email
 * verification and lazily for legacy users who predate the copy step (the
 * old read-only fallback to system categories is impossible now that
 * transactions link to categories by foreign key).
 */
export async function copyDefaultCategories(userId: string): Promise<void> {
  const defaultUser = await prisma.user.findUnique({
    where: { email: DEFAULT_CATEGORIES_EMAIL },
  });
  if (!defaultUser) return;

  const defaults = await prisma.budgetCategory.findMany({
    where: { userId: defaultUser.id },
  });

  await prisma.budgetCategory.createMany({
    data: defaults.map((cat) => ({
      userId,
      name: cat.name,
      type: cat.type,
      monthlyLimit: cat.monthlyLimit,
      sortOrder: cat.sortOrder,
    })),
    skipDuplicates: true,
  });
}

/** Copies defaults only when the user has no categories at all. */
export async function ensureUserCategories(userId: string): Promise<void> {
  const count = await prisma.budgetCategory.count({ where: { userId } });
  if (count === 0) {
    await copyDefaultCategories(userId);
  }
}
