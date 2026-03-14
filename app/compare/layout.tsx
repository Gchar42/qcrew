import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Players — Stats Comparison",
  robots: "noindex, follow",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
