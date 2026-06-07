import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt — allow public marketing/legal pages; keep authenticated app
 * surfaces and internal endpoints out of the index. (Authenticated routes are
 * also auth-gated by middleware, so crawlers are redirected to /login.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/memories",
          "/timeline",
          "/reminders",
          "/insights",
          "/memory-chat",
          "/settings",
          "/onboarding",
          "/api/",
          "/auth/",
          "/callback",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
