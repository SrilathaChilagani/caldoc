"use client";

import Image from "next/image";
import { IMAGES } from "@/lib/imagePaths";

type SafeImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

/**
 * Safe Image component wrapper
 * 
 * This is a simple wrapper around Next.js Image component.
 * For error handling, Next.js Image component handles errors gracefully.
 * 
 * If you need fallback behavior, use regular Image component with proper error boundaries.
 */
export default function SafeImage({
  src,
  alt,
  width,
  height,
  fill,
  priority = false,
  className,
  sizes,
}: SafeImageProps) {
  const imageProps = {
    src,
    alt,
    priority,
    className,
    ...(fill
      ? { fill: true, sizes: sizes || "100vw" }
      : { width: width || 100, height: height || 100 }),
  };

  return <Image {...imageProps} />;
}

