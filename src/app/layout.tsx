import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Charmant AR — Virtual Jewelry Try-On",
  description:
    "Experience luxury jewelry in augmented reality. Try on necklaces, rings, earrings and bracelets directly in your browser with our zero-cost WebAR technology.",
  keywords: [
    "jewelry",
    "virtual try-on",
    "WebAR",
    "augmented reality",
    "necklaces",
    "rings",
    "earrings",
    "bracelets",
    "luxury",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
