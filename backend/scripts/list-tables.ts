import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe<{ Tables_in_motorcart: string }[]>(
    "SHOW TABLES"
  );
  console.log(`Found ${tables.length} tables in motorcart:`);
  tables.forEach((t) => console.log(" -", t.Tables_in_motorcart));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
