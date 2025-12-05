import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_JP, Plus_Jakarta_Sans, Teko } from "next/font/google";
import "./globals.css";
import { WalletProviders } from "@/providers/WalletProviders";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const teko = Teko({
  subsets: ["latin"],
  variable: "--font-teko",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Codex Janken",
  description: "Single-transaction Rock Paper Scissors MiniApp for Farcaster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${space.variable} ${notoSansJP.variable} ${plusJakartaSans.variable} ${teko.variable} antialiased`}
      >
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
