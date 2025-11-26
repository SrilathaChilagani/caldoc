// prisma/scripts/backfill-slugs.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function toSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const providers = await prisma.provider.findMany({ select: { id: true, name: true, slug: true } });

  // ensure uniqueness by suffixing if needed
  const seen = new Set<string>();
  const makeUnique = (base: string) => {
    let s = base;
    let i = 1;
    while (seen.has(s)) {
      s = `${base}-${i++}`;
    }
    seen.add(s);
    return s;
  };

  for (const p of providers) {
    if (!p.slug) {
      const base = toSlug(p.name || "provider");
      const unique = makeUnique(base);
      await prisma.provider.update({
        where: { id: p.id },
        data: { slug: unique },
      });
      console.log(`Backfilled slug for ${p.name} -> ${unique}`);
    } else {
      seen.add(p.slug);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
