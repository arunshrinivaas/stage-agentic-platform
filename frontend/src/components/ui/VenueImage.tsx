"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image, { ImageProps } from "next/image";

/**
 * Curated, high-resolution aesthetic venue images grouped by acoustic venue type.
 * Ensures that different venues receive distinct, contextually matching visual imagery
 * rather than hardcoding a single static image for every stage.
 */
const VENUE_TYPE_FALLBACKS: Record<string, string[]> = {
  amphitheater: [
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&auto=format&fit=crop&q=85", // Historic Brick Amphitheater
    "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=900&auto=format&fit=crop&q=85", // Seaside Open-Air Amphitheater
  ],
  loft: [
    "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900&auto=format&fit=crop&q=85", // Daylit Industrial Warehouse Loft
    "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=900&auto=format&fit=crop&q=85", // Blackbox Studio Loft
  ],
  courtyard: [
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85", // Terraced Open-Air Courtyard
    "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=900&auto=format&fit=crop&q=85", // Heritage Colonnade Courtyard
  ],
  pavilion: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=85", // Teakwood Pavilion
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=85", // Classical Mandapam Pavilion
  ],
  cellar: [
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&auto=format&fit=crop&q=85", // Underground Listening Room
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&auto=format&fit=crop&q=85", // Atmospheric Stone Cellar
  ],
  atrium: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=85", // Acoustic Glasshouse Atrium
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=900&auto=format&fit=crop&q=85", // Contemporary Concert Atrium
  ],
};

const GENERAL_FALLBACKS: string[] = [
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=900&auto=format&fit=crop&q=85",
];

/**
 * Deterministically select a category-matched fallback image based on venue type and ID/name.
 */
export function getVenueFallbackUrl(
  venueId?: string,
  venueName?: string,
  venueType?: string
): string {
  const seed = (venueId || venueName || "stage-venue")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const typeKey = (venueType || "").toLowerCase();

  let pool: string[] | undefined;
  for (const [key, list] of Object.entries(VENUE_TYPE_FALLBACKS)) {
    if (typeKey.includes(key)) {
      pool = list;
      break;
    }
  }

  if (!pool || pool.length === 0) {
    pool = GENERAL_FALLBACKS;
  }

  const index = Math.abs(seed) % pool.length;
  return pool[index];
}

/**
 * Validates whether a candidate string is a parseable remote or local image path.
 */
function isValidImageSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  );
}

export interface VenueImageProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  venueId?: string;
  venueName?: string;
  venueType?: string;
}

/**
 * Resilient Next.js Venue Image Component.
 * - Preserves Next.js Image optimization (fill, sizes, responsive WebP/AVIF generation).
 * - Detects and replaces missing, empty (""), null, or malformed src strings with category-matched fallbacks.
 * - Handles remote network/404 load errors gracefully without breaking layout or console error cascades.
 * - Ensures diverse, non-hardcoded visual representation across different venues.
 */
export function VenueImage({
  src,
  alt,
  venueId,
  venueName,
  venueType,
  className,
  fill = true,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  ...rest
}: VenueImageProps) {
  const fallbackUrl = useMemo(
    () => getVenueFallbackUrl(venueId, venueName, venueType),
    [venueId, venueName, venueType]
  );

  const validInitialSrc = isValidImageSrc(src) ? src.trim() : fallbackUrl;
  const [currentSrc, setCurrentSrc] = useState<string>(validInitialSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isValidImageSrc(src)) {
      setCurrentSrc(src.trim());
      setHasError(false);
    } else {
      setCurrentSrc(fallbackUrl);
    }
  }, [src, fallbackUrl]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallbackUrl);
    }
  };

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt || venueName || "Acoustic Performance Venue"}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={handleError}
    />
  );
}

