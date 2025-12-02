import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

async function main() {
  const ngo = await prisma.ngo.findFirst();
  if (!ngo) {
    console.error("No NGO found. Please create one first.");
    process.exit(1);
  }

  const email = "srilatha.chilagani@telemed.local";
  const fallback = process.env.NGO_PORTAL_DEFAULT_PASSWORD || "Passw0rd!";
  const hash = await bcrypt.hash(fallback, 10);

  const user = await prisma.ngoUser.upsert({
    where: { email },
    update: { passwordHash: hash, role: "ADMIN" },
    create: { email, passwordHash: hash, role: "ADMIN", ngoId: ngo.id },
  });

  console.log("Seeded NGO user", user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
