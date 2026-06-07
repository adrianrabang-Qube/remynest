import LegalPage from "@/components/legal/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How RemyNest collects, uses, and protects your personal information and memory data.",
  path: "/privacy",
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

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="2026-06-05"
    >
      <p>
        RemyNest is a memory platform that helps individuals, families,
        and caregivers preserve memories and support people affected by
        memory loss. This policy explains what personal data we collect,
        how we use it, and the rights you have over it.
      </p>

      <H>Who we are</H>
      <p>
        RemyNest is the data controller for the personal data described
        here. For privacy questions or to exercise your rights, contact us
        at <strong>admin@remynest.com</strong>.
      </p>

      <H>Data we collect</H>
      <p>
        Account information (email, profile details); memory content you
        create, which may include health-related personal information;
        uploaded media; reminders; caregiver relationships and invitations;
        push-notification device tokens; billing information processed by
        our payment provider; and technical/diagnostic logs.
      </p>

      <H>How we use your data</H>
      <p>
        To provide and secure the service; to generate AI reflections and
        summaries of your memories; to deliver reminders and notifications;
        to process subscriptions; and to comply with legal obligations.
      </p>

      <H>Legal bases (where GDPR applies)</H>
      <p>
        Performance of our contract with you; your consent (including for
        health-related content and notifications); our legitimate interests
        in operating and improving the service; and compliance with legal
        obligations.
      </p>

      <H>Service providers (processors)</H>
      <p>
        We share data with providers who process it on our behalf: Supabase
        (hosting, database, authentication, storage), OpenAI (AI features),
        Stripe (billing), OneSignal (push notifications), and Vercel
        (application hosting). Each processes data only to provide their
        service to us.
      </p>

      <H>AI features &amp; health-related data</H>
      <p>
        Memory content may constitute special-category (health) data. AI
        features generate non-diagnostic reflections only and do not provide
        medical advice, diagnosis, or treatment. See our in-app AI notices.
      </p>

      <H>Sharing</H>
      <p>
        We share your data with caregivers you explicitly invite, with the
        processors above, and where required by law. We do not sell your
        personal data.
      </p>

      <H>International transfers</H>
      <p>
        Where data is transferred outside your region, we rely on
        appropriate safeguards such as standard contractual clauses.
      </p>

      <H>Retention</H>
      <p>
        We retain your data while your account is active and as needed for
        legal, security, and operational purposes, after which it is
        deleted or anonymized.
      </p>

      <H>Your rights</H>
      <p>
        Subject to applicable law, you may request access, rectification,
        erasure, restriction, objection, and data portability, and may
        withdraw consent. You can download your data at any time from
        Profile → Privacy &amp; GDPR → Export. Account deletion requests can
        be made by contacting <strong>admin@remynest.com</strong> while
        self-service deletion is being finalized. You may also complain to
        your local data-protection authority.
      </p>

      <H>Security</H>
      <p>
        We use access controls, row-level security, and encryption in
        transit to protect your data. No system is perfectly secure.
      </p>

      <H>Children</H>
      <p>
        RemyNest is not directed to children and is intended for use by
        adults. Caregivers are responsible for content they record about
        others.
      </p>

      <H>Changes</H>
      <p>
        We may update this policy and will revise the effective date above.
        Material changes will be communicated where required.
      </p>

      <H>Contact</H>
      <p>
        Questions or requests: <strong>admin@remynest.com</strong>.
      </p>
    </LegalPage>
  );
}
