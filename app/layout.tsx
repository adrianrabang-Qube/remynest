import "./globals.css";
import LogoutButton from "@/components/LogoutButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: "20px", borderBottom: "1px solid #ccc" }}>
          <a href="/dashboard" style={{ marginRight: "10px" }}>Dashboard</a>
          <a href="/memories" style={{ marginRight: "10px" }}>Memories</a>
          <a href="/new" style={{ marginRight: "10px" }}>New</a>
          <a href="/timeline" style={{ marginRight: "10px" }}>Timeline</a>
          <a href="/reminders" style={{ marginRight: "10px" }}>Reminders</a>

          <LogoutButton />
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}