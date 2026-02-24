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

  // Seed expense categories
  for (const name of expenseCategories) {
    await prisma.budgetCategory.upsert({
      where: {
        userId_name_type: {
          userId: systemUser.id,
          name,
          type: BudgetCategoryType.EXPENSE,
        },
      },
      update: {},
      create: {
        userId: systemUser.id,
        name,
        type: BudgetCategoryType.EXPENSE,
      },
    });
  }

  // Seed income categories
  for (const name of incomeCategories) {
    await prisma.budgetCategory.upsert({
      where: {
        userId_name_type: {
          userId: systemUser.id,
          name,
          type: BudgetCategoryType.INCOME,
        },
      },
      update: {},
      create: {
        userId: systemUser.id,
        name,
        type: BudgetCategoryType.INCOME,
      },
    });
  }

  console.log("Seeding completed!");
  console.log(`Created ${expenseCategories.length} expense categories`);
  console.log(`Created ${incomeCategories.length} income categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
