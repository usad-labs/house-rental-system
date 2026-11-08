import type { Metadata, Viewport } from "next";
import { Archivo_Black, Barlow, Barlow_Condensed } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const body = Barlow({ variable: "--font-body", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"] });
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin", "latin-ext"], weight: ["600", "700"] });
const sign = Archivo_Black({ variable: "--font-sign", subsets: ["latin", "latin-ext"], weight: "400" });

export const metadata: Metadata = {
  title: { default: `${siteConfig.businessName}: houses for rent in ${siteConfig.location.city}`, template: `%s | ${siteConfig.businessName}` },
  description: `${siteConfig.tagline} Near ${siteConfig.location.nearLandmark}, ${siteConfig.location.city}.`,
};

export const viewport: Viewport = { themeColor: "#0C2C55" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${sign.variable}`}>
      <body>{children}</body>
    </html>
  );
}
