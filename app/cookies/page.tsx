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
        are not optional.
      </p>

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
