export function buildProviderWhere(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return {};
  const terms = trimmed
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!terms.length) return {};
  const clauses = terms.flatMap((word) => [
    { name: { contains: word, mode: "insensitive" as const } },
    { speciality: { contains: word, mode: "insensitive" as const } },
    { slug: { contains: word, mode: "insensitive" as const } },
    { licenseNo: { contains: word, mode: "insensitive" as const } },
    { id: word },
  ]);
  return { OR: clauses };
}
