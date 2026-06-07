import dynamic from "next/dynamic";

import JsonLd from "@/components/seo/JsonLd";
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

const LandingClient = dynamic(
  () =>
    import(
      "@/components/marketing/LandingClient"
    ),
  {
    ssr: false,
  }
);

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/logo.png"),
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
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, iOS, Android",
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
      <LandingClient />
    </>
  );
}
