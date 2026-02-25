import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "User Research Suite",
  description: "Protocole Builder · Brief Builder · Analysis Engine — par Mehdi Aoussat",
  authors: [{ name: "Mehdi Aoussat", url: "https://www.mehdi-aoussat.com" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
