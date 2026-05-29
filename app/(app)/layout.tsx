import AppNavbar from "@/components/navigation/AppNavbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      <AppNavbar />

      <main className="mx-auto w-full max-w-[1600px] px-6 py-6">
        {children}
      </main>
    </div>
  );
}