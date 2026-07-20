import JsonLd from "@/components/seo/JsonLd";
import LandingClient from "@/components/marketing/LandingClient";
import NativeEntryRedirect from "@/components/NativeEntryRedirect";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  absoluteUrl,
  pageMetadata,
} from "@/lib/seo";
import { CONTACT } from "@/lib/contact";

export const metadata = pageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  // The canonical purple identity (commit 606b7c1) — the same mark every
  // platform surface uses, not the /logo.png OG-card asset.
  logo: absoluteUrl("/brand/remynest-mark.png"),
  description: SITE_DESCRIPTION,
  contactPoint: {
    "@type": "ContactPoint",
    email: CONTACT.general,
    contactType: "customer support",
  },
};

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "LifestyleApplication",
  // Web is the only platform with a live public listing; iOS is TestFlight-only
  // (no App Store URL yet) and Android is not shipped — do not claim either here.
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationLd, softwareApplicationLd]} />
      <NativeEntryRedirect />
      <LandingClient />
    </>
  );
}
