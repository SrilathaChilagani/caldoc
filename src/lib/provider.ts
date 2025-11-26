import { prisma } from "@/lib/db";

export async function getProviderBySlugOrId(idOrSlug: string) {
  return prisma.provider.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });
}
