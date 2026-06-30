import Link from "next/link";

type TabKey = "appointments" | "labs" | "pharmacy" | "profile";

type Props = {
  active: TabKey;
  phone?: string;
};

function buildHref(path: string, phone?: string) {
  if (!phone) return path;
  const qp = new URLSearchParams({ phone });
  return `${path}?${qp.toString()}`;
}

const TABS: { key: TabKey; label: string; href: string }[] = [
  { key: "appointments", label: "Appointments", href: "/patient/appointments" },
  { key: "labs",         label: "Lab Orders",   href: "/patient/labs" },
  { key: "pharmacy",     label: "Pharmacy",      href: "/patient/pharmacy" },
  { key: "profile",      label: "Profile",       href: "/patient/profile" },
];

export default function PatientPortalNav({ active, phone }: Props) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={buildHref(tab.href, phone)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-[#2f6ea5] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
