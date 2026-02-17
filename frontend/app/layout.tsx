import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/app/context/auth-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CampusMind — AI-Powered Academic Dashboard",
  description:
    "Your Second Brain for 4 Years of Engineering. Unified AI Knowledge Base + Personalized Workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
