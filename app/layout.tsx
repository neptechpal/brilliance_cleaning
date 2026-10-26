import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Cleaning & Property Staging Newcastle | Brilliance Cleaning", template: "%s" },
    description:
      "Residential, end of lease, commercial and hospitality cleaning plus property staging across Newcastle and the Hunter. Free quotes – call 0411 463 552.",
    applicationName: s.businessName,
    formatDetection: { telephone: false },
    verification: {
      ...(s.gscVerification ? { google: s.gscVerification } : {}),
      ...(s.bingVerification ? { other: { "msvalidate.01": s.bingVerification } } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b7a5f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${jakarta.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
