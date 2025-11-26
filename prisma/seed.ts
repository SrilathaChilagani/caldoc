// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { addHours, startOfHour } from "date-fns";

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

async function upsertProviderWithSlots(p: {
  name: string;
  speciality: string;
  languages: string[];
  licenseNo: string;
  is24x7?: boolean;
}) {
  const slug = toSlug(p.name);

  // Upsert by slug (requires slug to be unique)
  const provider = await prisma.provider.upsert({
    where: { slug },
    update: {
      name: p.name,
      speciality: p.speciality,
      languages: p.languages,
      licenseNo: p.licenseNo,
      is24x7: !!p.is24x7,
    },
    create: {
      slug,
      name: p.name,
      speciality: p.speciality,
      languages: p.languages,
      licenseNo: p.licenseNo,
      is24x7: !!p.is24x7,
    },
  });

  // Create slots only if none exist yet
  const slotCount = await prisma.slot.count({ where: { providerId: provider.id } });
  if (slotCount === 0) {
    const now = startOfHour(new Date());
    const slots = Array.from({ length: 24 }).map((_, i) => ({
      providerId: provider.id,
      startsAt: addHours(now, i + 1),
      endsAt: addHours(now, i + 2),
      isBooked: false,
    }));
    await prisma.slot.createMany({ data: slots });
    console.log(`Created 24 slots for ${provider.name}`);
  }

  return provider;
}

async function main() {
  console.log("🌱 Seeding providers and slots...");

  await upsertProviderWithSlots({
    name: "Dr. Asha Menon",
    speciality: "Pediatrics",
    languages: ["en", "hi", "ml"],
    licenseNo: "RMP-KL-123",
    is24x7: true,
  });

  await upsertProviderWithSlots({
    name: "Dr. Rohan Iyer",
    speciality: "Dermatology",
    languages: ["en", "mr"],
    licenseNo: "RMP-MH-456",
    is24x7: false,
  });

  await upsertProviderWithSlots({
    name: "Dr. Saira Khan",
    speciality: "Psychiatry",
    languages: ["en", "hi", "ur"],
    licenseNo: "RMP-DL-789",
    is24x7: true,
  });

  console.log("✅ Seed complete");
}

main()
  .finally(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
