/* prisma/seed-provider-users.ts */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** slugify the provider name for a clean email local-part */
function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  const defaultPassword = process.env.PROVIDER_DEFAULT_PASSWORD || "Passw0rd!";
  const saltRounds = 10;

  console.log("🌱 Seeding provider users…");

  const providers = await prisma.provider.findMany({
    select: { id: true, name: true },
  });

  let created = 0;
  let skipped = 0;

  for (const p of providers) {
    const local = slugify(p.name) || `provider-${p.id.slice(0, 6)}`;
    const email = `${local}@telemed.local`.toLowerCase();

    const existing = await prisma.providerUser.findFirst({
      where: { OR: [{ providerId: p.id }, { email }] },
      select: { id: true, email: true },
    });

    if (existing) {
      console.log(`↷ Skip: providerUser already exists for ${p.name} (${existing.email})`);
      skipped++;
      continue;
    }

    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    await prisma.providerUser.create({
      data: {
        providerId: p.id,
        email,
        passwordHash,
        role: "admin",
      },
    });

    console.log(`✓ Created provider user for ${p.name} -> ${email}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  console.log(`Default password used: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
