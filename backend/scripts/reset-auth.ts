/**
 * Clears all users/sessions and re-seeds demo accounts with known passwords.
 * Run: npm run db:reset-auth  (PostgreSQL must be running — npm run db:up)
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing refresh tokens...");
  await prisma.refreshToken.deleteMany();

  console.log("Clearing user-linked data...");
  await prisma.vehicle.updateMany({ data: { sellerId: null } });
  await prisma.dealer.deleteMany();
  await prisma.user.deleteMany();

  console.log("Re-seeding users...");
  execSync("npm run db:seed", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });

  console.log("\nAuth reset complete. Use:");
  console.log("  dealer@gmail.com / Dealer@123");
  console.log("  admin@motorcart.in / Admin@12345");
  console.log("  customer@motorcart.in / Customer@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
