/**
 * Central contact configuration for RemyNest.
 *
 * ⚠️ PLACEHOLDERS — update these addresses before launch. This is the single
 * place to change contact emails; the Contact page (app/contact/page.tsx) reads
 * them from here.
 */
export const CONTACT = {
  general: "contact@remynest.com",
  enterprise: "enterprise@remynest.com",
  investors: "investors@remynest.com",
  // Support / data-rights addresses — must match docs/compliance/04 + the legal pages.
  support: "support@remynest.com",
  privacy: "privacy@remynest.com",
  dpo: "dpo@remynest.com",
  security: "security@remynest.com",
} as const;
