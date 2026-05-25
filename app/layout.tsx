import type { Metadata } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"], weight: ["400", "500", "600"],
  variable: "--font-display", style: ["normal", "italic"],
});
const body = Archivo({
  subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AutoBid — Capture Desk",
  description: "Government contract bidding & grant submission, human-gated.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
