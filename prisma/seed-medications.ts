import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const medications = [
  { name: "Azithromycin 500 mg", generic: "Azithromycin", form: "Tablet", strength: "500 mg", category: "LIST_B" },
  { name: "Azithromycin 250 mg", generic: "Azithromycin", form: "Tablet", strength: "250 mg", category: "LIST_B" },
  { name: "Paracetamol 500 mg", generic: "Paracetamol", form: "Tablet", strength: "500 mg", category: "OTC" },
  { name: "Paracetamol 650 mg", generic: "Paracetamol", form: "Tablet", strength: "650 mg", category: "OTC" },
  { name: "Paracetamol Syrup 250 mg/5ml", generic: "Paracetamol", form: "Syrup", strength: "250 mg/5ml", category: "OTC" },
  { name: "Paracetamol Drops 100 mg/ml", generic: "Paracetamol", form: "Drops", strength: "100 mg/ml", category: "OTC" },
  { name: "Paracetamol IV 1000 mg", generic: "Paracetamol", form: "Injection", strength: "1000 mg", category: "LIST_O" },
  { name: "Paracetamol IV 500 mg", generic: "Paracetamol", form: "Injection", strength: "500 mg", category: "LIST_O" },
  { name: "Amoxicillin 500 mg", generic: "Amoxicillin", form: "Capsule", strength: "500 mg", category: "LIST_A" },
  { name: "Amoxicillin 250 mg", generic: "Amoxicillin", form: "Capsule", strength: "250 mg", category: "LIST_A" },
  { name: "Amoxicillin + Clavulanate 625 mg", generic: "Amoxicillin/Clavulanate", form: "Tablet", strength: "625 mg", category: "LIST_A" },
  { name: "Ibuprofen 400 mg", generic: "Ibuprofen", form: "Tablet", strength: "400 mg", category: "OTC" },
  { name: "Ibuprofen 200 mg", generic: "Ibuprofen", form: "Tablet", strength: "200 mg", category: "OTC" },
  { name: "Ibuprofen + Paracetamol 400/325 mg", generic: "Ibuprofen/Paracetamol", form: "Tablet", strength: "400/325 mg", category: "OTC" },
  { name: "Cetirizine 10 mg", generic: "Cetirizine", form: "Tablet", strength: "10 mg", category: "OTC" },
  { name: "Cetirizine Syrup 5 mg/5ml", generic: "Cetirizine", form: "Syrup", strength: "5 mg/5ml", category: "OTC" },
  { name: "Pantoprazole 40 mg", generic: "Pantoprazole", form: "Tablet", strength: "40 mg", category: "LIST_O" },
  { name: "Pantoprazole 20 mg", generic: "Pantoprazole", form: "Tablet", strength: "20 mg", category: "LIST_O" },
  { name: "Pantoprazole + Domperidone 40/30 mg", generic: "Pantoprazole/Domperidone", form: "Tablet", strength: "40/30 mg", category: "LIST_O" },
  { name: "Prednisolone 10 mg", generic: "Prednisolone", form: "Tablet", strength: "10 mg", category: "LIST_O" },
  { name: "Prednisolone 5 mg", generic: "Prednisolone", form: "Tablet", strength: "5 mg", category: "LIST_O" },
  { name: "Prednisolone Syrup 15 mg/5ml", generic: "Prednisolone", form: "Syrup", strength: "15 mg/5ml", category: "LIST_O" },
  { name: "Pantoprazole IV 40 mg", generic: "Pantoprazole", form: "Injection", strength: "40 mg", category: "LIST_O" },
  { name: "Prednisone 20 mg", generic: "Prednisone", form: "Tablet", strength: "20 mg", category: "LIST_O" },
  { name: "Prednisone 5 mg", generic: "Prednisone", form: "Tablet", strength: "5 mg", category: "LIST_O" },
  { name: "Paracetamol + Caffeine 500/30 mg", generic: "Paracetamol/Caffeine", form: "Tablet", strength: "500/30 mg", category: "OTC" },
  { name: "Paracetamol + Codeine 500/30 mg", generic: "Paracetamol/Codeine", form: "Tablet", strength: "500/30 mg", category: "LIST_A" },
  { name: "Paracetamol + Chlorpheniramine 500/4 mg", generic: "Paracetamol/Chlorpheniramine", form: "Tablet", strength: "500/4 mg", category: "OTC" },
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
