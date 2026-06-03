/**
 * Dev: mark user email as verified in MySQL
 * Usage: npx tsx scripts/confirm-email.ts user@email.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2];

async function main() {
  if (!email) {
    console.error("Usage: npx tsx scripts/confirm-email.ts user@email.com");
    process.exit(1);
  }
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) {
    console.error(`No user found: ${email}`);
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifiedAt: new Date(), isVerified: true },
  });
  console.log(`Email verified for ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
