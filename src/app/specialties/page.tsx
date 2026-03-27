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
    <main className="bg-[#f7f2ea] py-16">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 lg:px-10">
        <div className="border-b border-slate-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Specialties</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900">Explore CalDoc’s specialty network</h1>
          <p className="mt-3 text-sm text-slate-600">
            Every online visit is staffed by specialists registered in India. Browse the most-requested departments below.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          {specialties.map((spec) => (
            <article key={spec.title} className="border-b border-slate-200 py-6 md:px-4">
              <h2 className="text-xl font-semibold text-slate-900">{spec.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{spec.description}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
