import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/layout/global-header";
import { SmoothScrollProvider } from "@/components/layout/smooth-scroll-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Remalt - Build AI Workflows That Actually Work",
  description: "Create, automate, and optimize AI-powered workflows with our intuitive drag-and-drop interface. From content creation to data analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <SmoothScrollProvider>
          <GlobalHeader />
          <main className="pt-14">
            {children}
          </main>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
