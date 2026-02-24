/**
 * Universal image path utility
 * 
 * This ensures all image paths work consistently across different environments
 * and operating systems. All image paths should be referenced through this utility.
 * 
 * @example
 * ```tsx
 * import { IMAGES } from '@/lib/imagePaths';
 * import Image from 'next/image';
 * 
 * <Image src={IMAGES.LOGO_MARK} alt="Logo" width={40} height={40} />
 * ```
 * 
 * @example
 * ```tsx
 * import { getImagePath } from '@/lib/imagePaths';
 * 
 * const customImage = getImagePath('custom-image.jpg');
 * ```
 */

/**
 * Get the path to an image in the public/images directory
 * 
 * This function ensures consistent path formatting across all environments.
 * It handles both absolute and relative paths and normalizes them.
 * 
 * @param imageName - The name of the image file (e.g., "logo-mark.png" or "/images/logo-mark.png")
 * @returns The universal path to the image (always starts with /images/)
 * 
 * @example
 * ```ts
 * getImagePath('logo.png') // Returns: '/images/logo.png'
 * getImagePath('/images/logo.png') // Returns: '/images/logo.png'
 * getImagePath('images/logo.png') // Returns: '/images/logo.png'
 * ```
 */
export function getImagePath(imageName: string): string {
  // Remove leading slash if present to ensure consistent paths
  const cleanName = imageName.startsWith('/') ? imageName.slice(1) : imageName;
  
  // Ensure images path prefix
  if (cleanName.startsWith('images/')) {
    return `/${cleanName}`;
  }
  
  return `/images/${cleanName}`;
}

/**
 * Pre-defined image paths for commonly used images
 * 
 * This ensures consistency and makes refactoring easier.
 * All paths are relative to the public directory and work universally.
 * 
 * @example
 * ```tsx
 * import { IMAGES } from '@/lib/imagePaths';
 * 
 * <Image src={IMAGES.LOGO_MARK} alt="Logo" />
 * ```
 */
export const IMAGES = {
  // Logo images
  LOGO_MARK: '/images/logo-mark.png',
  COMPANY_NAME: '/images/company-name.png',
  
  // Provider images
  DOC_PLACEHOLDER: '/images/doc-optimized.jpg',
  
  // Specialty images
  SPEC_DERM: '/images/spec-derm.jpg',
  SPEC_PEDS: '/images/spec-peds.jpg',
  SPEC_CARD: '/images/spec-card.jpg',
  SPEC_ENT: '/images/spec-ent.jpg',
  SPEC_ORTHO: '/images/spec-ortho.jpg',
  SPEC_PSYCH: '/images/spec-psych.jpg',
  
  // Other images
  HOMEPAGE: '/images/Homepage-optimized.jpg',
  HERO_DOCTOR: '/images/hero-doctor.jpg',
  HERO_DOCTOR_2: '/images/hero-doctor-2.jpg',
  HERO_DOCTOR_3: '/images/hero-doctor-3.jpg',
  HERO_DOCTOR_5: '/images/hero-doctor-5.jpg',
  HERO_PHARMACY: '/images/hero-pharmacy.jpg',
  HERO_LABS: '/images/hero-labs.jpg',
  TEAM: '/images/team.png',
} as const;

export const HERO_DOCTOR_IMAGES = [
  '/images/hero-doctor.jpg',
  '/images/hero-doctor-2.jpg',
  '/images/hero-doctor-3.jpg',
  '/images/hero-doctor-5.jpg',
] as const;

/**
 * Returns a deterministic image for today (UTC day).
 * Cycles through the provided array — changes once every 24 hours.
 */
export function getDailyHeroImage(images: readonly string[]): string {
  const today = new Date();
  const utcDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dayIndex = Math.floor(utcDay / 86_400_000);
  return images[dayIndex % images.length];
}

/**
 * Type-safe image path helper
 * 
 * Use this for type checking when referencing images.
 * This ensures type safety when working with image paths.
 */
export type ImagePath = typeof IMAGES[keyof typeof IMAGES] | string;
