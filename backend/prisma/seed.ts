import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await hashPassword("Admin@12345");
  const customerPass = await hashPassword("Customer@123");
  const dealerPass = await hashPassword("Dealer@123");

  await prisma.user.upsert({
    where: { email: "admin@motorcart.in" },
    update: {},
    create: {
      email: "admin@motorcart.in",
      passwordHash: adminPass,
      fullName: "Platform Admin",
      role: "super_admin",
      status: "active",
      emailVerified: true,
      isVerified: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "customer@motorcart.in" },
    update: {},
    create: {
      email: "customer@motorcart.in",
      passwordHash: customerPass,
      fullName: "Demo Customer",
      role: "customer",
      status: "active",
      emailVerified: true,
    },
  });

  const dealerUser = await prisma.user.upsert({
    where: { email: "dealer@gmail.com" },
    update: {
      passwordHash: dealerPass,
      emailVerified: true,
      status: "active",
      approvalStatus: "approved",
      onboardingStatus: "approved",
      kycStatus: "verified",
      isVerified: true,
    },
    create: {
      email: "dealer@gmail.com",
      passwordHash: dealerPass,
      fullName: "Demo Dealer",
      role: "dealer",
      status: "active",
      approvalStatus: "approved",
      onboardingStatus: "approved",
      kycStatus: "verified",
      emailVerified: true,
      isVerified: true,
    },
  });

  const marketplaceDealers = [
    { slug: "automax-mumbai", name: "AutoMax Motors", city: "Mumbai", state: "Maharashtra", phone: "919876543210" },
    { slug: "premium-cars-mumbai", name: "Premium Cars Mumbai", city: "Mumbai", state: "Maharashtra", phone: "919876543211" },
    { slug: "capital-wheels-delhi", name: "Capital Wheels", city: "Delhi NCR", state: "Delhi", phone: "919811223344" },
    { slug: "maruti-arena-delhi", name: "Maruti Arena Delhi", city: "Delhi NCR", state: "Delhi", phone: "919811223345" },
    { slug: "greendrive-bangalore", name: "GreenDrive EV", city: "Bangalore", state: "Karnataka", phone: "919988776655" },
    { slug: "south-india-motors", name: "South India Motors", city: "Bangalore", state: "Karnataka", phone: "919988776656" },
    { slug: "fleet-masters-hyd", name: "Fleet Masters Hyderabad", city: "Hyderabad", state: "Telangana", phone: "919933445566" },
    { slug: "southern-wheels", name: "Southern Wheels", city: "Chennai", state: "Tamil Nadu", phone: "919944556677" },
    { slug: "bikehub-pune", name: "BikeHub Pune", city: "Pune", state: "Maharashtra", phone: "919977889900" },
    { slug: "commercial-motors-pune", name: "Commercial Motors Pune", city: "Pune", state: "Maharashtra", phone: "919922334455" },
    { slug: "toyota-plus-ahmedabad", name: "Toyota Plus Ahmedabad", city: "Ahmedabad", state: "Gujarat", phone: "919966778899" },
    { slug: "kia-kolkata", name: "Kia Motors Kolkata", city: "Kolkata", state: "West Bengal", phone: "919955667788" },
    { slug: "ev-junction-jaipur", name: "EV Junction Jaipur", city: "Jaipur", state: "Rajasthan", phone: "919988990011" },
    { slug: "heartland-autos", name: "Heartland Autos", city: "Lucknow", state: "Uttar Pradesh", phone: "919900112233" },
  ] as const;

  for (const d of marketplaceDealers) {
    await prisma.dealer.upsert({
      where: { slug: d.slug },
      update: { name: d.name, city: d.city, state: d.state, phone: d.phone, isVerified: true, verificationStatus: "verified" },
      create: {
        ownerId: dealerUser.id,
        name: d.name,
        slug: d.slug,
        city: d.city,
        state: d.state,
        phone: d.phone,
        isVerified: true,
        verificationStatus: "verified",
        dealerType: "dealer",
      },
    });
  }

  const demoDealer = await prisma.dealer.findFirst({ where: { ownerId: dealerUser.id, slug: "automax-mumbai" } });

  const categories = [
    { cat: "cars", brand: "Hyundai", model: "Creta" },
    { cat: "bikes", brand: "Royal Enfield", model: "Classic 350" },
    { cat: "trucks", brand: "Tata", model: "Prima" },
    { cat: "buses", brand: "Ashok Leyland", model: "Viking" },
  ];

  for (const v of categories) {
    const slug = `${v.cat}-${v.brand}-${v.model}`.toLowerCase().replace(/\s+/g, "-");
    await prisma.vehicle.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: `${v.brand} ${v.model}`,
        brand: v.brand,
        model: v.model,
        year: 2024,
        price: 850000,
        fuelType: "petrol",
        transmission: "automatic",
        bodyType: v.cat === "bikes" ? "motorcycle" : "suv",
        category: v.cat,
        city: "Mumbai",
        state: "Maharashtra",
        images: [`/media/vehicles/${v.cat}/${v.brand}/${v.model}/01.webp`],
        status: "available",
        dealerId: demoDealer?.id,
        sellerId: dealerUser.id,
      },
    });
  }

  await prisma.communityUserProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      displayName: "Demo Customer",
      handle: "demo_customer",
      bio: "Car enthusiast from Mumbai",
      locationCity: "Mumbai",
    },
  });

  await prisma.communityUserProfile.upsert({
    where: { userId: dealerUser.id },
    update: {},
    create: {
      userId: dealerUser.id,
      displayName: "Demo Dealer",
      handle: "demo_dealer",
      persona: "dealer",
      bio: "Trusted dealer on MotorCart",
      locationCity: "Mumbai",
      isVerified: true,
    },
  });

  const groups = [
    { slug: "ev-enthusiasts", name: "EV Enthusiasts", description: "Electric vehicles and charging in India" },
    { slug: "mumbai-car-club", name: "Mumbai Car Club", description: "Buy, sell, discuss cars in Mumbai" },
    { slug: "bike-riders-india", name: "Bike Riders India", description: "Motorcycles, touring, and gear" },
  ] as const;

  const seededGroups: { id: string; slug: string }[] = [];
  for (const g of groups) {
    const row = await prisma.communityGroup.upsert({
      where: { slug: g.slug },
      update: { name: g.name, description: g.description },
      create: { name: g.name, slug: g.slug, description: g.description, groupType: "open" },
    });
    seededGroups.push({ id: row.id, slug: row.slug });
  }

  const demoPosts = [
    { authorId: customerUser.id, content: "Just test-drove the Hyundai Creta — smooth ride! #creta #suv", groupSlug: "mumbai-car-club" },
    { authorId: dealerUser.id, content: "Fresh stock: Royal Enfield Classic 350 at AutoMax Mumbai. #bikes", groupSlug: "bike-riders-india" },
    { authorId: customerUser.id, content: "EV for daily commute — Tata Nexon EV vs MG Comet? #ev", groupSlug: "ev-enthusiasts" },
    { authorId: dealerUser.id, content: "Weekend offer on certified pre-owned SUVs. Browse on MotorCart.", groupSlug: "mumbai-car-club" },
  ] as const;

  for (const p of demoPosts) {
    const group = seededGroups.find((g) => g.slug === p.groupSlug);
    const existing = await prisma.socialPost.findFirst({
      where: { authorId: p.authorId, content: p.content },
    });
    if (!existing) {
      await prisma.socialPost.create({
        data: {
          authorId: p.authorId,
          content: p.content,
          groupId: group?.id,
          moderationStatus: "approved",
        },
      });
    }
  }

  console.log("Seed complete:");
  console.log("  admin@motorcart.in / Admin@12345");
  console.log("  customer@motorcart.in / Customer@123");
  console.log("  dealer@gmail.com / Dealer@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
