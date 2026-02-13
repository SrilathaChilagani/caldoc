import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const FALLBACK_FEE_PAISE = 100;

const providerSelect = {
  id: true,
  slug: true,
  name: true,
  speciality: true,
  qualification: true,
  registrationNumber: true,
  councilName: true,
  defaultFeePaise: true,
} as const;

const legacyProviderSelect = {
  id: true,
  slug: true,
  name: true,
  speciality: true,
  qualification: true,
  registrationNumber: true,
  councilName: true,
} as const;

type ProviderWithFee = Prisma.ProviderGetPayload<{ select: typeof providerSelect }>;
type LegacyProvider = Prisma.ProviderGetPayload<{ select: typeof legacyProviderSelect }>;

function isMissingColumnError(err: unknown, column: string): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    typeof err.message === "string" &&
    err.message.includes(`\`${column}\``)
  );
}

export async function getProviderBySlugOrId(idOrSlug: string): Promise<ProviderWithFee | null> {
  try {
    return await prisma.provider.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: providerSelect,
    });
  } catch (err) {
    if (isMissingColumnError(err, "Provider.defaultFeePaise")) {
      const legacy = await prisma.provider.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
        select: legacyProviderSelect,
      });
      if (!legacy) return null;
      return { ...legacy, defaultFeePaise: FALLBACK_FEE_PAISE } as ProviderWithFee;
    }
    throw err;
  }
}
