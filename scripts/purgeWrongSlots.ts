import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

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
