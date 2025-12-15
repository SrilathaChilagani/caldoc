import ProviderLoginPage from "@/app/provider/login/page";

type SearchParams = { next?: string; logged_out?: string; err?: string; uid?: string };

export default function PharmacyLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const mergedSearch = (async () => {
    const sp = (await searchParams) || {};
    if (!sp.next) {
      sp.next = "/pharmacy";
    }
    return sp;
  })();

  return ProviderLoginPage({ searchParams: mergedSearch });
}
