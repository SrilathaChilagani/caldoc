"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type Props = {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

export default function EmbedAwareLayout({ header, footer, children }: Props) {
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const embed = params.get("embed");
    setIsEmbed(embed === "1" || embed === "true");
  }, []);

  return (
    <>
      {!isEmbed && header}
      {children}
      {!isEmbed && footer}
    </>
  );
}
