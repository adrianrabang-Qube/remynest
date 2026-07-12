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
  // LA5: data-rights + DPO route to the single currently-monitored mailbox so every
  // live legal surface (/privacy, /account-deletion, /terms, /cookies, /support) names
  // ONE working data-rights/deletion contact. Repoint to a dedicated privacy@/dpo@
  // alias once the operator provisions + monitors it (see the launch-blocker list).
  privacy: "admin@remynest.com",
  dpo: "admin@remynest.com",
  security: "security@remynest.com",
} as const;
