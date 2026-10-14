/**
 * Patient-facing symptom/condition labels mapped to provider specialties.
 * These chips guide patients to the right specialty — they do NOT diagnose.
 * Labels describe the health concern; specialties are the DB values used for filtering.
 */
export const SYMPTOM_QUICK_PICKS: { label: string; specialty: string }[] = [
  { label: "Fever & cold", specialty: "General Medicine" },
  { label: "Skin & hair", specialty: "Dermatology" },
  { label: "Heart", specialty: "Cardiology" },
  { label: "Child health", specialty: "Pediatrics" },
  { label: "Women's health", specialty: "Gynecology & Obstetrics" },
  { label: "Joint & bone pain", specialty: "Orthopedics" },
  { label: "Mental health", specialty: "Psychiatry" },
  { label: "Ear, nose & throat", specialty: "ENT (Ear Nose Throat)" },
  { label: "Diabetes", specialty: "Diabetology" },
  { label: "Stomach & digestion", specialty: "Gastroenterology" },
  { label: "Eye problems", specialty: "Ophthalmology" },
  { label: "Lung & breathing", specialty: "Pulmonology / Chest Medicine" },
];
