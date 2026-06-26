import type { Metadata } from "next";
import "@fontsource-variable/noto-sans/wght.css";
import "@fontsource-variable/noto-serif/wght.css";
import "@fontsource-variable/noto-sans-mono/wght.css";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestaLens — Portfolio Tracker & Optimiser",
  description:
    "Track, analyse and optimise your investment portfolio. Import from any broker, get performance reports, tax calculations, and advanced analytics.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
