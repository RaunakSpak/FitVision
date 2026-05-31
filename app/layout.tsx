import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FitVision AI — Real-Time AI Fitness Trainer",
  description:
    "Train smarter with real-time AI form correction. Live pose detection, video analysis, progress dashboard, and workout history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.variable} h-full font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
