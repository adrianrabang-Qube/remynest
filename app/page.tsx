import dynamic from "next/dynamic";

const LandingClient = dynamic(
  () =>
    import(
      "@/components/marketing/LandingClient"
    ),
  {
    ssr: false,
  }
);

export default function HomePage() {
  return <LandingClient />;
}