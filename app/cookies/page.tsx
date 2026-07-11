import LegalPage from "@/components/legal/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "How RemyNest uses cookies and similar technologies, and the choices available to you.",
  path: "/cookies",
});

const H = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <h2 className="text-xl font-semibold text-[#243428]">
    {children}
  </h2>
);

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      effectiveDate="2026-06-05"
    >
      <p>
        This policy explains how RemyNest uses cookies and similar
        technologies.
      </p>

      <H>Strictly necessary cookies</H>
      <p>
        We use essential cookies to keep you signed in and to operate core
        features — for example, your authentication session and the active
        profile context. The service cannot function without these, so they
        are not optional. The specific cookies we set are:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>sb-&lt;project&gt;-auth-token</strong> — your Supabase
          authentication session (keeps you signed in). Strictly necessary;
          <code>httpOnly</code>, <code>Secure</code>. Cleared when you sign
          out or the session expires.
        </li>
        <li>
          <strong>remynest-active-context</strong> — remembers which workspace
          (your personal Nest or a care profile) you are viewing. Strictly
          necessary functional cookie; <code>httpOnly</code>,{" "}
          <code>Secure</code>, <code>SameSite=Lax</code>. No analytics,
          marketing, or cross-site tracking.
        </li>
      </ul>

      <H>Third-party services</H>
      <p>
        Some features rely on third parties that may set their own cookies
        or storage when used: Stripe (secure payments) and OneSignal (push
        notifications, which require your explicit opt-in).
      </p>

      <H>No advertising or cross-site tracking</H>
      <p>
        RemyNest does not use advertising cookies or third-party cross-site
        tracking cookies.
      </p>

      <H>Managing cookies</H>
      <p>
        You can control or delete cookies through your browser settings.
        Blocking strictly necessary cookies will prevent you from signing in
        and using the service.
      </p>

      <H>Consent</H>
      <p>
        Because we currently use only strictly necessary cookies (and
        opt-in services such as push notifications), a blocking consent
        banner is not required. This position should be confirmed by legal
        counsel and revisited if non-essential or analytics cookies are
        introduced.
      </p>

      <H>Changes</H>
      <p>
        We may update this policy and will revise the effective date above.
      </p>

      <H>Contact</H>
      <p>
        Questions: <strong>admin@remynest.com</strong>.
      </p>
    </LegalPage>
  );
}
