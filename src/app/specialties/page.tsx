const specialties = [
  {
    title: "Cardiology",
    description: "Remote heart health consults with cardiologists who can review ECGs, labs, and advise on follow-ups.",
  },
  {
    title: "Pediatrics",
    description: "Child-friendly pediatricians for growth concerns, vaccinations, and routine health queries.",
  },
  {
    title: "Dermatology",
    description: "Skin, hair, and nail experts who can evaluate rashes, acne, allergies, and prescribe treatment plans.",
  },
  {
    title: "ENT",
    description: "Ear, nose, and throat specialists for sinus issues, ear pain, and pre/post-operative follow-ups.",
  },
  {
    title: "Psychiatry",
    description: "Licensed psychiatrists available for therapy, medication reviews, and mental wellness support.",
  },
  {
    title: "Orthopedics",
    description: "Remote assessments for joint pain, sports injuries, and physiotherapy guidance.",
  },
];

export default function SpecialtiesPage() {
  return (
    <main className="bg-[#f7f9fc] py-16">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Specialties</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Explore CalDoc’s specialty network</h1>
          <p className="mt-3 text-sm text-slate-600">
            Every online visit is staffed by specialists registered in India. Browse the most-requested departments below.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {specialties.map((spec) => (
            <article key={spec.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">{spec.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{spec.description}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
