import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif" });
const notoMono = Noto_Sans_Mono({ subsets: ["latin"], variable: "--font-noto-mono" });

export const metadata: Metadata = {
  title: "InvestaLens — Portfolio Tracker & Optimiser",
  description:
    "Track, analyse and optimise your investment portfolio. Import from any broker, get performance reports, tax calculations, and advanced analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSerif.variable} ${notoMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
