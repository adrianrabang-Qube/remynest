import LegalPage from "@/components/legal/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms governing your use of RemyNest's memory-preservation and family memory-sharing services.",
  path: "/terms",
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

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="2026-06-05"
    >
      <p>
        These Terms govern your use of RemyNest. By creating an account or
        using the service, you agree to these Terms.
      </p>

      <H>The service is not medical care</H>
      <p>
        RemyNest is a memory and reflection tool. It is{" "}
        <strong>not a medical device</strong> and does not provide medical
        advice, diagnosis, treatment, or disease detection. Always consult a
        qualified healthcare professional for medical concerns.
      </p>

      <H>Eligibility</H>
      <p>
        You must be an adult capable of forming a binding contract to use
        RemyNest.
      </p>

      <H>Your account</H>
      <p>
        You are responsible for safeguarding your credentials and for
        activity under your account. Notify us of any unauthorized use.
      </p>

      <H>Acceptable use</H>
      <p>
        Do not misuse the service, attempt to bypass security or access
        controls, upload unlawful content, or use the service to harm
        others.
      </p>

      <H>Objectionable content &amp; abusive behavior</H>
      <p>
        RemyNest has <strong>zero tolerance</strong> for objectionable,
        abusive, harassing, threatening, hateful, or unlawful content, and
        for abusive behavior toward other people who use the service
        (including caregivers and family members you share content with). You
        agree not to post such content or behave in such a way.
      </p>
      <p>
        If you encounter objectionable content or abusive behavior, you can
        report it to <strong>admin@remynest.com</strong>. We review reports
        and act on them &mdash; typically within 24 hours &mdash; and we may
        remove content and suspend or permanently terminate the accounts of
        offending users without prior notice. If someone you invited abuses
        their access, you can remove their access at any time from the
        workspace&rsquo;s &ldquo;Manage care profiles&rdquo; controls.
      </p>

      <H>Subscriptions &amp; billing</H>
      <p>
        Paid plans are billed through Stripe. Paid subscriptions renew
        automatically until cancelled; you can cancel at any time, effective
        at the end of the current billing period, unless otherwise required
        by law. Prices and plan features are described in the app.
      </p>

      <H>AI features</H>
      <p>
        AI-generated content is produced from the information you provide,
        may be inaccurate or incomplete, and is non-diagnostic. You are
        responsible for how you use it.
      </p>

      <H>Your content</H>
      <p>
        You retain ownership of the content you create. You grant RemyNest
        the limited license needed to host, process, and display your
        content to operate the service (including AI processing and sharing
        with caregivers you invite).
      </p>

      <H>Caregiver access</H>
      <p>
        If you invite caregivers, you authorize them to access the profiles
        and content you share with them according to the access level you
        assign.
      </p>

      <H>Termination</H>
      <p>
        You may stop using the service at any time. We may suspend or
        terminate access for violations of these Terms or to protect the
        service and its users.
      </p>

      <H>Disclaimers</H>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of
        any kind to the maximum extent permitted by law.
      </p>

      <H>Limitation of liability</H>
      <p>
        To the maximum extent permitted by law, RemyNest is not liable for
        indirect, incidental, or consequential damages arising from your use
        of the service.
      </p>

      <H>Governing law</H>
      <p>
        These Terms are governed by the laws of Ireland, and the courts of
        Ireland have exclusive jurisdiction over any dispute arising from
        them. Nothing in this section limits any mandatory consumer
        protections you are entitled to under the laws of the country where
        you live.
      </p>

      <H>Changes</H>
      <p>
        We may update these Terms and will revise the effective date above.
        Continued use after changes constitutes acceptance.
      </p>

      <H>Contact</H>
      <p>
        Questions: <strong>admin@remynest.com</strong>.
      </p>
    </LegalPage>
  );
}
