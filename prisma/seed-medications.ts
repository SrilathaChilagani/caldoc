import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const medications = [
  { name: "Azithromycin 500 mg", generic: "Azithromycin", form: "Tablet", strength: "500 mg", category: "LIST_B" },
  { name: "Paracetamol 650 mg", generic: "Paracetamol", form: "Tablet", strength: "650 mg", category: "OTC" },
  { name: "Amoxicillin 500 mg", generic: "Amoxicillin", form: "Capsule", strength: "500 mg", category: "LIST_A" },
  { name: "Ibuprofen 400 mg", generic: "Ibuprofen", form: "Tablet", strength: "400 mg", category: "OTC" },
  { name: "Cetirizine 10 mg", generic: "Cetirizine", form: "Tablet", strength: "10 mg", category: "OTC" },
];

async function main() {
  console.log("Seeding medications...");
  for (const med of medications) {
    await prisma.medication.upsert({
      where: { name: med.name },
      create: med,
      update: med,
    });
  }
  console.log(`Seeded ${medications.length} medications.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
