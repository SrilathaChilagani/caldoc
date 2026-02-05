"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

export default function EmbedAwareLayout({ header, footer, children }: Props) {
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed");
  const isEmbed = embed === "1" || embed === "true";

  return (
    <>
      {!isEmbed && header}
      {children}
      {!isEmbed && footer}
    </>
  );
}
