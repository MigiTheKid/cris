import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./cris-components.css";
import "./cris-command.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

// Fontes da marca CRIS (ver design handoff §5)
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ui = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CRIS — Centro de Comando",
  description:
    "Sistema de gestão da frota TOP DIESEL. Em homenagem a São Cristóvão, padroeiro dos motoristas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${display.variable} ${ui.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
