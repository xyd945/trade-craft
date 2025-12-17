import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tradecraft - Learn Trading Concepts Interactively",
  description: "Educational trading app where you learn trading concepts via AI chat with interactive chart visualizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="disclaimer-banner">
          ⚠️ Educational content only. Not financial advice. Past performance does not guarantee future results.
        </div>
        {children}
      </body>
    </html>
  );
}
