import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // -----------------------------
  // 1️⃣  Create Admin User
  // -----------------------------
  const adminEmail = process.env.ADMIN_EMAIL || "admin@spinwheel.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "SpinWheel Admin";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      coins: 10000, // initial balance
    },
  });

  console.log(`✅ Admin user ready: ${admin.email}`);

  // -----------------------------
  // 2️⃣  Create or Update Game Config
  // -----------------------------
  const winnerPool = Number(process.env.WINNER_POOL_PERCENT) || 70;
  const adminPool = Number(process.env.ADMIN_POOL_PERCENT) || 20;
  const appPool = Number(process.env.APP_POOL_PERCENT) || 10;

  const config = await prisma.config.upsert({
    where: { id: 1 },
    update: {
      winnerPoolPercent: winnerPool,
      adminPoolPercent: adminPool,
      appPoolPercent: appPool,
    },
    create: {
      id: 1,
      winnerPoolPercent: winnerPool,
      adminPoolPercent: adminPool,
      appPoolPercent: appPool,
    },
  });

  console.log(`✅ Config ready: ${config.winnerPoolPercent}% winner pool`);
  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
