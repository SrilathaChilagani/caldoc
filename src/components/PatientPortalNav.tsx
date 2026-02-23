import Link from "next/link";

type TabKey = "appointments" | "pharmacy" | "labs";

type Props = {
  active: TabKey;
  phone?: string;
};

function buildHref(path: string, phone?: string) {
  if (!phone) return path;
  const qp = new URLSearchParams({ phone });
  return `${path}?${qp.toString()}`;
}

export default function PatientPortalNav({ active, phone }: Props) {
  const base = [
    { key: "appointments" as const, label: "Appointments", href: "/patient/appointments" },
    { key: "pharmacy" as const, label: "Pharmacy", href: "/patient/pharmacy" },
    { key: "labs" as const, label: "Labs", href: "/patient/labs" },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {base.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={buildHref(tab.href, phone)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              isActive
                ? "bg-[#2f6ea5] text-white"
                : "border border-slate-200 text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
