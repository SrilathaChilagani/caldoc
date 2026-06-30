import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local first (Next.js convention), then fall back to .env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.slot.deleteMany({
    where: {
      startsAt: { gt: new Date() },
      isBooked: false,
    },
  });
  console.log(`Deleted ${result.count} future unbooked slots.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
