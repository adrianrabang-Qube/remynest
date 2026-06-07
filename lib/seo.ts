import type { Metadata } from "next";

/**
 * Central SEO configuration for RemyNest. Single source of truth for the public
 * site URL, brand strings, and per-page metadata so canonicals / Open Graph /
 * Twitter tags stay consistent and never conflict.
 */
export const SITE_URL = "https://www.remynest.com";

export const SITE_NAME = "RemyNest";

export const SITE_TAGLINE = "A calm home for your memories";

export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const SITE_DESCRIPTION =
  "RemyNest is a calm, private memory-preservation and cognitive-care companion — capture meaningful memories, set gentle reminders, and share care with family.";

/** Default social share image (served from /public). */
export const SITE_OG_IMAGE = "/logo.png";

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

interface PageMetadataInput {
  title: string;
  description?: string;
  /** Route path, e.g. "/privacy". Used for the canonical + og:url. */
  path?: string;
  /**
   * When true, the title is used verbatim (no "%s — RemyNest" template). Use for
   * the homepage; leave false for sub-pages so they read "Privacy Policy — RemyNest".
   */
  absoluteTitle?: boolean;
}

/**
 * Build consistent, canonical-safe metadata for a public page. `metadataBase`
 * (set in the root layout) resolves the relative canonical/og:url to absolute.
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      siteName: SITE_NAME,
      // Re-declare the image: a child openGraph replaces (not merges) the
      // root's images, so every public page must carry its own.
      images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE],
    },
  };
}
