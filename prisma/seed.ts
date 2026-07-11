import { PrismaClient, BudgetCategoryType } from "@prisma/client";

const prisma = new PrismaClient();

const expenseCategories = [
  "Debt",
  "Education",
  "Entertainment",
  "Everyday",
  "Gifts",
  "Health/Medical",
  "Home",
  "Insurance",
  "Pets",
  "Technology",
  "Transportation",
  "Travel",
  "Utilities",
  "Other",
];

const incomeCategories = ["Wages", "Other"];

const savingsCategories = ["Savings", "Investments", "Retirement"];

async function seedCategories(
  userId: string,
  names: string[],
  type: BudgetCategoryType
): Promise<void> {
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    await prisma.budgetCategory.upsert({
      where: {
        userId_name_type: { userId, name, type },
      },
      update: { sortOrder: index },
      create: { userId, name, type, sortOrder: index },
    });
  }
}

async function main() {
  console.log("Seeding database...");

  // Create a default system user for default categories
  const systemUser = await prisma.user.upsert({
    where: { email: "system@default.local" },
    update: {},
    create: {
      email: "system@default.local",
      name: "System Default",
    },
  });

  await seedCategories(systemUser.id, expenseCategories, BudgetCategoryType.EXPENSE);
  await seedCategories(systemUser.id, incomeCategories, BudgetCategoryType.INCOME);
  await seedCategories(systemUser.id, savingsCategories, BudgetCategoryType.SAVINGS_TRANSFER);

  console.log("Seeding completed!");
  console.log(`Created ${expenseCategories.length} expense categories`);
  console.log(`Created ${incomeCategories.length} income categories`);
  console.log(`Created ${savingsCategories.length} savings & transfer categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
