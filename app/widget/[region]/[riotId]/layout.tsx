import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StatGap — Twitch Widget",
  robots: "noindex, nofollow",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0e0e10" }}>
        {children}
      </body>
    </html>
  );
}
