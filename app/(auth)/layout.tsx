import RemyNestLogo from "@/components/brand/RemyNestLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Safe-area insets so auth screens clear the iOS status bar / notch and home
    // indicator under `viewport-fit=cover` + `contentInset:'never'`. env(...) is 0
    // on web/desktop, so this is a no-op there and only affects the native WebView.
    <div className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <main>
        <RemyNestLogo className="mt-8 mb-4" />
        {children}
      </main>
    </div>
  );
}